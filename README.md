# PeptideInfo

Local browser for the **Red Fox Peptides** protocol-library extract — dosing outlines, reconstitution, storage, and related notes for ~48 compounds.

**Not medical advice.** Content is research & community protocol sketches from vendor practice. Always verify against primary sources and consult a clinician for personal medical decisions.

## Run locally

Requires Node 20+ (22 recommended).

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm run build     # production build → dist/
npm run preview   # serve dist/ locally (usually http://localhost:4173)
```

## Stack

- Vite + React + React Router (static build)
- Protocol data in `public/data/protocols.json` (read-only extract from Red Fox)

## Data attribution

| Field | Value |
| --- | --- |
| Source | Red Fox Peptides protocol library |
| Hub | https://www.redfoxpeptides.is/protocol-library/ |
| Local copy | `public/data/protocols.json` |
| Schema | `public/data/schema.json` |

Compounds are not invented — the UI only organizes and displays extracted records. Category chips (incretins, healing, GH axis, etc.) are browse filters only.

## Disclaimer

There are no fixed peptide protocols; approaches vary. This site presents community-practice sketches for research browsing, not clinical guidance.

## Later (optional publish)

Not required to use the site locally.

- **GitHub:** this work currently lives on branch [`cursor/peptideinfo-site-470b`](https://github.com/apbjap/WhiteBoard/tree/cursor/peptideinfo-site-470b) / [PR #2](https://github.com/apbjap/WhiteBoard/pull/2) on `apbjap/WhiteBoard`. When ready, create empty `apbjap/PeptideInfo` and push this tree as `main`.
- **Netlify:** `netlify.toml` is ready (`npm run build` → publish `dist`, SPA fallback). Create site named PeptideInfo / peptideinfo when you have Netlify auth.
