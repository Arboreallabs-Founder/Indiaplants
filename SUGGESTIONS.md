# Visual direction and implementation brief for Claude Code

Reviewed 7 November 2026. This is a design and implementation brief, not an instruction to rebuild the application from scratch.

## The direction

Make Indiaplants feel like **a beautifully edited field guide from a working Indian nursery**. The memorable elements should be exceptional plant photography, confident typography, useful botanical detail, and evidence of the people who grow the plants.

The site already has a coherent forest-green identity, a substantial photographic archive, a useful plant picker, and a distinctive Monstera introduction. Keep those strengths. The opportunity is to give them stronger art direction and make the journey feel deliberate.

“Less AI generated” here means reducing interchangeable presentation: a polished studio Monstera followed by numbered sections, metric counters, automatic bento tiles, icon grids, identical rounded surfaces, and arbitrary card offsets. Any one of these can work; their accumulation makes the page feel assembled from familiar components. Adding more animation or random asymmetry would compound that problem.

## What was reviewed

- Source: `site/index.html`, `site/styles.css`, `site/app.js`, `site/film.js`, `site/film3d.js`, `site/icons.js`, `site/crm.js`, the asset directories, data samples, README and deployment configuration.
- Browser: home at the photo, 3D/data and library stages; category tiles; plant picker; browse; Monstera detail (`#/plant/445`); shop; growers page.
- Viewports: desktop 1440 × 1000 and mobile 390 × 844, including reduced motion on mobile.
- No JavaScript exceptions or horizontal page overflow appeared in those captures. Images that initially appeared blank loaded on a later check; do not diagnose them as permanently broken assets.
- Design judgments below are recommendations. Mobile positioning, reduced-motion visibility, source selectors and file sizes are directly observed findings. The remaining viewport, accessibility and performance checks are acceptance criteria for the implementation, not tests already completed.

Line numbers are starting points from this review. Prefer the named function or selector if the files move.

## Priorities

| Priority | Change | Main locations | Effort |
|---|---|---|---|
| P0 | Put the mobile headline and primary action where they can be seen | `styles.css:183–227`, `app.js:viewHome()` | Small–medium |
| P0 | Give reduced motion a complete, useful static hero | `film.js:136`, `app.js:485` | Small–medium |
| P0 | Resolve the photo-to-3D visual mismatch | `film3d.js:74`, `:164`, `:246` | Medium–large |
| P1 | Curate a small set of excellent, authentic photographs | `app.js:load()`, `viewHome()`, `viewAbout()` | Medium; original imagery may be needed |
| P1 | Recompose the home page around discovery and grower provenance | `app.js:viewHome()`, `.section`, `.band`, `.bento`, `.supply` | Medium |
| P1 | Establish more expressive type and stronger reading hierarchy | CSS tokens and heading/card/detail selectors | Medium |
| P1 | Simplify mobile navigation and keep essential labels readable | `index.html`, responsive navigation CSS | Medium |
| P1 | Make plant details the signature editorial page | `app.js:viewPlant()`, `gallery()`, detail CSS | Medium |
| P2 | Give the picker, catalogue and shop their own purposeful layouts | Relevant view functions and component CSS | Medium |
| P2 | Refine motion, loading and material behaviour | `film*.js`, image helpers, interaction CSS | Medium |

## 1. Make the opening composition intentional

**Observed:** The mobile hero asset deliberately reserves its upper third for copy, but `.film__act` is bottom-positioned. At 390 × 844, a large empty green area appears above the plant while the heading sits close to the bottom and supporting copy runs below the initial viewport. The header occupies 90 px, while the stage still uses a full `100vh`. The most prominent search form appears only in act C, after a substantial part of a `340vh` section; the smaller header search remains available.

**Change:**

- On mobile, place the introductory copy in the reserved upper portion of the photo. Give the plant an intentional lower composition. Use separate mobile image positioning rather than inheriting desktop coordinates.
- Account for the actual header height when sizing and positioning the stage. Choose stable viewport sizing deliberately; test mobile browser chrome and the on-screen keyboard rather than replacing every `vh` mechanically.
- Include a visible first-screen action: **Explore plants** and a quieter **Find plants for my space** link to the picker. Keep search accessible without completing the film.
- Start with a shorter desktop film, around 180–220 viewport heights, and a static or single-transition mobile introduction. Adjust the duration by watching the result, not by adding more stages.
- Use one clear headline with a deliberate line break. A possible direction is “A grower’s guide / to plants in India.” Treat this as draft copy. The current “Every plant you can grow in India” overstates a catalogue of 2,657 ornamental records.
- Retain the existing hero images for this pass. Fix framing, text and hierarchy before commissioning replacements.

**Done when:** at 390 × 844 and 360 × 800, a new visitor can read the heading, see the plant, and reach the primary action without scrolling. At desktop sizes, the plant and copy have distinct areas rather than competing for the same leaves.

## 2. Build a real reduced-motion composition

**Observed:** `mountFilm()` sets `p = 0.5` when reduced motion is requested. This selects act B. The hero search remains at opacity zero, and the introductory `h1` is also visually inactive. In the mobile static capture, the heading and explanatory copy overlap the framed plant. Opacity-only inactive acts also need keyboard-focus handling.

**Change:**

- Render a static image, visible page heading, concise description and direct search or browse action in normal document flow.
- Put care facts below or beside the image in that layout; do not freeze the animated layout halfway through its transition.
- Make inactive animated acts inert and exclude their controls from keyboard navigation. Restore controls when their act becomes active. Keep the page’s heading structure meaningful.
- Use the same useful composition when WebGL is unavailable or initialization fails. A visitor should still receive the identity, plant image and discovery tools.

**Done when:** reduced motion provides all essential information and actions, with no overlapping text and no invisible focused controls.

## 3. Refine the 3D scene before adding effects

**Observed:** the textured model has a different silhouette from the photograph: a broad radial fan of repeated leaves and prominent petioles. Wireframe lines remain visible across the photographic leaves. `applyTextures()` replaces leaf geometry with bent planes, while the existing wire/particle geometry was built from `leafShape()`. In `frame()`, the textured wire opacity settles at `0.08`; the scan, wires, dimension line, particle explosion and photo wall all compete for attention.

**Change:**

- Keep the 3D work as an enhancement, but make the plant convincing in a still frame first. Align camera, pot proportions, main leaf positions and silhouette with the hero photograph.
- Remove the persistent wireframe once textured surfaces are visible. If an outline stage is retained, it must correspond to the final leaf geometry rather than tracing a different leaf.
- Reduce the choreography to one understandable transformation: photograph → botanical specimen with a few facts → catalogue. A short reveal and subtle turn can carry this. Remove the glowing scan and particle explosion in the first visual refinement pass.
- Limit simultaneous annotations to three primary facts. Move secondary facts into the specimen caption or detail link. Labels should lead to the relevant plant detail, not merely decorate it.
- Vary leaf pitch, roll, size, bend and depth deliberately. Avoid an evenly spaced fan; keep a plausible crown and visible overlapping layers. Preserve natural surface colour and check front/back rendering at oblique angles.
- Inspect alpha-hashed edges at normal display size and low device pixel ratios. If they appear noisy, evaluate a suitable cutout/transparency approach with the current renderer rather than hiding the problem behind glow.
- Treat an authored model as a later asset upgrade if procedural geometry cannot match the photograph. Keep the current photo fallback polished in the meantime.

**Done when:** screenshots taken before, during and after the transition plausibly depict the same specimen, with clean leaf silhouettes and legible labels. The scene must look finished even with the animation paused.

## 4. Let the nursery’s own photography establish credibility

The generated hero and textures are useful presentation assets. The original nursery archive is the source of visual specificity. Give it an editorial role instead of showing it mainly as interchangeable thumbnails.

**Current code:** category images are selected by category specificity and gallery count in `load()`. `viewHome()` chooses 14 daily features with `seeded(...)`. Neither selection process evaluates composition, photographic quality, subject recognition or storytelling.

**Change:**

- Add a small curated presentation file, for example `site/data/editorial.json`, containing stable plant IDs, existing image paths, focal points, display order and short captions. Keep canonical botanical records untouched.
- Hand-select 8–12 strong images for the home page. Balance a whole specimen, a close leaf study, a flower detail, a landscape-scale plant and a nursery context image where an authentic source exists.
- Select representative category photographs. In the reviewed home page, “Trees” is illustrated by a tight crop of flowering stems; a recognisable tree silhouette would communicate the category faster.
- Store per-image `object-position` metadata. Avoid solving every crop with the same `50% 50%` rule.
- Place captions below key images: plant name, documented detail and source where known. Use genuine notes from the records, edited for clarity. Do not invent field observations, dates, endorsements, climate suitability or photographer credits.
- For the growers section, request a real nursery-wide photograph, a real grower portrait and, if available, a photograph of the 2002 CD-ROM or catalogue. Until supplied, build a finished text-led section using existing material; do not fabricate archival evidence or people.
- Retain source credits and watermarks where required. Seek owner-provided originals for larger editorial images; upscaling a small photograph does not restore botanical detail.

**Done when:** the homepage’s photographs and captions form a recognisable selection with a reason for each inclusion, and every caption can be traced to real content.

## 5. Give the home page a stronger sequence

The current sequence is: long film → four metrics → category bento → ten trade audience cells → picker → daily rail → text-only grower story. The repeated “01 / 02 / 03” labels, notched section boundaries and component grids make these feel equally weighted.

**Suggested composition:**

1. A concise Monstera introduction with immediate exploration links.
2. An editorial discovery spread: one large plant study, two smaller contrasting photographs, concise category links and a link to the complete catalogue.
3. The plant picker, with an inviting question and useful preview results.
4. A grower story pairing a real image or archival object with a short excerpt and link to the full history.
5. A small collection of plants selected for a documented trait, followed by a compact trade/visit invitation.

Use open space and typography to separate these sections. Keep one strong dark section if it helps the rhythm; remove repeated notch transitions and most section numbers. Place the record/photo counts in a compact provenance line rather than giving all four equal promotional weight.

For editorial asymmetry, assign roles explicitly in data. Do not rely on `nth-child` placement or the shop’s `i % 7 === 0` rule to decide which item is important. Keep the full browse catalogue regular and easy to scan.

**Locations:** `viewHome()`, `fitBento()`, `.facts-strip`, `.bento`, `.supply`, `.notch`, `.rail > .pc:nth-child(even)`.

## 6. Give type, spacing and surfaces distinct jobs

**Current system:** Schibsted Grotesk carries most prominent text, headings are broadly heavy, metadata is often 11–12 px, and 8–14 px corner radii recur across unrelated elements. `--max: 100%` allows editorial content to stretch indefinitely on wide screens.

**Change:**

- Keep the existing font family initially. Use 700–800 weight for the main display headline, 600–700 for section titles, and quieter weight for botanical names and body copy. Distinction can come from scale and placement without adding another typeface.
- Set a readable editorial body around 16–18 px, metadata around 12–13 px, and text columns around 60–68 characters. Dense catalogue rows may remain smaller where needed.
- If a botanical italic style is introduced, provide a real italic face and apply it to the botanical name, not blindly to common names, cultivar text or an entire scraped synonym string.
- Reserve uppercase mono text for accession-like references, genuine measurements or concise captions. It need not precede every heading and paragraph.
- Introduce separate content widths for full-bleed imagery, editorial sections and the dense catalogue. Preserve the hero’s edge-to-edge treatment without forcing every page to span an ultrawide monitor.
- Use quieter image corners, for example 2–4 px, and retain modest rounding on controls. Keep rounded containers where they explain grouping; remove unnecessary card shells around ordinary text.
- Preserve forest green and mandarin. Use the accent for selection and a small number of important details rather than as decoration on every module. Avoid a global beige/serif/grain makeover that simply replaces one familiar template with another.

**Concrete legibility issue:** `#7D8F84` on `#F7FAF8` is approximately 3.26:1, and white on the hero’s `#FD550A` button is approximately 3.24:1. Those combinations are weak for the current small text. Use the darker existing ink for essential metadata and a tested darker button colour for small white labels; preserve the orange brand accent elsewhere.

## 7. Simplify navigation, especially on phones

**Observed:** at 390 px the header wraps to 90 px and presents several unlabeled icons. At widths below 960 px, `.nav__links a span { display: none; }` removes the text. The corresponding SVGs are `aria-hidden`, and these primary links do not supply independent accessible names.

**Change:**

- Mobile first row: wordmark, a clearly labeled Menu control and the most important utility. Put secondary destinations into the menu with visible names.
- Keep a discoverable search field or explicit Search control. Decide its placement together with the hero so the two do not repeat the same hierarchy awkwardly.
- Give every destination a persistent accessible name, visible focus state and comfortable touch target. Avoid relying on hover tooltips.
- Remove per-icon rotation/bounce tricks from the main navigation. A restrained active underline and a clear hover state are enough.
- Consider a wordmark-focused header and reserve the sprout symbol for compact contexts. Its current rounded-square treatment resembles a generic app badge more than a nursery identity.

**Locations:** `site/index.html`, `.nav__inner`, `.nav__links`, `.nav__tools`, `site/icons.js:icon()`.

## 8. Make the plant detail page worth lingering on

The current detail page is useful but reads as a gallery beside a uniform specification list. This is the best place to turn the archive into a distinctive product.

**Change:**

- Build a specimen opening with a carefully cropped image, botanical name, common/regional names and a small family/reference line.
- Pull Light, Water and Mature size into a concise care summary. Keep the full classification and other attributes below in an orderly table.
- Clarify the context of mature-size data. The reviewed Monstera record says “More than 12 m”; presenting that beside a small potted specimen without explanation is confusing. Preserve the source value and add only verified context.
- Give growing tips a prominent “From the growers” reading section. Edit spelling and structure while preserving meaning; do not invent expertise or convert observations into guarantees.
- Use meaningful gallery captions and clear thumbnail selection. Respect whole-plant and detail photographs differently; provide an uncropped inspection view where useful.
- Keep Save to list and Enquire visible, with one dominant action. Present Copy link as a quieter utility.
- Turn relevant related-plant headings into useful explanations when supported by the records, such as shared genus or documented growing conditions.

**Locations:** `viewPlant()`, `gallery()`, `bindGallery()`, `.detail`, `.gallery__main`, `.spec`, `.longform`.

## 9. Keep discovery functional while making it more expressive

### Plant picker

Keep its real filtering logic. The current result card gives the large count of matches more emphasis than the plants themselves. Lead with three clearly identified results, each with a concise explanation derived from the selected criteria. Move the total to supporting text. On mobile, keep the result/action reachable as choices change, and use a single concise live-region announcement rather than repeatedly announcing a whole card.

Do not turn existing filters into unsupported claims. A matching database field is not a guarantee of success in a particular climate, room or household.

### Catalogue

Keep a regular results grid and table view. Improve the information rhythm: recognisable photograph, readable plant name, common name, then the most useful care facts. `.pc__meta` currently disappears below 680 px; retain at least light and size in a compact mobile treatment. Allow long botanical names to wrap gracefully without making common names illegible.

For browse pages, increase photographic and text size before adding decorative elements. Use a clearly named filter drawer on mobile, retain selected filters and result count, and preserve URL-based filtering and sorting.

### Shop

Replace arbitrary wide cards with intentional grouping around materials or use: pots and planters, supports, growing media/accessories, and memberships. Preserve the actual catalogue categories and quote behaviour. Use consistent product photography within each group and make “Price on request” clear without giving it the same emphasis as a product name.

## 10. Give the growers and visit pages visible evidence

`viewAbout()` already contains a specific family history and timeline. In the rendered page, that material is entirely text. Move a small amount of it into the homepage and give the full page room for real photographs and archival material when supplied.

Use one prominent image, a short narrative excerpt, then a compact timeline. Highlight a few documented turning points instead of giving every paragraph equal treatment. Verify historical and acreage claims before enlarging them into display copy.

On the visit page, prioritize actual location, wholesale/retail distinction, contact details and directions. Give visitors a clear sense of the place with verified imagery. Avoid decorative map grids becoming the main visual identity.

The footer has six `data-soon` social links. Hide unconnected destinations until genuine URLs are available. The signup adapter and quote workflow also have unfinished connections documented in README; keep their states honest. A polished interface should not imply that an unconnected form has successfully delivered a request.

## 11. Use motion and loading to support the design

- Keep one signature motion sequence on the home page. Use quiet colour, underline or image transitions for ordinary controls; remove the combination of icon spins, button scaling, card zooms and decorative stagger where it adds no information.
- Preserve scroll position, keyboard interaction and focus when filters or results update. Keep reduced-motion behaviour equivalent in usefulness.
- Treat the initial photograph as the first meaningful visual. Give it intentional loading priority and stable layout. Defer 3D initialization and its approximately **3.61 MB of textures** until the enhancement is needed, while retaining the photo if assets fail.
- Do not load every archive image at full resolution for the wall. The current thumbnail-based wall is appropriate at its small tile size. Prepare it before its reveal and retain a designed fallback while images arrive; the first quick capture showed empty tile backgrounds, which populated on the later capture.
- Dispose of loaded textures and materials as well as geometries during hero teardown. Guard asynchronous texture completion after navigating away. This keeps repeated visits from degrading the visual experience.
- Keep the existing vector flytrap assets separate from this direction. `viewHome()` currently mounts the Monstera film; adding the earlier flytrap back alongside it would create a second competing hero.

## Suggested implementation order

1. Capture the current pages, then fix mobile hero placement, reduced-motion composition, accessible navigation labels and small-text contrast.
2. Establish the type, spacing, radius and content-width rules. Apply them to home, browse and one plant detail page together so the site remains coherent.
3. Add curated presentation metadata and recompose the homepage using existing photographs. Supply real photographic needs as a short asset list, with a finished layout that does not depend on invented images.
4. Refine the 3D silhouette and remove competing effects. Compare the transition with the photo-only version; ship the version that looks more convincing and remains responsive.
5. Bring the growers, picker and shop into the same visual language. Finish interaction, loading and responsive checks.

Keep the current static HTML/CSS/JS architecture, hash routes, image-base configuration, data records, filters, saved list and bag behaviour. Do not introduce a framework migration or animation dependency to accomplish this visual pass. Avoid unrelated edits to the scraper and data-build scripts.

## Acceptance criteria for Claude Code

- Capture home opening/data/library states, browse, plant detail, picker, growers and shop at 1440 px and 390 px; additionally inspect 360, 768 and 1920 px widths.
- At mobile size, the opening headline and main action are visible, the plant is intentionally framed, and no label sits over an unreadable part of the image.
- Reduced motion and WebGL failure both produce a complete static experience with visible heading and discovery action.
- Keyboard navigation never lands on invisible hero controls. Primary navigation has accessible names, and normal-sized essential text has sufficient contrast.
- The 3D transition preserves a convincing silhouette; mature textured leaves have no leftover procedural wire overlay.
- Featured photographs are curated, captions are supported, and crop choices are stored explicitly. No invented testimonials, grower quotes, nursery photographs or stock claims.
- Plant search, filters, picker results, galleries, saved list, quote bag and route transitions still work. Test long names, missing images, zero results and touch interactions.
- Check image loading and the hero under throttled network/CPU conditions. Show a usable photo and actions before enhancement assets finish; do not claim performance gains without measuring them.
- Provide before/after screenshots and a concise account of changed files, design decisions and remaining genuine asset needs.

## Starting instruction for Claude Code

> Read `SUGGESTIONS.md`, inspect the current files, and implement the P0 fixes followed by the P1 visual direction in small coherent passes. Build the identity around a nursery field guide: deliberate photography, strong readable typography, useful plant detail and real grower provenance. Preserve the existing application and data behaviour. Use existing assets first, and keep missing archival assets on an explicit follow-up list. Review desktop, mobile and reduced-motion screenshots after each visual pass. Finish with before/after evidence and the outstanding asset needs.
