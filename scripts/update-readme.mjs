// Rewrites the README's map table from basemaps.json, between the
// <!-- maps:start --> and <!-- maps:end --> markers, so it always shows exactly
// what players are offered. Run by the publish and release actions in the same
// commit as the list change, and by hand:
//
//   node scripts/update-readme.mjs [--list basemaps.json] [--readme README.md]

import fs from "node:fs";
import { REPO, mapOwners, megabytes, readList } from "./lib/maps.mjs";

const args = process.argv.slice(2);
const option = (name) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
};
const listPath = option("list") || "basemaps.json";
const readmePath = option("readme") || "README.md";

const START = "<!-- maps:start -->";
const END = "<!-- maps:end -->";
const cell = (text) => String(text ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();

export const mapsTable = (list) => {
  if (!list.basemaps.length) return "_No maps yet._";
  const rows = list.basemaps.map((map) => {
    const latest = map.versions[map.versions.length - 1];
    const tag = `${map.id}-v${latest.version}`;
    const owners = mapOwners(map).map((login) => `@${login}`).join(", ") || "—";
    return `| \`${cell(map.id)}\` | ${cell(map.name)} | [v${latest.version}](https://github.com/${REPO}/releases/tag/${tag}) | ${megabytes(latest.bytes)} MB | ${cell(owners)} | ${cell(map.license) || "—"} |`;
  });
  return ["| ID | Name | Latest | Size | Owners | Licence |", "|---|---|---|---|---|---|", ...rows].join("\n");
};

const readme = fs.readFileSync(readmePath, "utf8");
const start = readme.indexOf(START);
const end = readme.indexOf(END);
if (start < 0 || end < start) {
  console.error(`::error::${readmePath} has no ${START} … ${END} markers for the map table.`);
  process.exit(1);
}
const next = `${readme.slice(0, start + START.length)}\n${mapsTable(readList(listPath))}\n${readme.slice(end)}`;
if (next !== readme) fs.writeFileSync(readmePath, next);
console.log(next === readme ? "The map table is up to date." : "Updated the map table.");
