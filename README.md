# Open Historia basemaps

The official detailed maps for Open Historia. The game downloads detailed (tiled) maps only from this repository.

- `basemaps.json` lists every map: a fixed **id**, and for each **version** its release link, size and SHA-256 checksum.
- Each version's `.pmtiles` file (and an optional preview picture) is attached to its own release, tagged `<id>-v<version>`, for example `got-world-v1`.
- The map files themselves live only in releases, never in the repository.
- The maps available right now are listed at the bottom of this page, under [Maps](#maps).
- Designers submit maps through an issue form, a bot checks them, and once a maintainer approves one it is published automatically.

## For scenario designers

### Detailed maps and basic maps

A scenario with its own map draws a **basic map** under its countries. This is a painted drawing of land, forests, mountains and rivers, carried inside the scenario file. It is small, but it's flat colour, so it looks plain when you zoom right in.

A **detailed map** is a large set of picture tiles (often hundreds of MB) that stays sharp from the whole world down to single castles and streets. It is far too big to go inside a scenario, so it lives here. A scenario only names it: "this map, version 1 or newer".

Every scenario on a detailed map **must also have a basic map**. Players who don't download the detailed map, or whose game can't show it, see the basic map instead. That includes the browser and Android versions and older versions of the game.

### Using a map from this list

1. In the Map Editor, open the basemap picker. First give your scenario a basic map: upload or draw a painted (vector) basemap, or use one you already have. The editor won't let you pick a detailed map until a basic map is in place.
2. Open the **Detailed maps** tab and download the map you want. It then appears under **My Basemaps**.
3. Click it under My Basemaps. Your scenario now names that map, and the version you have is the lowest version it asks for.
4. Save and publish your scenario as usual. It never carries the map itself, only its name.

What players see: when they install your scenario from the hub, the game offers the detailed map with its download size. They can download it, or play on the basic map and download it later from a banner over the map. A map downloads once, and every scenario on it shares it. Players can also choose the basic map any time in **Settings → Map → Scenario terrain**.

### Making your own detailed map

- It must be a **raster `.pmtiles` file** (picture tiles in PNG, JPEG, WebP or AVIF) of **500 MB or less**.
- You can draw extra detail only around important places. Where a close-up tile is missing, the game enlarges the nearest less detailed one.
- Try it first: in the basemap picker, **⬆ Add detailed map** loads your file into your own game, so you can build and test a scenario on it.
- **Licence and credits:** you must have the right to share everything in it. If it is drawn from someone else's map, data or artwork, credit them and follow their licence. For example, a map built on CC BY-NC-SA material must also be CC BY-NC-SA.

Until your map is on this list, only you can see it. Anyone else playing your scenario gets its basic map.

### Submitting a map

1. Put the `.pmtiles` file online as a **direct download**. A release on your own GitHub repository works best. Dropbox or any direct web link also works, but Google Drive often doesn't for big files. You can delete your copy once your map is published.
2. Open the form. Either:
   - in the game's basemap picker, press **⤴** on your map under My Basemaps. This opens the form with the map's name, size and checksum already filled in; or
   - go to this repository's **Issues → New issue** and choose **Submit a map or a map update**.
3. Fill in the rest: the download link, the map ID you'd like (lower-case letters, digits and dashes, like `got-world`; it can never change later), what the map shows, screenshots (one zoomed out, one close up), who made it and what it is based on, and its licence. Tick the boxes and submit.

> **Important:**
> - **Always use the form.** Blank issues are switched off in this repository, so the form is the only way in. The bot reads the form's questions to find your answers, so don't delete or rename its headings. Just fill in the answers under them.
> - **Keep `[Submit map]` at the start of the title**, and add your map's name after it (the ⤴ button does this for you). Maintainers use it to spot submissions, and the bot uses it alongside the form's questions.

### Map IDs and who owns a map

- **The map ID** is the short name scenarios use to find your map, like `got-world`. You suggest it in the form; if you leave it empty, the bot makes one from the map's name. The bot checks it is valid (lower-case letters, digits and dashes) and that no other map already has it. Its comment shows the ID the map will get, so the maintainer sees it before approving. Once the map is published, the ID never changes.
- **You own the map you submit first.** Only a map's owners can publish new versions of it. If you submit an update to someone else's map, the bot says so: ask the owner to submit it, or submit yours as a new map with its own ID. A maintainer can still approve it in a special case, and the release notes then say who approved it, and for whom.
- **Sharing ownership:** a map's owners are listed in `basemaps.json` under `owners`. To add a co-owner, open a pull request adding their GitHub name there (or ask a maintainer to).

### What happens next

1. **Automatic checks, within minutes.** A bot downloads your file and checks it the way the game will: that it's a real map of picture tiles, 500 MB or less, and that it matches the checksum. It also checks that every part of the form is filled in. It posts the result on your issue: ✅ **passes the checks**, or ❌ **needs changes** with exactly what to fix. To fix something, edit your issue, and the checks run again.
2. **A maintainer reviews it.** A person looks at the screenshots, the credits and the licence. The team reviews in their spare time, so this can take a while. If something needs changing, they'll reply on your issue.
3. **Approved, then published automatically.** When a maintainer approves it, the bot checks the file once more (it must still be the exact file that passed), publishes it here as an official release, adds it to the list, and closes your issue with a link. Players are offered your map from that moment.

### Updating a map

Submit the new file with the same form, choosing **Update to a map already on the list** and giving the map's ID. An update becomes a new version (for example version 2). It never replaces version 1 behind players' backs.

- Players who have version 1 keep it. The game offers the update with its size, and they choose whether to download it. If they do, it replaces their old copy, so they never keep two.
- Scenarios name the lowest version they need, so scenarios made on version 1 keep working on version 2, and players with version 1 can still play a scenario made on version 2.

## For maintainers

### Approving a submission

1. Wait for the bot's ✅ **passes the checks** comment on the `[Submit map]` issue. It shows what the map will become (for example `got-world-v1`, and for a new map the ID it keeps for good), its size, zooms, area and checksum. An update from someone who isn't one of the map's owners shows ❌ for that reason alone; approving it anyway publishes it on their behalf, and the release notes record who approved it.
2. Review what the bot can't check: the screenshots (is it suitable, is it what it says), the credits, and whether the licence really allows it.
3. Add the **approved** label. The **Publish an approved map** action then does everything else: checks the file again, refuses if it changed since the check, makes the release `<id>-v<version>`, writes the release notes from the form, adds it to `basemaps.json` on `main`, and closes the issue. If anything fails, it says why on the issue and removes the label.

Only people with write, maintain or admin access can approve. The label from anyone else is removed and ignored.

### Publishing a map by hand

You can still make a release yourself: tag `<map-id>-v<version>`, the map's name as the title, the file attached as `<tag>.pmtiles`, and a `## Licence` heading in the notes. The **Add a released map to the list** action checks it and opens a pull request adding it to `basemaps.json`, which you then merge. A release that is already on the list (like every approved submission) is skipped. To retry, open Actions → Add a released map to the list → Run workflow, and give it the tag.

### Repository settings (for an admin, once)

- **Settings → Actions → General → Workflow permissions:** each action asks only for the permissions it needs. Nothing has to change unless the organisation limits the token. If a run fails with "Resource not accessible by integration", choose **Read and write permissions** here.
- **Allow GitHub Actions to create and approve pull requests** (same page): only needed for **Publishing a map by hand**, which opens a pull request. Approving submissions doesn't need it.
- **Branch protection or rulesets on `main`:** none at the moment. If you add a rule that requires pull requests, let GitHub Actions bypass it. Otherwise an approved map is released but can't be added to the list.
- **Issues** must stay enabled, since submissions are issues. The bot creates its labels (`checks passed`, `needs changes`, `approved`, `map submission`) itself.

Never change or delete the file of a version that is already listed: scenarios and players' copies trust its checksum. If a map is corrected, list it as a new version.

## Licences

This repository's own files (this README, `basemaps.json`, the check script and the action) are licensed under the GNU Affero General Public License v3.0 or later, the same as Open Historia; see [LICENSE](LICENSE).

Each map has its own licence, which applies to that map's release files. It is named in `basemaps.json`, and given in full with the map's credits in the notes of its release. The Game of Thrones world map (`got-world`) is CC BY-NC-SA 3.0. It is drawn from GOT-Inspired-Map by cadaei, theMountainGoat and Tear, and A Song of Ice and Fire is © George R. R. Martin. It is an unofficial, non-commercial fan map.

## Maps

The maps players are offered right now. This table is rewritten automatically from [`basemaps.json`](basemaps.json) whenever a map is added, and each version has its own page under [Releases](https://github.com/Open-Historia/open-historia-basemaps/releases) with its description, credits and licence.

<!-- maps:start -->
| ID | Name | Latest | Size | Owners | Licence |
|---|---|---|---|---|---|
| `got-world` | Game of Thrones world map | [v1](https://github.com/Open-Historia/open-historia-basemaps/releases/tag/got-world-v1) | 442 MB | @SeventhDread | CC BY-NC-SA 3.0 |
<!-- maps:end -->
