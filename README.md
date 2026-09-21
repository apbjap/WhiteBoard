# PeptideInfo

Public browser for the **Red Fox Peptides** protocol-library extract — dosing outlines, reconstitution, storage, and related notes for ~48 compounds.

**Not medical advice.** Content is research & community protocol sketches from vendor practice. Always verify against primary sources and consult a clinician for personal medical decisions.

## Live

- Site: deploy to Netlify (see below); intended site name **PeptideInfo**
- Data source: [Red Fox Peptides Protocol Library](https://www.redfoxpeptides.is/protocol-library/)

## Stack

- Vite + React + React Router (static Jamstack build)
- Protocol data copied into `public/data/protocols.json` (read-only extract)

## Local development

```bash
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`).

```bash
npm run build    # output in dist/
npm run preview  # preview production build
```

## Netlify

`netlify.toml` is configured:

- Build command: `npm run build`
- Publish directory: `dist`
- SPA fallback: `/* → /index.html`

### CLI deploy (if authenticated)

```bash
npm install -g netlify-cli
netlify login
netlify init          # create site named PeptideInfo / peptideinfo
netlify deploy --prod
```

Or connect this GitHub repo in the Netlify UI and set site name to **PeptideInfo**.

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
