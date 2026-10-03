# Open Historia basemaps

The official detailed maps for Open Historia. The game downloads detailed (tiled) maps only from this repository.

- `basemaps.json` lists every map: a fixed **id**, and for each **version** its release link, size and SHA-256 checksum.
- Each version's `.pmtiles` file (and an optional preview picture) is attached to its own release, tagged `<id>-v<version>`, for example `got-world-v1`.
- The map files themselves live only in releases, never in the repository.

## Maps

| Id | Name | Licence |
|---|---|---|
| `got-world` | Game of Thrones world map | CC BY-NC-SA 3.0, in the [got-world-v1 release notes](https://github.com/Open-Historia/open-historia-basemaps/releases/tag/got-world-v1) |

## How players get a map

A scenario names a map by its id and the lowest version it needs. When a player installs the scenario, the game offers the map's download and shows its size. If they say no, they play on the scenario's basic map, which every scenario on a detailed map must include. Each map downloads once, and every scenario on it shares it. A newer version is offered, never forced, and it replaces the old copy.

## Adding a map or a new version (maintainers)

1. Review the submission (an issue titled `[Submit map] …`). Check what it shows, who made it, and its licence.
2. In the game's repository, run:

   ```
   node scripts/official-basemap-entry.mjs <file.pmtiles> --id <map-id> --version <n> --list <path to this repo>/basemaps.json --name "…" --author "…" --license "…"
   ```

   It checks the file the way the game will, then writes the entry.
3. Make a release tagged exactly as the script says (`<id>-v<n>`), and attach the file under exactly the same name. Put the map's licence and credits in the release notes.
4. Commit `basemaps.json`.

Never change or delete the file of a version that is already listed: scenarios and players' copies trust its checksum. If a map is corrected, list it as a new version.

## Licences

This repository's own files (this README, `basemaps.json`) are licensed under the GNU Affero General Public License v3.0 or later, the same as Open Historia; see [LICENSE](LICENSE).

Each map has its own licence, which applies to that map's release files. It is named in `basemaps.json`, and given in full with the map's credits in the notes of its release. The Game of Thrones world map (`got-world`) is CC BY-NC-SA 3.0. It is drawn from GOT-Inspired-Map by cadaei, theMountainGoat and Tear, and A Song of Ice and Fire is © George R. R. Martin. It is an unofficial, non-commercial fan map.
