# Photoreal flytrap — image brief for Codex

The hero flytrap is an animated rig: the stem is drawn live, the head turns toward the cursor, and the
two jaw halves rotate open and shut on a hinge. To make it photoreal we only swap the artwork.
Generate the **3 images below**, drop them in `site/assets/flytrap/`, then fill in `manifest.json`.
No code changes are needed.

## Rules for every image

- **Transparent background (PNG with alpha).** No backdrop, floor, vignette or drop shadow; the site adds its own shadow.
  If the generator can't do alpha, render on pure white `#FFFFFF` and remove the background afterwards.
- Photographic macro style: natural daylight from the **top-left**, shallow but not blurry depth of field, true-to-life colour.
- All three must share the same lighting direction and colour temperature so they read as one plant.
- Brand-friendly colour: jaw interiors a saturated red-orange close to `#FD550A`; outer skin fresh green.
  The pot is a deep green matte ceramic close to `#253D2C`.
- Nothing cropped: leave about 4% padding around the subject.

## 1. `upper-lobe.png` — 2048 × 1024

> Photorealistic macro photograph of a single Venus flytrap (Dionaea muscipula) trap lobe, isolated on a transparent background. Strict side profile. The hinge (midrib) is at the far left edge, vertically centred; the lobe extends to the right and curves **upward**, like the top half of an open clam. The red-orange inner surface faces down and slightly toward the camera. A row of long, thin, pale green cilia (teeth) runs along the lower rim, pointing down and slightly outward. Three tiny trigger hairs on the red interior. Soft daylight from the top-left, high detail, no stem, no shadow.

- **Pivot**: the hinge point at the left edge. Target is about `(80, 512)`.
- **Tip**: the far right end of the lobe. Target is about `(1960, 470)`.

## 2. `lower-lobe.png` — 2048 × 1024

> The matching bottom half of the same Venus flytrap trap: identical style, lighting from the top-left, strict side profile, hinge at the far left edge, vertically centred. The lobe extends to the right and curves **downward**. The red-orange inner surface faces up. Long pale green cilia run along the **upper** rim, pointing up and slightly outward. Transparent background, no stem, no shadow.

- **Pivot** is about `(80, 512)`. **Tip** is about `(1960, 554)`.
- If you skip this file, the site mirrors `upper-lobe.png`. That works, but the lighting will be flipped on the bottom jaw.

## 3. `pot.png` — 1536 × 1536

> Photorealistic product photograph of a small deep-green matte ceramic pot, front three-quarter view at eye level, filled with dark moist peat soil. A low rosette of 5–7 small closed Venus flytrap leaves (green with red-orange interiors) spreads from the centre of the soil. **Nothing grows tall from the centre:** leave the exact centre of the soil clear, because the animated stem emerges there. Transparent background, soft daylight from the top-left, no shadow.

- **Anchor**: the clear spot at the centre of the soil where the stem starts. Target is about `(768, 560)`.

## After generating

1. Open each PNG in any image viewer that shows pixel coordinates. Read the real pivot, tip and anchor points.
2. Copy `site/assets/flytrap/manifest.example.json` to `manifest.json` in the same folder, and enter those points.
3. Set the stem `color` to the stem green sampled from the photos, and `highlight` to a lighter tone of it.
4. Reload the home page. If anything looks misaligned, nudge `pivot` or `tip` by a few pixels.

## Optional upgrades

- **Teeth that interlock when the jaws close**: generate both lobes from a single closed-trap reference image, so the cilia line up.
- **Stem texture**: a 512 × 64 seamless horizontal tile of a green Dionaea petiole. Ask if you want this wired in as an SVG pattern.
- **Upscaling**: export everything at 2× (4096 px wide lobes); the rig scales the images down.
