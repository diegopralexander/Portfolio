# Diego Prado: portfolio

Static site: HTML, CSS and vanilla JavaScript. No build step, no frameworks.

## Structure
```
index.html              Home: intro + Recent Works cards + footer
about.html              About: statement, intro, specialities, toolkit
proyecto.html           Case study template (proyecto.html?id=<project-id>)
casalia-proposal.html   Casalia brand proposal (linked from the Casalia case study)
404.html                Not-found page
data/projects.json      ALL project content (cards + case studies)
css/style.css           Site styles (colors and fonts are tokens at the top)
css/flower.css          Animated footer logo
js/main.js              Theme toggle, header, Barcelona clock, reveal-on-scroll
js/projects.js          Builds cards and case studies from projects.json
js/lightbox.js          Click-to-open photo viewer (photo journal)
js/flower.js            Plays the footer logo while it is on screen
js/flipbook.js          Home page squares that flick through work + photography (edit the image lists at the top)
assets/                 Web-ready images, favicon, share image (og-cover.jpg)
```
Source photos, the brief and design hand-offs live **outside** this folder, in `../portfolio-source/`, so they are never published.

## Editing content
- Everything about the projects is in `data/projects.json`. The `_help` block at the top explains every field.
- Info-row rules: **When** = year only (`2023`, `2024 – present`). **Where** = `City, Country`.
- A card with `"comingSoon": true` shows a lock and isn't clickable.
- Images: export at about 1300–1600px on the long side, JPG quality around 75, then put them in `assets/images/projects/<project-id>/`.
- After changing CSS or JS, bump the `?v=` number in the `<link>` and `<script>` tags so browsers load the new files.

## Run locally
The pages load `projects.json` with `fetch`, which browsers block on `file://`, so use a local server:
```bash
cd portfolio
python3 -m http.server 8000
```
Then open http://localhost:8000.

## Deploy
**GitHub Pages**
1. Create a new GitHub repository, for example `portfolio`.
2. Push the *contents* of this folder to the root of that repo.
3. In the repo, go to Settings → Pages → Source: "Deploy from a branch", branch `main`, folder `/ (root)`.
4. `.nojekyll` is included, and every path is relative, so the site works under `username.github.io/portfolio/`.

**Vercel**: import the repo, choose Framework "Other", leave the build command and output directory empty.

Live site: https://diegopralexander.github.io/portfolio/ . The `og:image` tags use the full URL of `assets/og-cover.jpg`; update them if the address changes (e.g. a custom domain).
