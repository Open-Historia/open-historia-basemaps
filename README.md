# Open Historia basemaps

The official detailed maps for Open Historia. The game downloads detailed (tiled) maps only from this repository.

- `basemaps.json` lists every map: a fixed **id**, and for each **version** its release link, size and SHA-256 checksum.
- Each version's `.pmtiles` file (and an optional preview picture) is attached to its own release, tagged `<id>-v<version>`, for example `got-world-v1`.
- The map files themselves live only in releases, never in the repository.

## Maps

| Id | Name | Licence |
|---|---|---|
| `got-world` | Game of Thrones world map (added by the action once its release is published and the pull request merged) | CC BY-NC-SA 3.0, in the [got-world-v1 release notes](https://github.com/Open-Historia/open-historia-basemaps/releases/tag/got-world-v1) |

## How players get a map

A scenario names a map by its id and the lowest version it needs. When a player installs the scenario, the game offers the map's download and shows its size. If they say no, they play on the scenario's basic map, which every scenario on a detailed map must include. Each map downloads once, and every scenario on it shares it. A newer version is offered, never forced, and it replaces the old copy.

## Adding a map or a new version (maintainers)

1. Review the submission (an issue titled `[Submit map] …`). Check what it shows, who made it, and its licence.
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
