# PeptideInfo

Public browser for the **Red Fox Peptides** protocol-library extract — dosing outlines, reconstitution, storage, and related notes for ~48 compounds.

**Not medical advice.** Content is research & community protocol sketches from vendor practice. Always verify against primary sources and consult a clinician for personal medical decisions.

## Live

- **GitHub (current push target):** this code lives on branch [`cursor/peptideinfo-site-470b`](https://github.com/apbjap/WhiteBoard/tree/cursor/peptideinfo-site-470b) of `apbjap/WhiteBoard` ([PR #2](https://github.com/apbjap/WhiteBoard/pull/2)) because the Cloud Agent GitHub App cannot create a new `PeptideInfo` repository.
- **Intended repo name:** create empty `apbjap/PeptideInfo`, then push this tree as `main` (see below).
- **Netlify:** site name intended **PeptideInfo** / `peptideinfo`. CLI is configured via `netlify.toml`; deploy requires `NETLIFY_AUTH_TOKEN` or `netlify login` (not available in the agent environment yet).
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

## Publish as PeptideInfo on GitHub

```bash
# after creating empty https://github.com/apbjap/PeptideInfo
git clone <this-branch-or-checkout>
git remote set-url origin https://github.com/apbjap/PeptideInfo.git
git push -u origin HEAD:main
```

## Netlify

`netlify.toml` is configured:

- Build command: `npm run build`
- Publish directory: `dist`
- SPA fallback: `/* → /index.html`
- Node 22

### CLI deploy (if authenticated)

```bash
npm install -g netlify-cli   # or use a local prefix
export NETLIFY_AUTH_TOKEN=…  # from https://app.netlify.com/user/applications#personal-access-tokens
netlify sites:create --name peptideinfo
netlify link
netlify deploy --prod --dir=dist
```

Or connect the GitHub repo in the Netlify UI, set site name to **PeptideInfo**, build command `npm run build`, publish `dist`.

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
