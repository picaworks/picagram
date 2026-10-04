# Page-owned collection fonts

Six variable normal faces are served locally from `public/fonts/`. The official Google Fonts metadata and complete SIL OFL 1.1 notices sit beside each WOFF2. The manifest records original TTF and final WOFF2 SHA-256 hashes, exact axes, sizes and source URLs. The shipped faces were subset from the official variable TTFs using FontTools to Latin/extended Latin, punctuation and arrows. No reserved font names are declared in these six notices. These font files are separately licensed under the SIL OFL; Picagram’s code license does not replace their notices. No italic face is shipped or promised.

| Family | Verified variable axes | Primary source |
|---|---|---|
| Fraunces | SOFT 0–100, WONK 0–1, opsz 9–144, wght 100–900 | [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/fraunces) |
| Newsreader | opsz 6–72, wght 200–800 | [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/newsreader) |
| Cormorant Garamond | wght 300–700 | [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond) |
| Public Sans | wght 100–900 | [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/publicsans) |
| Space Grotesk | wght 300–700 | [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/spacegrotesk) |
| Anybody | wdth 50–150, wght 100–900 | [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/anybody) |

`font-display: swap` and system/Georgia fallbacks keep content visible. A single stylesheet describes the faces; browsers request only the families a page uses and cache the files. Component cores never load fonts or make network requests. In the catalog, Collection applies a deliberate family profile to the selected new design; six family choices and Page font are available for comparison. Existing designs retain their page font under Collection.

The standalone HTML and generated React exports remain portable and use the consuming page's typography with system fallbacks. To reproduce the collection profile, serve this fonts directory with its license notices and load `/fonts/fonts.css` once in the page head. Set the body family plus the root variables used by the chosen component, for example:

```html
<link rel="stylesheet" href="/fonts/fonts.css">
<style>
:root {
  --pica-font-serif: "Fraunces", Georgia, serif;
  --pica-font-display: "Anybody", system-ui, sans-serif;
  --pica-font-wide: "Anybody", system-ui, sans-serif;
}
body { font-family: "Public Sans", system-ui, sans-serif; }
</style>
```

The exact profile mapping is `scripts/fonts.ts`. Cormorant supports classical titles, Newsreader supports long reading, and Space Grotesk supports selected technical/art practices. Anybody provides an actual width axis (50–150); choose supported values through `font-stretch` or `font-variation-settings` on the consuming page. Other axes may likewise be selected within the listed bounds. Preview choices do not silently change copied component source or add external Google requests.
