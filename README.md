# STR-X Labs website

Static website for STR-X Labs at Mayo Clinic Jacksonville, home of ASTRAL, the AI-Surgical Training & Mixed Reality Avatar Laboratory.

## What's here
- `index.html`, `style.css`, `main.js`: the site shell (hero, mission, ASTRAL, global sites, leadership, fellowship, conference teaser, social) plus a mobile hamburger menu.
- `conference/`: public Conference Platform page for CME/CPD collaborators, with a client-side synthetic demo (`conference/demo/`).
- `globe.js` + `vendor/` (d3-array, d3-geo, topojson-client, three.module.min.js) + `data/land-110m.json`: interactive globe and the conference-room demo (three.js r170).
- `assets/`: approved photography.

No build step. Serve locally with `python3 -m http.server` and open http://localhost:8000.

## Preview deployment
Deployed to the Vercel project `strx-website` as a protected preview (Vercel Authentication on, no custom domain). Stable alias: https://strx-website-freemanwds-projects.vercel.app. Access requires a Vercel login or a time-limited share link.

## Confidentiality
Pre-release and private. Do not make this repository or the deployment public without approval. Use only the public ASTRAL name above. Do not add patient data, personal phone numbers or private emails; the only contacts are str-x@mayo.edu (fellowship) and strxlabs@gmail.com (general).
