// Adds one released map version to basemaps.json, after checking the file the
// way the Open Historia game does before it uses one. Run by the "Add a released
// map to the list" workflow when a maintainer publishes a release by hand (a map
// approved through a submission issue is listed by publish-submission.mjs), and
// runnable by hand:
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
// list (so a release that is already listed changes nothing). Any problem stops
// it with a plain message and leaves basemaps.json untouched.

import fs from "node:fs";
import {
  ID_PATTERN,
  RELEASES,
  REPO,
  TAG_PATTERN,
  addVersion,
  inspectMap,
  megabytes,
  plain,
  readList,
  setOutput,
  sha256Of,
  writeList,
} from "./lib/maps.mjs";

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

const info = await inspectMap(file).catch((error) => fail(`The game would refuse this map: ${error.message}`));
const size = fs.statSync(file).size;
const sha256 = await sha256Of(file);

// ---- The release's details ------------------------------------------------------
const release = option("release") ? JSON.parse(fs.readFileSync(option("release"), "utf8")) : {};
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

let list;
let status;
try {
  list = readList(listPath);
  const existing = list.basemaps.find((entry) => entry.id === id);
  if (!existing && !titleName) fail("A new map needs its name as the release title, like \"Game of Thrones world map (v1)\".");
  if (!existing && !licenceFromNotes(release.body)) fail("A new map needs its licence in the release notes: a \"## Licence\" heading with the licence on the line below.");
  status = addVersion(list, {
    id,
    version,
    tag,
    size,
    sha256,
    name: titleName,
    author: plain(release.author?.login || "").slice(0, 80),
    license: licenceFromNotes(release.body),
    preview: previewAsset ? `${RELEASES}${tag}/${previewAsset.name}` : "",
  });
} catch (error) {
  fail(error.message);
}
if (status === "listed") {
  console.log(`${tag} is already in the list with this exact file; nothing to change.`);
  setOutput("status", "listed");
  process.exit(0);
}
writeList(listPath, list);

const map = list.basemaps.find((entry) => entry.id === id);
console.log(`Added ${tag}: ${info.tileType} tiles, zooms ${info.minzoom}–${info.maxzoom}, ${megabytes(size)} MB, SHA-256 ${sha256}.`);
const prBody = option("pr-body");
if (prBody) {
  fs.writeFileSync(prBody, [
    `Adds **${map.name}**, version ${version} (\`${id}\`), from the release [${tag}](https://github.com/${REPO}/releases/tag/${tag}).`,
    "",
    "The file passed the checks the game makes before it uses a map:",
    "",
    `- Raster ${info.tileType} tiles, zooms ${info.minzoom}–${info.maxzoom}`,
    `- ${megabytes(size)} MB (${size} bytes), under the 500 MB limit`,
    `- SHA-256 \`${sha256}\``,
    `- Licence: ${map.license || "(see the release notes)"}`,
    "",
    "Before merging, check that the map is suitable, that it is what the release says, and that its licence allows it. Players are offered it as soon as this is merged.",
    "",
  ].join("\n"));
}
setOutput("status", "added");
