// Checks a "Submit a map or a map update" issue: its answers, then the map file
// itself, downloaded from the link given and checked the way the game does.
// Run by the "Check a map submission" workflow whenever such an issue is
// opened or edited, and again just before an approved map is published.
//
//   node scripts/check-submission.mjs --body issue-body.md --dir <work dir>
//     --author <issue author> [--list basemaps.json] [--comment comment.md] [--result result.json]
//     [--local-file map.pmtiles]   (testing only: use this file instead of downloading)
//
// Writes the comment to post on the issue (one comment, updated on every run)
// and a result file for the publish step. Prints status=passed or
// status=failed; the downloaded file is left at <work dir>/map.pmtiles.

import fs from "node:fs";
import path from "node:path";
import { downloadMap, inspectMap, megabytes, plain, readList, setOutput, sha256Of } from "./lib/maps.mjs";
import { parseSubmission, planSubmission } from "./lib/submission.mjs";

const args = process.argv.slice(2);
const option = (name) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
};

const form = parseSubmission(fs.readFileSync(option("body"), "utf8"));
const list = readList(option("list") || "basemaps.json");
const plan = planSubmission(form, list, option("author") || "");
const dir = option("dir") || ".";
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, "map.pmtiles");
fs.rmSync(file, { force: true });

const problems = [...plan.problems];
let info = null;
let size = 0;
let sha256 = "";
if (/^https:\/\//i.test(form.download.trim())) {
  try {
    if (option("local-file")) {
      fs.copyFileSync(option("local-file"), file);
      size = fs.statSync(file).size;
    } else {
      size = await downloadMap(form.download, file);
    }
    info = await inspectMap(file);
    sha256 = await sha256Of(file);
    if (plan.sha256 && plan.sha256 !== sha256) {
      problems.push(`The file's SHA-256 is \`${sha256}\`, not the one in the form. The file may have changed, or the checksum was copied wrong.`);
    }
  } catch (error) {
    problems.push(error.message);
    fs.rmSync(file, { force: true });
  }
}

// Everything but ownership must pass; an update from someone who isn't an
// owner fails too, but a maintainer may approve it anyway.
const passed = problems.length === 0 && !plan.ownerProblem;
const onlyOwnership = problems.length === 0 && Boolean(plan.ownerProblem);
const row = (label, value) => `| ${label} | ${value} |`;
const comment = [
  `<!-- map-check sha256=${sha256 || "none"} -->`,
  passed
    ? "### ✅ This map passes the automatic checks"
    : "### ❌ This submission needs changes",
  "",
  passed
    ? "A maintainer will now look at the map, its credits and its licence. If it's approved, it is published automatically and players are offered it."
    : "Fix the points below by editing this issue (⋯ → Edit). The checks run again on every edit.",
  "",
  ...(problems.length || plan.ownerProblem
    ? [...problems.map((problem) => `- ${problem}`), ...(plan.ownerProblem ? [`- ${plan.ownerProblem}`] : []), ""]
    : []),
  "| | |",
  "|---|---|",
  row("Becomes", plan.tag ? `\`${plan.tag}\` (${plan.isUpdate ? `version ${plan.version} of \`${plan.id}\`` : `a new map with the ID \`${plan.id}\`, which never changes`})` : "—"),
  row("Name", plain(form.name) || "—"),
  row("File", info ? `${info.tileType} tiles, ${megabytes(size)} MB (${size} bytes)` : "—"),
  row("Zooms", info ? `${info.minzoom}–${info.maxzoom}` : "—"),
  row("Covers", info ? `longitude ${info.bounds[0]} to ${info.bounds[2]}, latitude ${info.bounds[1]} to ${info.bounds[3]}` : "—"),
  row("SHA-256", sha256 ? `\`${sha256}\`` : "—"),
  row("Licence", plain(form.licence) || "—"),
  "",
  passed ? "_Maintainers: add the **approved** label to publish it. Only people with write access to this repository can approve._" : "",
  onlyOwnership ? "_Maintainers: everything else passes. Adding the **approved** label publishes it anyway, on the submitter's behalf, and the release notes say who approved it._" : "",
].join("\n");

if (option("comment")) fs.writeFileSync(option("comment"), comment);
if (option("result")) {
  fs.writeFileSync(option("result"), JSON.stringify({ ...plan, passed, onlyOwnership, problems, size, sha256, info }, null, 2));
}
console.log(comment);
setOutput("status", passed ? "passed" : "failed");
