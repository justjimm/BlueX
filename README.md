# bcexl.com

The Bluechip Experience Limited website. Static HTML, served by GitHub Pages.

## Publishing

Everything at the top level of this folder is the live site. Copy it into the GitHub Pages
repository and push. **Keep the repository's existing `CNAME` file**: it is what points
bcexl.com at GitHub Pages, and this folder does not include one.

## Changing the site

Pages, articles and settings live in `_source/`. After any change, rebuild:

```
python3 _source/build.py
```

(Articles need `pip install markdown`.) Then publish as above.

| To change | Edit |
|---|---|
| A page's text | `_source/pages/<page>.html` |
| Phone, email, address, RC number | `_source/config.json` |
| A business's description or status | `businesses` in `_source/config.json` |
| Show or hide a business's website link | set its `status` to `live` or `held` |
| Contact form delivery | paste the Formspree form ID into `formspree_id` |
| Newsletter signup | paste the provider's form action URL into `newsletter_action` |
| Social links | fill in `socials` |
| Look and layout | `assets/css/site.css` |
| The 3D hero | `_source/hero3d.src.js` |

## Insights

Add one Markdown file per article to `_source/insights/` (format in the README there) and rebuild.
Insights joins the menu once three articles are published. `feed.xml` is the RSS feed a
newsletter service can watch to email new articles automatically.

## What's included

- `assets/brand/`: the corrected logo files used on the site (text outlined, nothing clipped).
- `assets/fonts/`: Inter, self-hosted (SIL Open Font Licence, `OFL.txt`).
- `assets/vendor/`: Three.js r128 for the 3D hero (MIT licence). It loads only on desktop.
- Old addresses (`products.html`, `gaugeloads.html`, `ekobuja.html` and others) redirect to the new pages.
