# Scroll hero: Monstera images (brief for Codex)

The home page opens with a scroll-driven film in three acts:
- **A.** A full-screen photo of a Monstera that leans slightly toward the cursor.
- **B.** As you scroll, the photo pulls back into a centred 4:3 card, and labelled data callouts draw in on either side.
- **C.** The card shrinks into one tile of a wall of every plant in the database.

The only Monstera photos on the old site are 640×480 with a watermark, which is too small for a full-screen image.
Generate these two files and save them in `site/assets/hero/`. The page picks them up automatically, with no code changes.

## Rules for both images

- **No text, logos or watermarks.**
- Photorealistic, natural colour, crisp leaf detail: you should see the veins and the fenestrations (holes and splits).
- The backdrop is a **deep forest green studio sweep graded toward `#253D2C`**, darker at the edges. The site's background is that colour, so the photo needs to blend into it as the card pulls back.
- Soft key light from the **top-left**, with gentle fill. No harsh specular highlights.
- **The plant must work two ways:** full-screen in act A, and cropped to a centred 4:3 card in act B. Centre the crown of leaves, and keep the important leaves within the middle 60% of the frame.
- Export as JPG at quality 80–85. Aim for under 700 KB on desktop and under 450 KB on mobile.

## 1. `monstera-hero.jpg` — 3200 × 2000 (desktop)

> Photorealistic studio photograph of a mature, healthy Monstera deliciosa with 9–12 large glossy split leaves, growing in a deep green matte ceramic pot. The plant is centred in the frame; the crown fills the middle 60% and leaves reach toward the edges. The backdrop is a seamless deep forest-green studio sweep (#253D2C) with a soft vignette. Soft daylight from the top-left. Shallow but sharp focus on the front leaves, rich leaf texture and visible veins. The bottom quarter is the pot and a dark floor that fades to the backdrop colour. No text, no people, no watermark.

## 2. `monstera-hero-mobile.jpg` — 1600 × 2400 (portrait)

> The same plant, lighting and backdrop as the desktop image, reframed as a tall portrait. The plant fills the middle and lower two-thirds and the pot sits near the bottom. The top third is mostly dark green backdrop with a few leaf tips entering the frame (a headline sits there). No text, no watermark.

## Optional: a better act C

The plant wall currently uses the database's 145 × 93 thumbnails. If you want a sharper wall later, a
square 512 px clean crop of each plant (watermarks removed) can drop in through the same image pipeline.

## After generating

Reload the home page. If the most important leaf in act B falls outside the card, adjust the
`object-position` on `.film__photo` in `site/styles.css` (for example `50% 40%`). The callout dots are
placed at fractions of the card (`data-ax` and `data-ay` in `app.js`), so you can nudge them to sit on real leaves.
