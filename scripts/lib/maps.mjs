// What every script here shares: the checks the Open Historia game makes before
// it uses a map, downloading a map safely, and adding a version to the list.
// Keep the limits the same as the game's (server/officialBasemaps.js and
// server/tiledBasemaps.js in open-historia), or the game leaves the map out.

import crypto from "node:crypto";
import fs from "node:fs";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { PMTiles } from "pmtiles";

export const CAP = 500 * 1024 * 1024;
export const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const TAG_PATTERN = /^([a-z0-9][a-z0-9-]{0,63})-v([1-9][0-9]{0,5})$/;
export const REPO = process.env.GITHUB_REPOSITORY || "Open-Historia/open-historia-basemaps";
export const RELEASES = `https://github.com/${REPO}/releases/download/`;
const RASTER_TILE_TYPES = new Map([[2, "png"], [3, "jpeg"], [4, "webp"], [5, "avif"]]);

export const megabytes = (bytes) => Math.round(bytes / 1048576);

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

// Resolves to { tileType, minzoom, maxzoom, bounds }, or throws a plain reason.
export const inspectMap = async (target) => {
  const { size } = fs.statSync(target);
  if (size > CAP) throw new Error(`The file is ${megabytes(size)} MB; the game downloads at most 500 MB.`);
  const handle = await fs.promises.open(target, "r");
  const magic = Buffer.alloc(8);
  try {
    await handle.read(magic, 0, 8, 0);
  } finally {
    await handle.close();
  }
  if (magic.subarray(0, 7).toString("latin1") !== "PMTiles") throw new Error("The file is not a PMTiles archive.");
  if (magic[7] !== 3) throw new Error(`The file is a version ${magic[7]} PMTiles archive; only version 3 is supported.`);
  const archive = new PMTiles(fileSource(target));
  const header = await archive.getHeader();
  const tileType = RASTER_TILE_TYPES.get(header.tileType);
  if (!tileType) throw new Error("The archive holds vector tiles; a detailed map needs raster tiles (PNG, JPEG, WebP or AVIF).");
  if (header.tileDataOffset + header.tileDataLength > size || header.rootDirectoryOffset + header.rootDirectoryLength > size) {
    throw new Error("The archive is incomplete (it ends before its own tiles do).");
  }
  if (!(header.minZoom <= header.maxZoom)) throw new Error("The archive has no valid zoom range.");
  const lon = (header.minLon + header.maxLon) / 2;
  const lat = (header.minLat + header.maxLat) / 2;
  const n = 2 ** header.minZoom;
  const x = Math.min(n - 1, Math.max(0, Math.floor(((lon + 180) / 360) * n)));
  const rad = (lat * Math.PI) / 180;
  const y = Math.min(n - 1, Math.max(0, Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n)));
  const probe = await archive.getZxy(header.minZoom, x, y);
  if (!probe?.data?.byteLength) throw new Error("The archive has no tile where its own bounds say it should.");
  const round = (v) => Math.round(v * 1000) / 1000;
  return {
    tileType,
    minzoom: header.minZoom,
    maxzoom: header.maxZoom,
    bounds: [round(header.minLon), round(header.minLat), round(header.maxLon), round(header.maxLat)],
  };
};

export const sha256Of = async (target) => {
  const hash = crypto.createHash("sha256");
  await pipeline(fs.createReadStream(target), hash);
  return hash.digest("hex");
};

// ---- Downloading a designer's file ---------------------------------------------
// https only, every redirect too; streamed to disk and stopped the moment it
// passes the cap; a web page instead of a file is named as such.
export const downloadMap = async (link, dest) => {
  let url;
  try {
    url = new URL(String(link || "").trim());
  } catch {
    throw new Error("The download link isn't a web address.");
  }
  let response;
  for (let hop = 0; ; hop += 1) {
    if (url.protocol !== "https:") throw new Error("The download link must start with https://.");
    if (hop > 8) throw new Error("The download link redirects too many times.");
    response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(30 * 60 * 1000) });
    if (response.status < 300 || response.status >= 400) break;
    const location = response.headers.get("location");
    if (!location) break;
    url = new URL(location, url);
  }
  if (!response.ok) throw new Error(`The download link answered HTTP ${response.status}. Is it public, and still there?`);
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > CAP) throw new Error(`The file is ${megabytes(declared)} MB; the game downloads at most 500 MB.`);
  if (/text\/html/i.test(response.headers.get("content-type") || "")) {
    throw new Error("The link opens a web page, not the file itself. Use a direct download link (for example a GitHub release file); Google Drive links often don't work for big files.");
  }
  let received = 0;
  const counter = new Transform({
    transform(chunk, _encoding, callback) {
      received += chunk.length;
      if (received > CAP) callback(new Error("The file is over 500 MB; the game downloads at most 500 MB."));
      else callback(null, chunk);
    },
  });
  await pipeline(Readable.fromWeb(response.body), counter, fs.createWriteStream(dest));
  return received;
};

// ---- The list ---------------------------------------------------------------------
export const readList = (listPath) => {
  const list = fs.existsSync(listPath) ? JSON.parse(fs.readFileSync(listPath, "utf8")) : { format: 1, basemaps: [] };
  if (!Array.isArray(list.basemaps)) throw new Error(`${listPath} has no "basemaps" list.`);
  return list;
};
export const writeList = (listPath, list) => fs.writeFileSync(listPath, `${JSON.stringify(list, null, 2)}\n`);

export const nextVersion = (list, id) => {
  const map = list.basemaps.find((entry) => entry.id === id);
  return map?.versions?.length ? Math.max(...map.versions.map((v) => v.version)) + 1 : 1;
};

// Adds one checked version. Resolves "added", or "listed" when this exact file
// is already that version; throws when the version exists with another file.
export const addVersion = (list, { id, version, tag, size, sha256, name, author, license, preview }) => {
  const url = `${RELEASES}${tag}/${tag}.pmtiles`;
  let map = list.basemaps.find((entry) => entry.id === id);
  if (map?.deleted) throw new Error(`${id} was deleted on ${map.deleted.date}, so its ID can't be used again. Choose another ID.`);
  if (map?.archived) throw new Error(`${id} is archived. A maintainer must restore it before it gets new versions.`);
  const listed = map?.versions?.find((entry) => entry.version === version);
  if (listed) {
    if (listed.sha256 === sha256 && listed.bytes === size && listed.url.toLowerCase() === url.toLowerCase()) return "listed";
    throw new Error(`${id} already lists a version ${version} with a different file. A listed version never changes: release the new file as ${id}-v${nextVersion(list, id)}.`);
  }
  if (!map) {
    if (!name) throw new Error("A new map needs a name.");
    if (!license) throw new Error("A new map needs a licence.");
    // The submitter of the first version owns the map: only its owners may
    // publish new versions (README, "Who owns a map"). More owners are added
    // by editing basemaps.json.
    map = { id, name, ...(author ? { author, owners: [author] } : {}), license, versions: [] };
    list.basemaps.push(map);
  }
  map.versions.push({
    version,
    url,
    bytes: size,
    sha256,
    ...(preview ? { preview } : {}),
    released: new Date().toISOString().slice(0, 10),
  });
  map.versions.sort((a, b) => a.version - b.version);
  return "added";
};

// A map's owners: its "owners" list, or, for an entry from before owners were
// recorded, its author.
export const mapOwners = (map) => (Array.isArray(map?.owners) && map.owners.length ? map.owners : map?.author ? [map.author] : [])
  .map((login) => String(login));

export const plain = (text) => String(text || "")
  .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
  .replace(/[*_`]/g, "")
  .replace(/\s+/g, " ")
  .trim();

export const setOutput = (name, value) => {
  console.log(`${name}=${value}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
};
