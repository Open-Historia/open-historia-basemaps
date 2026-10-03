// Archives, restores or permanently deletes a map (or one version of it) in
// basemaps.json. Run by the "Archive or restore a map" and "Delete a map"
// workflows, which then change the matching releases; runnable by hand:
//
//   node scripts/manage-map.mjs archive|restore|delete --id got-world
//     [--version 2] [--reason "why"] [--list basemaps.json]
//
// Archived: kept in the list with "archived": { reason, date }, never offered
// for download by the game; players who already have it keep using it.
// Deleted: left as a tombstone, "deleted": { reason, date } with no link or
// checksum, so its ID and version numbers are never reused and the game can
// say the map was removed. A deletion can't be undone.
// Prints tags=<the release tags it affects, space separated>.

import { ID_PATTERN, readList, setOutput, writeList } from "./lib/maps.mjs";

const fail = (message) => {
  console.error(`::error::${message}`);
  process.exit(1);
};

const [action, ...args] = process.argv.slice(2);
const option = (name) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
};
if (!["archive", "restore", "delete"].includes(action)) fail("Say archive, restore or delete.");
const id = String(option("id") || "").trim();
const versionText = String(option("version") || "").trim();
const reason = String(option("reason") || "").replace(/\s+/g, " ").trim().slice(0, 300);
const listPath = option("list") || "basemaps.json";
if (!ID_PATTERN.test(id)) fail(`"${id}" is not a map ID.`);
if (versionText && !/^[1-9][0-9]{0,5}$/.test(versionText)) fail(`"${versionText}" is not a version number. Leave it empty for the whole map.`);
const version = versionText ? Number(versionText) : null;
if (action !== "restore" && !reason) fail(`Give a reason for ${action === "archive" ? "archiving" : "deleting"} it.`);

const list = readList(listPath);
const map = list.basemaps.find((entry) => entry.id === id);
if (!map) fail(`There is no map "${id}" in the list.`);
if (map.deleted) fail(`${id} was deleted on ${map.deleted.date}; a deleted map can't be changed.`);
const versions = (version === null ? map.versions : map.versions.filter((entry) => entry.version === version))
  .filter((entry) => !entry.deleted);
if (!versions.length) fail(version === null ? `${id} has no versions left to change.` : `${id} has no version ${version}, or it was deleted.`);
const tags = versions.map((entry) => `${id}-v${entry.version}`);
const stamp = { ...(reason ? { reason } : {}), date: new Date().toISOString().slice(0, 10) };

if (action === "archive") {
  if (version === null) map.archived = stamp;
  else versions[0].archived = stamp;
} else if (action === "restore") {
  if (version === null) {
    if (!map.archived && !map.versions.some((entry) => entry.archived)) fail(`${id} isn't archived.`);
    delete map.archived;
    for (const entry of map.versions) delete entry.archived;
  } else {
    if (!versions[0].archived && !map.archived) fail(`${id} version ${version} isn't archived.`);
    delete versions[0].archived;
    // Restoring one version of an archived map brings the map back with it.
    delete map.archived;
  }
} else {
  const tombstone = (entry) => ({ version: entry.version, deleted: stamp });
  map.versions = map.versions.map((entry) => (versions.includes(entry) ? tombstone(entry) : entry));
  if (version === null || map.versions.every((entry) => entry.deleted)) {
    delete map.archived;
    map.deleted = stamp;
  }
}

writeList(listPath, list);
console.log(`${action}: ${tags.join(", ")}`);
setOutput("tags", tags.join(" "));
