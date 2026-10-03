// Reading a "Submit a map or a map update" issue (.github/ISSUE_TEMPLATE/
// map-request.yml) and deciding what it would become: which map id, which
// version, and what is wrong with it, if anything.

import { ID_PATTERN, mapOwners, nextVersion, plain } from "./maps.mjs";

// GitHub turns each form field into "### <label>" followed by the answer, and
// an empty optional answer into "_No response_".
const FIELDS = {
  kind: "Is this a new map or an update?",
  name: "Map name",
  mapId: "Map ID (updates only)",
  download: "Download link to the .pmtiles file",
  size: "File size",
  sha256: "SHA-256 checksum (optional)",
  description: "What does the map show?",
  changes: "What changed? (updates only)",
  preview: "Screenshots",
  credits: "Who made it, and what is it based on?",
  licence: "Licence",
  scenarios: "Scenarios that use it (optional)",
  checks: "Before you submit",
};
export const CHECKBOX_COUNT = 4;

export const parseSubmission = (body) => {
  const sections = {};
  let current = null;
  for (const line of String(body || "").replace(/\r\n/g, "\n").split("\n")) {
    const heading = line.match(/^###\s+(.*?)\s*$/);
    if (heading) {
      current = heading[1];
      sections[current] = [];
    } else if (current) {
      sections[current].push(line);
    }
  }
  const field = (label) => {
    const value = (sections[label] || []).join("\n").trim();
    return value === "_No response_" ? "" : value;
  };
  const out = {};
  for (const [key, label] of Object.entries(FIELDS)) out[key] = field(label);
  out.ticked = (out.checks.match(/^- \[[xX]\]/gm) || []).length;
  return out;
};

export const slugify = (text) => String(text || "")
  .normalize("NFKD")
  .replace(/[̀-ͯ]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 64)
  .replace(/-+$/g, "");

// What the submission would become, and every problem with its answers (not
// the file: that is checked once it is downloaded). `author` is the GitHub
// login of whoever opened the issue: an update must come from one of the map's
// owners. That one problem is kept apart (`ownerProblem`), because a
// maintainer may still approve it on the submitter's behalf.
export const planSubmission = (form, list, author = "") => {
  const problems = [];
  let ownerProblem = "";
  const isUpdate = /^update/i.test(form.kind);
  const asked = plain(form.mapId).toLowerCase();
  let id = "";
  if (isUpdate) {
    id = asked;
    if (!id) problems.push("An update needs the map ID of the map it updates.");
    else if (!list.basemaps.some((entry) => entry.id === id)) problems.push(`There is no map "${id}" on the list to update. Check the ID, or submit it as a new map.`);
    else {
      const owners = mapOwners(list.basemaps.find((entry) => entry.id === id));
      if (!owners.some((login) => login.toLowerCase() === String(author).toLowerCase())) {
        const named = owners.length ? owners.map((login) => `@${login}`).join(" or ") : "its owners";
        ownerProblem = `\`${id}\` belongs to ${named}, so only they can publish new versions of it. Ask them to submit the update, or submit yours as a new map with its own ID.`;
      }
    }
  } else {
    id = asked || slugify(form.name);
    if (!ID_PATTERN.test(id)) problems.push(`"${id || form.name}" can't be a map ID: use lower-case letters, digits and dashes.`);
    else if (list.basemaps.some((entry) => entry.id === id)) problems.push(`A map called "${id}" is already on the list. If this updates it, choose "Update to a map already on the list"; otherwise suggest a different map ID.`);
  }
  if (!form.kind) problems.push("Say whether this is a new map or an update.");
  if (!plain(form.name)) problems.push("The map needs a name.");
  if (!/^https:\/\//i.test(form.download.trim())) problems.push("The download link must start with https://.");
  if (!plain(form.description)) problems.push("Say what the map shows.");
  if (!plain(form.credits)) problems.push("Say who made the map and what it is based on.");
  if (!plain(form.licence)) problems.push("Give the map's licence.");
  if (!form.preview.trim()) problems.push("Add one or two screenshots.");
  if (form.ticked < CHECKBOX_COUNT) problems.push("Tick all the boxes under \"Before you submit\".");
  const sha256 = plain(form.sha256).toLowerCase();
  if (sha256 && !/^[a-f0-9]{64}$/.test(sha256)) problems.push("The SHA-256 checksum should be 64 letters and digits (or leave it empty).");
  const taken = !isUpdate && list.basemaps.some((entry) => entry.id === id);
  const version = id && ID_PATTERN.test(id) && !taken ? nextVersion(list, id) : 0;
  return { isUpdate, id, version, tag: version ? `${id}-v${version}` : "", sha256, problems, ownerProblem };
};

export const releaseNotes = ({ form, id, version, tag, size, sha256, onBehalf = "" }) => [
  `**${plain(form.name)}, version ${version}** (map id \`${id}\`)`,
  "",
  ...(onBehalf ? [onBehalf, ""] : []),
  form.description.trim(),
  "",
  ...(form.changes.trim() ? ["## What changed", "", form.changes.trim(), ""] : []),
  `**File:** \`${tag}.pmtiles\` (${Math.round(size / 1048576)} MB)`,
  `**SHA-256:** \`${sha256}\``,
  "",
  "## Credits",
  "",
  form.credits.trim(),
  "",
  "## Licence",
  "",
  plain(form.licence),
  "",
].join("\n");
