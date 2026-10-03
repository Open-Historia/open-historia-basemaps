// Adds one released map version to basemaps.json, after checking the file the
// way the Open Historia game does before it uses one. Run by the "Add a released
// map to the list" workflow when a release is published, and runnable by hand:
//
//   node scripts/add-release.mjs --tag got-world-v1 --file got-world-v1.pmtiles
//     [--release release.json] [--list basemaps.json] [--pr-body pr-body.md]
//
// --release is `gh release view <tag> --json name,body,author,assets`: the map's
// name comes from the release title, its licence from the "## Licence" section
// of the release notes, and a preview picture from an asset named
// <tag>-preview.png (or .jpg / .webp).
//
// Prints status=added, or status=listed when this exact file is already in the
// list (so publishing a release that was listed by hand changes nothing). Any
// problem stops it with a plain message and leaves basemaps.json untouched.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { PMTiles } from "pmtiles";

// The game's own limits (server/officialBasemaps.js and server/tiledBasemaps.js
// in open-historia): keep them the same, or the game leaves the map out.
const CAP = 500 * 1024 * 1024;
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const TAG_PATTERN = /^([a-z0-9][a-z0-9-]{0,63})-v([1-9][0-9]{0,5})$/;
const REPO = process.env.GITHUB_REPOSITORY || "Open-Historia/open-historia-basemaps";
const RELEASES = `https://github.com/${REPO}/releases/download/`;
const RASTER_TILE_TYPES = new Map([[2, "png"], [3, "jpeg"], [4, "webp"], [5, "avif"]]);

const fail = (message) => {
  console.error(`::error::${message}`);
  process.exit(1);
};

const args = process.argv.slice(2);
const option = (name) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
};

const tag = String(option("tag") || "");
const file = option("file");
const listPath = option("list") || "basemaps.json";
const match = tag.match(TAG_PATTERN);
if (!match) fail(`The release tag "${tag}" must be <map-id>-v<version>, like got-world-v1 (lower-case letters, digits and dashes).`);
const [, id, versionText] = match;
const version = Number(versionText);
if (!ID_PATTERN.test(id)) fail(`"${id}" is not a usable map id.`);
if (!file || !fs.existsSync(file)) fail(`The release has no file named ${tag}.pmtiles. Attach the map under exactly that name.`);

// ---- The checks the game makes before it uses a map --------------------------
const fileSource = (target) => ({
  getKey: () => target,
  getBytes: async (offset, length) => {
    const handle = await fs.promises.open(target, "r");
    try {
      const { size } = await handle.stat();
      if (!(offset >= 0) || offset > size || !(length >= 0) || length > 64 * 1024 * 1024) {
        throw new Error("This PMTiles archive points outside itself.");
      }
      const buffer = Buffer.alloc(Math.min(length, size - offset));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, offset);
      const bytes = buffer.subarray(0, bytesRead);
      return { data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
    } finally {
      await handle.close();
    }
  },
});

const inspect = async (target) => {
  const handle = await fs.promises.open(target, "r");
  const magic = Buffer.alloc(8);
  try {
    await handle.read(magic, 0, 8, 0);
  } finally {
    await handle.close();
  }
  if (magic.subarray(0, 7).toString("latin1") !== "PMTiles") throw new Error("This file is not a PMTiles archive.");
  if (magic[7] !== 3) throw new Error(`This PMTiles archive is version ${magic[7]}; only version 3 is supported.`);
  const archive = new PMTiles(fileSource(target));
  const header = await archive.getHeader();
  const tileType = RASTER_TILE_TYPES.get(header.tileType);
  if (!tileType) throw new Error("This archive holds vector tiles; a detailed map needs raster tiles (PNG, JPEG, WebP or AVIF).");
  const { size } = fs.statSync(target);
  if (header.tileDataOffset + header.tileDataLength > size || header.rootDirectoryOffset + header.rootDirectoryLength > size) {
    throw new Error("This PMTiles archive is incomplete (it ends before its own tiles do).");
  }
  if (!(header.minZoom <= header.maxZoom)) throw new Error("This PMTiles archive has no valid zoom range.");
  const lon = (header.minLon + header.maxLon) / 2;
  const lat = (header.minLat + header.maxLat) / 2;
  const n = 2 ** header.minZoom;
  const x = Math.min(n - 1, Math.max(0, Math.floor(((lon + 180) / 360) * n)));
  const rad = (lat * Math.PI) / 180;
  const y = Math.min(n - 1, Math.max(0, Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n)));
  const probe = await archive.getZxy(header.minZoom, x, y);
  if (!probe?.data?.byteLength) throw new Error("This PMTiles archive has no tile where its own bounds say it should.");
  return { tileType, minzoom: header.minZoom, maxzoom: header.maxZoom };
};

const sha256Of = async (target) => {
  const hash = crypto.createHash("sha256");
  await pipeline(fs.createReadStream(target), hash);
  return hash.digest("hex");
};

const { size } = fs.statSync(file);
if (size > CAP) fail(`The map is ${Math.round(size / 1048576)} MB; the game downloads at most 500 MB.`);
const info = await inspect(file).catch((error) => fail(`The game would refuse this map: ${error.message}`));
const sha256 = await sha256Of(file);

// ---- The release's details ------------------------------------------------------
const release = option("release") ? JSON.parse(fs.readFileSync(option("release"), "utf8")) : {};
const plain = (text) => String(text || "")
  .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
  .replace(/[*_`]/g, "")
  .replace(/\s+/g, " ")
  .trim();
const licenceFromNotes = (body) => {
  const lines = String(body || "").split(/\r?\n/);
  const start = lines.findIndex((line) => /^#{1,6}\s*licen[cs]e\b/i.test(line.trim()));
  if (start < 0) return "";
  const paragraph = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,6}\s/.test(line.trim())) break;
    if (!line.trim()) {
      if (paragraph.length) break;
      continue;
    }
    paragraph.push(line);
  }
  return plain(paragraph.join(" ")).slice(0, 200);
};
const titleName = plain(release.name).replace(/\s*\(v?\d+\)\s*$/i, "").slice(0, 80);
const previewAsset = (release.assets || []).find((asset) => new RegExp(`^${tag}-preview\\.(png|jpe?g|webp)$`, "i").test(asset.name));

// ---- The list --------------------------------------------------------------------
const list = fs.existsSync(listPath) ? JSON.parse(fs.readFileSync(listPath, "utf8")) : { format: 1, basemaps: [] };
if (!Array.isArray(list.basemaps)) fail(`${listPath} has no "basemaps" list.`);
const url = `${RELEASES}${tag}/${tag}.pmtiles`;
let map = list.basemaps.find((entry) => entry.id === id);
const listed = map?.versions?.find((entry) => entry.version === version);
if (listed) {
  if (listed.sha256 === sha256 && listed.bytes === size && listed.url.toLowerCase() === url.toLowerCase()) {
    console.log(`${tag} is already in the list with this exact file; nothing to change.`);
    writeOutput("listed");
    process.exit(0);
  }
  fail(`${id} already lists a version ${version} with a different file. A listed version never changes: release the new file as ${id}-v${Math.max(...map.versions.map((v) => v.version)) + 1}.`);
}
if (!map) {
  const licence = licenceFromNotes(release.body);
  if (!titleName) fail("A new map needs its name as the release title, like \"Game of Thrones world map (v1)\".");
  if (!licence) fail("A new map needs its licence in the release notes: a \"## Licence\" heading with the licence on the line below.");
  map = { id, name: titleName, author: plain(release.author?.login || "").slice(0, 80), license: licence, versions: [] };
  if (!map.author) delete map.author;
  list.basemaps.push(map);
}
const entry = {
  version,
  url,
  bytes: size,
  sha256,
  ...(previewAsset ? { preview: `${RELEASES}${tag}/${previewAsset.name}` } : {}),
  released: new Date().toISOString().slice(0, 10),
};
map.versions.push(entry);
map.versions.sort((a, b) => a.version - b.version);
fs.writeFileSync(listPath, `${JSON.stringify(list, null, 2)}\n`);

const megabytes = Math.round(size / 1048576);
console.log(`Added ${tag}: ${info.tileType} tiles, zooms ${info.minzoom}–${info.maxzoom}, ${megabytes} MB, SHA-256 ${sha256}.`);
const prBody = option("pr-body");
if (prBody) {
  fs.writeFileSync(prBody, [
    `Adds **${map.name}**, version ${version} (\`${id}\`), from the release [${tag}](https://github.com/${REPO}/releases/tag/${tag}).`,
    "",
    "The file passed the checks the game makes before it uses a map:",
    "",
    `- Raster ${info.tileType} tiles, zooms ${info.minzoom}–${info.maxzoom}`,
    `- ${megabytes} MB (${size} bytes), under the 500 MB limit`,
    `- SHA-256 \`${sha256}\``,
    `- Licence: ${map.license || "(see the release notes)"}`,
    "",
    "Before merging, check that the map is suitable, that it is what the release says, and that its licence allows it. Players are offered it as soon as this is merged.",
    "",
  ].join("\n"));
}
writeOutput("added");

function writeOutput(status) {
  console.log(`status=${status}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `status=${status}\n`);
}
