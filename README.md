# Indiaplants

A rebuild of indiaplants.com: 2,657 ornamental plant records from the growers at Tukai Exotics, Pune, with search,
faceted filters, a plant picker, shop and quote requests, built from data extracted from the original site.

Static HTML/CSS/JS with no build step. Type: Anek Latin (headings) and Mukta (text), both by Ek Type, Mumbai. The home hero is a scroll-driven 3D film rendered with three.js, loaded from a CDN.

## Layout

| Path | What |
|---|---|
| `site/` | The website. **This is the deploy root.** |
| `site/data/plants.json`, `shop.json` | Trimmed data the site reads |
| `site/assets/hero/`, `site/assets/3d/` | Hero photos and 3D textures (generated for this site) |
| `site/film3d.js` | 3D scroll film (desktop, loaded on first scroll/idle). Phones, reduced motion, no-WebGL and load failures get the static opening in `app.js` (`introMarkup`). Preview it with `?static` in the URL. |
| `site/data/editorial.json` | Hand-curated home photos, focal points, captions (edited from the records) and category cover choices |
| `site/crm.js` | Sign-up adapter (not connected yet, see below) |
| `scripts/` | Parse, download and build scripts that rebuild the data |
| `docs/` | Image briefs used to generate the hero and 3D assets |

Not in git (see `.gitignore`): `data/raw/` (scraped pages captured in a logged-in session), the full
`data/plants.json` dump, and `data/images/` (≈338 MB of downloaded photos).

## Run locally

Serve the **project root** so the site can reach the downloaded photos in `../data/images/`:

```sh
python -m http.server 8080 --bind 127.0.0.1
# open http://127.0.0.1:8080/site/
```

## Deploy (Vercel)

1. Import the GitHub repo into Vercel and keep the default Root Directory (the repo root).
2. Deploy. The root `vercel.json` publishes the `site/` folder (no build needed) and adds caching and security headers.

If the project's Root Directory is set to `site` instead, `site/vercel.json` applies, and that works too.

Photos are not in the repo, because there are ≈28k files and a Vercel deployment allows far fewer. Every photo URL goes
through one base URL (`IMG_BASE` in `site/app.js`):
- Local (`localhost` or `127.0.0.1`): `../data/images/`
- Deployed: `https://indiaplants.com/` for now

To move the photos (for example to Vercel Blob or a CDN after upscaling), upload `data/images/photos/…` with the same
paths and set `window.IP_IMG_BASE = 'https://your-cdn/…/'` in `index.html` before `app.js`.

## Rebuild the data

```sh
python -I scripts/parse_plants.py        # raw HTML -> data/plants.json
python -I scripts/download_images.py     # main photos + thumbnails (--full for every full-size photo)
python -I scripts/build_site_data.py     # data/plants.json -> site/data/plants.json
python -I scripts/parse_shop.py          # accessory pages -> site/data/shop.json
```

The crawl needs a logged-in browser session, because the old server blocks non-browser clients for HTML pages.

## Not connected yet

- **Sign-up:** `site/crm.js`. Set `CRM.endpoint`, or swap in a CRM SDK call. The form already sends one clean object.
- **Quote and order requests:** the bag's form validates input but sends nothing.
- **Social links:** placeholders in the footer (`data-soon`).
- **Privacy policy and terms:** drafts rewritten from the old site. They need legal review before launch.

## Routes

`#/` home · `#/plants?…` browse/search · `#/plant/<id>` · `#/categories` · `#/shop` · `#/shop/<id>` · `#/cart` ·
`#/list` · `#/about` · `#/contact` · `#/signup` · `#/privacy` · `#/terms`
