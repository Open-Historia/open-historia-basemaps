// Gets an approved submission ready to publish, after check-submission.mjs has
// downloaded and checked its file again. Refuses if anything fails now, or if
// the file is not the one the maintainer approved (the checksum in the check
// comment they saw). Writes the release notes and adds the version to
// basemaps.json; the workflow then makes the release and commits the list.
//
//   node scripts/publish-submission.mjs --body issue-body.md --result result.json
//     --approved-sha256 <sha from the check comment> --author <issue author>
//     [--list basemaps.json] [--notes notes.md]
//
// Prints tag=<id>-v<version> and name=<map name>.

import fs from "node:fs";
import { addVersion, plain, readList, setOutput, writeList } from "./lib/maps.mjs";
import { parseSubmission, releaseNotes } from "./lib/submission.mjs";

const fail = (message) => {
  console.error(`::error::${message}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `reason=${message.replace(/\n/g, " ")}\n`);
  process.exit(1);
};

const args = process.argv.slice(2);
const option = (name) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
};

const form = parseSubmission(fs.readFileSync(option("body"), "utf8"));
const result = JSON.parse(fs.readFileSync(option("result"), "utf8"));
const approved = String(option("approved-sha256") || "");
const listPath = option("list") || "basemaps.json";

if (!result.passed) fail(`The submission no longer passes its checks: ${result.problems.join(" ")}`);
if (!/^[a-f0-9]{64}$/.test(approved)) fail("There is no passed check on this issue to approve. Edit the issue to run the checks, then approve again.");
if (approved !== result.sha256) {
  fail("The file at the download link has changed since it was checked, so it isn't the file that was approved. The checks have run again; review the new result, then approve again.");
}

const list = readList(listPath);
try {
  const status = addVersion(list, {
    id: result.id,
    version: result.version,
    tag: result.tag,
    size: result.size,
    sha256: result.sha256,
    name: plain(form.name).slice(0, 80),
    author: plain(option("author") || "").slice(0, 80),
    license: plain(form.licence).slice(0, 200),
  });
  if (status !== "added") fail(`${result.tag} is already on the list.`);
} catch (error) {
  fail(error.message);
}
writeList(listPath, list);
if (option("notes")) fs.writeFileSync(option("notes"), releaseNotes({ form, ...result }));
setOutput("tag", result.tag);
setOutput("name", plain(form.name).slice(0, 80).replace(/[\r\n]/g, " "));
