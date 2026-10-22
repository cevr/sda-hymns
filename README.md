- thanks to https://sdahymnals.com for providing the mp3 files for the hymns freely.
- thanks to https://sda-hymnal.com for providing the lyrics and categories for the hymns freely via their API.

These are all 695 hymns from the Seventh-day Adventist Hymnal. The hymns have been arranged in the same order as the hymnal.

# sda-hymns

## warm-1

`warm-1/` holds all 695 hymns rendered from their MIDI files with the "Warm band" sound of the manna hymnal app (github.com/cevr/manna, `packages/hymnal`). `<n>.mp3` is hymn `n`. `<n>.json` is that render's record: its key, sha256, length and loudness checks. `manifest.json` lists the set and its config. The same files are served at `https://hymns.cvr.im/audio/warm-1/sdah/<n>.mp3`.
