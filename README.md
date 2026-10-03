# Open Historia basemaps

The official detailed maps for Open Historia. The game downloads detailed (tiled) maps only from this repository.

- `basemaps.json` lists every map: a fixed **id**, and for each **version** its release link, size and SHA-256 checksum.
- Each version's `.pmtiles` file (and an optional preview picture) is attached to its own release, tagged `<id>-v<version>`, for example `got-world-v1`.
- The map files themselves live only in releases, never in the repository.

## Maps

| Id | Name | Licence |
|---|---|---|
| `got-world` | Game of Thrones world map (added by the action once its release is published and the pull request merged) | CC BY-NC-SA 3.0, in the [got-world-v1 release notes](https://github.com/Open-Historia/open-historia-basemaps/releases/tag/got-world-v1) |

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

1. Put the `.pmtiles` file online where the team can download it. A release on your own GitHub repository works best. You can delete it once your map is approved.
2. In the basemap picker, press **⤴** on your map under My Basemaps. This opens the **Submit a map or a map update** form with the map's name, size and checksum already filled in. You can also open the form yourself from this repository's Issues tab.
3. Fill in the rest: the download link, what the map shows, screenshots (one zoomed out, one close up), who made it and what it is based on, and its licence. Then submit.

### What happens next

A maintainer reviews your submission. They check what the map shows, that the file is what you described, and that its licence allows it. If it's approved, they publish it here as an official release. This repository's checks then confirm the file works in the game and propose adding it to the list, and a maintainer approves that. Players are offered the map only after that last step. The team reviews in their spare time, so this can take a while. If something needs changing, they'll reply on your issue.

### Updating a map

Submit the new file with the same form, choosing **Update to a map already on the list** and giving the map's ID. An update becomes a new version (for example version 2). It never replaces version 1 behind players' backs.

- Players who have version 1 keep it. The game offers the update with its size, and they choose whether to download it. If they do, it replaces their old copy, so they never keep two.
- Scenarios name the lowest version they need, so scenarios made on version 1 keep working on version 2, and players with version 1 can still play a scenario made on version 2.

## For maintainers: adding a map or a new version

1. Review the submission: an issue titled `[Submit map] …`, made with the **Submit a map or a map update** form (the game's ⤴ button opens it with the name, size and checksum filled in). Check what it shows, who made it, and its licence.
2. Make a release:
   - **Tag:** `<map-id>-v<version>`, for example `got-world-v2`. A new map picks its id here, in lower-case letters, digits and dashes. The id never changes after that.
   - **Title:** the map's name, for example `Game of Thrones world map (v2)`.
   - **File:** attach the map as `<tag>.pmtiles`, for example `got-world-v2.pmtiles`. A preview picture can go beside it as `<tag>-preview.png`.
   - **Notes:** a short description, the credits, and a `## Licence` heading with the licence on the line below it. The licence is required for a new map.
3. Publish it. The **Add a released map to the list** action checks the file the way the game will (format, raster tiles, size within 500 MB) and works out its size and SHA-256. It then opens a pull request that adds the version to `basemaps.json`. If the check fails, the action run fails with the reason, and no pull request is opened.
4. Review and merge that pull request. Players are offered the map once it is merged, and not before.

To retry a release, for example after re-attaching a file with the right name, open Actions → Add a released map to the list → Run workflow, and give it the tag.

**One-time setup:** the action opens pull requests with the repository's own token. In Settings → Actions → General → Workflow permissions, tick **Allow GitHub Actions to create and approve pull requests**.

Never change or delete the file of a version that is already listed: scenarios and players' copies trust its checksum. If a map is corrected, list it as a new version.

## Licences

This repository's own files (this README, `basemaps.json`, the check script and the action) are licensed under the GNU Affero General Public License v3.0 or later, the same as Open Historia; see [LICENSE](LICENSE).

Each map has its own licence, which applies to that map's release files. It is named in `basemaps.json`, and given in full with the map's credits in the notes of its release. The Game of Thrones world map (`got-world`) is CC BY-NC-SA 3.0. It is drawn from GOT-Inspired-Map by cadaei, theMountainGoat and Tear, and A Song of Ice and Fire is © George R. R. Martin. It is an unofficial, non-commercial fan map.
