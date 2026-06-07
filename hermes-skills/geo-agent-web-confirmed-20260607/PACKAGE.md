# GEO-Agent Web Skill Pack Confirmed

Package date: 2026-06-07

This folder is the repository-ready package for the GEO-Agent Web Hermes skill
adapter.

## Contents

- `*/SKILL.md`: 13 confirmed Web adapter skills.
- `adapter-skill-map.json`: taskType to skillName route mapping.
- `shared/geo-web-contract.md`: shared input/output contract.
- `INTEGRATION.md`: project integration notes.
- `acceptance/`: acceptance report and screenshots.

## Verified

- Copied to `C:\Users\feihong\AppData\Local\hermes\skills\geo\`.
- Hermes Gateway reachable at `http://127.0.0.1:8642`.
- Web capabilities list recognizes the 13 Web adapter skills.
- Business frontend can create real Hermes runs for:
  - `geo_quick_start`
  - `geo_schema`
- API can create `keyword_mining` with `geo-keyword-mining-web`.

## Notes

Hermes skills now include a final response rule requiring a single JSON object.
The Web executor also includes a fallback parser for fenced JSON in case Hermes
still returns Markdown-wrapped output.

