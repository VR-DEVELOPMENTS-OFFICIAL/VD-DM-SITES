# VR Developments guide site

A plain HTML, CSS and JavaScript site for the How to Earn Money series. There is no build step, no package manager, and no external scripts, fonts or CDNs. All links and file paths are relative, so the site works from any folder and on GitHub Pages.

## Files

```
index.html                              Home page: hero, daily note, stats, guide cards
assets/style.css                        All styles (colours, layout, animations, reduced motion)
assets/app.js                           All behaviour (reveal, counters, copy, checklists, calculators, timetable, filter, saved ideas)
guides/ep1-teach-free-class-plan.html   Episode 1 guide
guides/ep2-free-template-idea-list.html Episode 2 guide
guides/_template.html                   Template for new daily guides (noindex, linked from nowhere)
.nojekyll                               Empty file. Tells GitHub Pages to serve files as they are.
```

## Brand

The brand is the wordmark "VR Developments" with an inline SVG monogram. It sits in the header and the footer of every page.

Colours (set as CSS variables at the top of `assets/style.css`):
- Dark slate `#17262B` (background)
- Yellow `#FFC400`, coral `#FF6F59` (main accents)
- Teal `#2EC4B6` and violet `#8D6CFF` (secondary accents)

### Swapping in a logo (assets/logo.png)

1. Put the logo file at `assets/logo.png`.
2. On `index.html`, `guides/ep1-teach-free-class-plan.html`, `guides/ep2-free-template-idea-list.html` and `guides/_template.html`, replace the `<svg class="brand-mark">...</svg>` in the header and in the footer with:
   - In `index.html`: `<img class="brand-logo" src="assets/logo.png" alt="VR Developments">`
   - In the guides: `<img class="brand-logo" src="../assets/logo.png" alt="VR Developments">`
3. Adjust the image height in `assets/style.css` in the `.brand-logo` rule (marked "LOGO SWAP POINT"). The default is `2.4rem`.
4. Check that the logo is still readable on the dark background and that the header still fits on a 375px wide screen.

## Daily guides

A new free guide goes up every day. To add one:

1. Copy `guides/_template.html` to a new file in `guides/`, such as `guides/ep3-your-topic.html`. Use lowercase letters, numbers and hyphens only.
2. In the new file, replace every `[square-bracket]` placeholder with your text. Set the `<title>`, the meta description and the kicker (for example "Episode 3 · How to Earn Money series").
3. Remove the `<meta name="robots" content="noindex">` line, and delete all the template comment blocks (the ones that start with `<!--`).
4. Keep the `../assets/style.css` and `../assets/app.js` links, the header and footer brand spot, and the footer disclaimer "Examples are only examples, not income promises."
5. Open `index.html`, find the `<!-- guide card -->` note in the guide list, and add a new `<li class="guide-card" data-reveal>` at the top of the list, so the newest guide comes first. Link it to `guides/ep3-your-topic.html`.
6. Check it locally: run `python3 -m http.server` in this folder and open http://localhost:8000. Click every link and check that each one returns a page.
7. Commit and push. GitHub Pages serves the site from the repository.

### Telugu cards (add only when the page exists)

Each guide card has an English pill (`<span class="lang-pill is-current">`). A Telugu pill is added only after the Telugu version of that guide is published at a real address, for example `guides/te/ep3-your-topic.html`. Then add a link next to the English pill:

```html
<a class="lang-pill" href="guides/te/ep3-your-topic.html" lang="te">తెలుగు</a>
```

Never add the link before the file exists, because it would be a broken link. The HTML comments in `index.html` mark where the pill goes.

## Interactive features

`assets/app.js` finds these features by their data attributes. Any page that uses them gets the behaviour automatically. Nothing is needed in the script.

| Feature | Markup | What it does |
| --- | --- | --- |
| Scroll reveal | `data-reveal` on a section or card | Fades and slides it in as it reaches the screen |
| Animated numbers | `<strong data-count="15">15</strong>` | Counts up from 0 to the number in the attribute. The number inside is still shown without JavaScript |
| Copy button | `<button data-copy-target="ID">` and a box with `id="ID"` | Copies the box text, one line per `<p>`. Falls back to older browsers |
| Checklist | `<ul class="checklist" data-checklist="NAME">` with `data-progress-for="NAME"` and `data-reset="NAME"` | Ticks and progress bar, saved in the reader's browser (localStorage) |
| Price calculator | `<div class="calc" data-calc="weekly">` or `"monthly"` with inputs `first` and `second` | Multiplies the two numbers and shows the result in rupees. Always label it "only an example" |
| Timetable | `<tr data-day="Monday">` (full English day name) | Highlights today's row |
| Idea filter | Tabs with `data-filter="category"` and cards with `data-cat="category"` | Filters the cards. Arrow keys move between tabs |
| Saved ideas | `<button class="save-btn" data-save="ID">` and a count with `data-saved-count` | Heart toggle, saved in the browser |

Reduced motion: when a reader turns on "reduce motion" in their device settings, the animations and the counting stop, and everything shows at once.

Saved data lives only in the reader's browser. Keys used: `vrd:checklist:<NAME>` and `vrd:saved:ep2`. Clearing the browser data clears them.

## Checks before publishing

- `node --check assets/app.js` passes.
- Every link and image path in every HTML file returns 200 when served with `python3 -m http.server`.
- The site works at about 375px wide, and with JavaScript turned off the text and links still show.
- Every page has VR Developments in the header and footer, and the disclaimer in the footer.
- No external `<script>`, font or CDN links are added.
- The template and any unfinished guide are not linked from `index.html`.
