#!/usr/bin/env python3
"""Build bcexl.com from _source/ into the repository root.

    python3 _source/build.py

Pages live in _source/pages/*.html (an HTML comment header, then the body).
Articles live in _source/insights/*.md (front matter, then Markdown).
Site-wide facts and switches live in _source/config.json.
Everything the build writes is plain static HTML that GitHub Pages serves as is.
"""
import datetime as dt
import html
import json
import os
import re
import sys
from email.utils import format_datetime

try:
    import markdown  # pip install markdown
except ImportError:  # articles need it; pages do not
    markdown = None

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)
CFG = json.load(open(os.path.join(SRC, "config.json")))
GEO = json.load(open(os.path.join(SRC, "x-geometry.json")))
BRAND = os.path.join(ROOT, "assets", "brand")
TODAY = dt.date.today()

NAV = [
    ("about", "About", "about.html"),
    ("businesses", "Businesses", "businesses.html"),
    ("bluex", "BlueX", "bluex.html"),
    ("enterprise", "Enterprise Services", "enterprise-services.html"),
    ("insights", "Insights", "insights.html"),
    ("contact", "Contact", "contact.html"),
]

# Old URLs from the previous site, kept alive as redirects.
REDIRECTS = {
    "products.html": "businesses.html",
    "gaugeloads.html": "businesses.html#gaugeloans",
    "gaugeloans.html": "businesses.html#gaugeloans",
    "ekobuja.html": "businesses.html#ekobuja",
    "vendor-financing.html": "businesses.html#structured-finance",
    "commercial-ventures.html": "businesses.html#ventures",
    "prenniex.html": "businesses.html#prenniex",
    "philosophy.html": "about.html",
}

esc = html.escape


# ------------------------------------------------------------------ helpers
def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def write(rel, content):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(content)


def rings_d(parts):
    out = []
    for p in parts:
        for ring in [p["outer"], *p["holes"]]:
            out.append("M" + " L".join(f"{x:g} {y:g}" for x, y in ring) + "Z")
    return "".join(out)


def svg_inner(fname):
    s = read(os.path.join(BRAND, fname))
    s = re.sub(r"<title>.*?</title>", "", s)
    return s


def header_logo():
    """Header logo: the BlueX small-size version, coloured from CSS."""
    s = svg_inner("bluex-wordmark.svg")
    s = s.replace('role="img"', 'aria-hidden="true" focusable="false"')
    return re.sub(r'width="[\d.]+" height="[\d.]+" ', "", s, count=1)


def footer_logo():
    """Footer logo: BlueX primary, reversed."""
    s = svg_inner("bluex-primary-reversed.svg")
    s = s.replace('role="img"', 'aria-hidden="true" focusable="false"')
    return re.sub(r'width="[\d.]+" height="[\d.]+" ', "", s, count=1)


def x_layers_svg():
    """The BlueX X as two stacked SVG layers (static and CSS-3D fallback for the hero)."""
    vb = 'viewBox="-6 -6 134 107"'
    d = lambda pts: "M" + " L".join(f"{x} {y}" for x, y in pts) + "Z"
    layer = lambda cls, pts, fill: (f'<svg class="mark-layer {cls}" {vb} aria-hidden="true" focusable="false">'
                                    f'<path fill="{fill}" d="{d(pts)}"/></svg>')
    return layer("mark-blue", GEO["blue"], GEO["colors"]["blue"]) + layer("mark-green", GEO["green"], GEO["colors"]["green"])


X_SVG = ('<svg class="x-device" viewBox="0 0 122 95" aria-hidden="true" focusable="false">'
         '<path class="x-blue" fill="#2357FF" d="M0 0 H34 L78 54 L45 95 H10 L43 54 Z"/>'
         '<path class="x-green" fill="#22CE5E" d="M88 0 H122 L79 54 L112 95 H78 L45 54 Z"/></svg>')


# ------------------------------------------------------------------ articles
def load_articles():
    out = []
    folder = os.path.join(SRC, "insights")
    for fn in sorted(os.listdir(folder)):
        if not fn.endswith(".md") or fn.startswith("_") or fn.lower() == "readme.md":
            continue
        raw = read(os.path.join(folder, fn))
        m = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", raw, re.S)
        if not m:
            sys.exit(f"{fn}: missing front matter (--- title/date/author/summary ---)")
        meta = {}
        for line in m.group(1).splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip().lower()] = v.strip().strip('"')
        for key in ("title", "date", "summary"):
            if key not in meta:
                sys.exit(f"{fn}: front matter needs '{key}'")
        if meta.get("draft", "").lower() in ("true", "yes"):
            continue
        if markdown is None:
            sys.exit("Articles need the markdown package: pip install markdown")
        date = dt.date.fromisoformat(meta["date"])
        slug = meta.get("slug") or re.sub(r"[^a-z0-9]+", "-", os.path.splitext(fn)[0].lower()).strip("-")
        body = markdown.markdown(m.group(2), extensions=["extra", "smarty", "sane_lists"])
        words = len(re.sub(r"<[^>]+>", " ", body).split())
        out.append({"title": meta["title"], "date": date, "author": meta.get("author", "Bluechip Experience Limited"),
                    "series": meta.get("series", "Insights"), "minutes": max(1, round(words / 230)),
                    "summary": meta["summary"], "slug": slug, "body": body})
    out.sort(key=lambda a: a["date"], reverse=True)
    return out


ARTICLES = load_articles()
SHOW_INSIGHTS = len(ARTICLES) >= int(CFG.get("insights_min_articles", 3))


def human_date(d):
    return f"{d.day} {d.strftime('%B %Y')}"


# ------------------------------------------------------------------ chrome
def head(title, desc, root, path, extra_head="", noindex=False):
    url = CFG["site_url"].rstrip("/") + "/" + ("" if path == "index.html" else path)
    full_title = title if title.startswith("Bluechip Experience Limited") else f"{title} | Bluechip Experience Limited"
    org = {
        "@context": "https://schema.org", "@type": "Organization",
        "name": CFG["legal_name"], "alternateName": ["BlueX"], "url": CFG["site_url"],
        "logo": CFG["site_url"] + "/assets/brand/icon-512.png", "email": CFG["email"],
        "telephone": CFG["phone_href"], "foundingDate": CFG["incorporated_iso"],
        "identifier": {"@type": "PropertyValue", "propertyID": "CAC RC number", "value": CFG["rc"]},
        "address": {"@type": "PostalAddress", "streetAddress": ", ".join(CFG["address_lines"][:2]),
                    "addressLocality": "Surulere, Lagos", "addressCountry": "NG"},
    }
    robots = '<meta name="robots" content="noindex">' if noindex else ""
    return f"""<!doctype html>
<html lang="en-NG">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(full_title)}</title>
<meta name="description" content="{esc(desc)}">
{robots}<link rel="canonical" href="{esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Bluechip Experience Limited">
<meta property="og:title" content="{esc(full_title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{esc(url)}">
<meta property="og:image" content="{CFG['site_url']}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#101D3A">
<script>document.documentElement.classList.add("js")</script>
<link rel="icon" href="{root}favicon.svg" type="image/svg+xml">
<link rel="icon" href="{root}favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="{root}apple-touch-icon.png">
<link rel="alternate" type="application/rss+xml" title="Bluechip Experience Limited Insights" href="{root}feed.xml">
<link rel="preload" href="{root}assets/fonts/inter-latin-opsz.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{root}assets/css/site.css">
<script type="application/ld+json">{json.dumps(org, separators=(",", ":"))}</script>
{extra_head}<script defer src="{root}assets/js/site.js"></script>
</head>
"""


def header(active, root):
    items = []
    for key, label, href in NAV:
        if key == "insights" and not SHOW_INSIGHTS:
            continue
        cur = ' aria-current="page"' if key == active else ""
        items.append(f'<li><a href="{root}{href}"{cur}>{label}</a></li>')
    return f"""<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap header-row">
    <a class="brand" href="{root}index.html" aria-label="Bluechip Experience Limited, home">{header_logo()}</a>
    <nav class="site-nav" aria-label="Main">
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-list">Menu</button>
      <ul id="nav-list" class="nav-list">
        {''.join(items)}
      </ul>
    </nav>
  </div>
</header>
<main id="main">
"""


def footer(root):
    socials = [(k, v) for k, v in CFG.get("socials", {}).items() if v]
    soc = ""
    if socials:
        soc = ('<div class="foot-col"><h2 class="foot-h">Follow</h2><ul class="foot-list">' +
               "".join(f'<li><a href="{esc(v)}" rel="me noopener" target="_blank">{esc(k)}</a></li>' for k, v in socials) +
               "</ul></div>")
    nav = "".join(f'<li><a href="{root}{h}">{l}</a></li>' for k, l, h in NAV if k != "insights" or SHOW_INSIGHTS)
    addr = "<br>".join(esc(x) for x in CFG["address_lines"])
    year = TODAY.year
    return f"""</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="foot-top">
      <a class="brand brand-rev" href="{root}index.html" aria-label="Bluechip Experience Limited, home">{footer_logo()}</a>
      <p class="foot-line">We build businesses. We invest in opportunity. We operate for the long term.</p>
    </div>
    <div class="foot-grid">
      <div class="foot-col"><h2 class="foot-h">Company</h2><ul class="foot-list">{nav}</ul></div>
      <div class="foot-col"><h2 class="foot-h">Contact</h2>
        <ul class="foot-list">
          <li><a href="mailto:{CFG['email']}">{CFG['email']}</a></li>
          <li><a href="tel:{CFG['phone_href']}">{CFG['phone_display']}</a></li>
          <li><address>{addr}</address></li>
        </ul>
      </div>
      {soc}
      <div class="foot-col"><h2 class="foot-h">Company details</h2>
        <ul class="foot-list foot-legal">
          <li>{CFG['legal_name']}</li>
          <li>RC {CFG['rc']}</li>
          <li>Incorporated in Nigeria on {CFG['incorporated']}</li>
          <li><a href="{root}privacy.html">Privacy notice</a></li>
        </ul>
      </div>
    </div>
    <p class="foot-copy">&copy; {year} {CFG['legal_name']}.</p>
  </div>
</footer>
</body>
</html>
"""


# ------------------------------------------------------------------ generated blocks
def biz_rows(root):
    rows = []
    for b in CFG["businesses"]:
        chip = '<span class="chip">In development</span>' if b["status"] == "dev" else ""
        ext = ""
        if b["status"] == "live" and b.get("url"):
            dom = re.sub(r"^https?://(www\.)?", "", b["url"]).rstrip("/")
            ext = f'<a class="biz-ext" href="{esc(b["url"])}" target="_blank" rel="noopener">{esc(dom)}</a>'
        rows.append(f"""<li class="biz">
  <div class="biz-name"><h3><a href="{root}businesses.html#{b['id']}">{esc(b['name'])}</a></h3><p class="biz-sector">{esc(b['sector'])}</p>{chip}</div>
  <p class="biz-sum">{esc(b['summary'])}</p>
  <div class="biz-link">{ext}</div>
</li>""")
    return '<ol class="biz-list" role="list">' + "\n".join(rows) + "</ol>"


def biz_sections(root):
    out = []
    for i, b in enumerate(CFG["businesses"]):
        chip = '<span class="chip">In development</span>' if b["status"] == "dev" else ""
        paras = "".join(f"<p>{esc(p)}</p>" for p in b["detail"])
        actions = []
        if b["status"] == "live" and b.get("url"):
            dom = re.sub(r"^https?://(www\.)?", "", b["url"]).rstrip("/")
            actions.append(f'<a class="btn btn-ghost" href="{esc(b["url"])}" target="_blank" rel="noopener">Visit {esc(dom)}</a>')
        if b.get("cta"):
            actions.append(f'<a class="btn btn-ghost" href="{root}{b["cta"]["href"]}">{esc(b["cta"]["label"])}</a>')
        act = f'<p class="actions">{"".join(actions)}</p>' if actions else ""
        out.append(f"""<section class="biz-detail" id="{b['id']}" aria-labelledby="{b['id']}-h">
  <div class="biz-detail-head">
    <h2 id="{b['id']}-h">{esc(b['name'])}</h2>
    <p class="biz-sector">{esc(b['sector'])}</p>{chip}
  </div>
  <div class="biz-detail-body prose">{paras}{act}</div>
</section>""")
    return "\n".join(out)


def article_list(root):
    if not ARTICLES:
        return '<p class="empty">The first articles are being written. They will appear here.</p>'
    items = []
    for a in ARTICLES:
        items.append(f"""<li class="post">
  <p class="post-date"><time datetime="{a['date'].isoformat()}">{human_date(a['date'])}</time><br>{a['minutes']} min read</p>
  <h2 class="post-title"><a href="{root}insights/{a['slug']}.html">{esc(a['title'])}</a></h2>
  <p class="post-sum">{esc(a['summary'])}</p>
  <p class="post-by">By {esc(a['author'])}</p>
</li>""")
    return '<ol class="post-list" role="list">' + "".join(items) + "</ol>"


def newsletter_block():
    action = CFG.get("newsletter_action", "").strip()
    if not action:
        return ""
    field = CFG.get("newsletter_email_field", "email")
    return f"""<section class="newsletter" aria-labelledby="nl-h">
  <h2 id="nl-h">Get new articles by email</h2>
  <p>One email when we publish. No other use of your address. Unsubscribe from any email.</p>
  <form class="nl-form" action="{esc(action)}" method="post" target="_blank">
    <label for="nl-email">Email address</label>
    <div class="nl-row"><input id="nl-email" name="{esc(field)}" type="email" autocomplete="email" required>
    <button class="btn" type="submit">Subscribe</button></div>
    <p class="fine">By subscribing you agree to receive these emails. See our <a href="privacy.html">privacy notice</a>.</p>
  </form>
</section>"""


def tokens(text, root):
    rep = {
        "%%ROOT%%": root,
        "%%EMAIL%%": CFG["email"],
        "%%PHONE%%": CFG["phone_display"],
        "%%PHONE_HREF%%": CFG["phone_href"],
        "%%ADDRESS%%": "<br>".join(esc(x) for x in CFG["address_lines"]),
        "%%ADDRESS_LINE%%": esc(", ".join(CFG["address_lines"])),
        "%%MAPS%%": esc(CFG["maps_url"]),
        "%%RC%%": CFG["rc"],
        "%%INCORP%%": CFG["incorporated"],
        "%%LEGAL%%": CFG["legal_name"],
        "%%FORMSPREE%%": esc(CFG.get("formspree_id", "")),
        "%%X_LAYERS%%": x_layers_svg(),
        "%%X_DEVICE%%": X_SVG,
        "%%BIZ_ROWS%%": biz_rows(root),
        "%%BIZ_SECTIONS%%": biz_sections(root),
        "%%ARTICLES%%": article_list(root),
        "%%NEWSLETTER%%": newsletter_block(),
        "%%BLUEX_LOCKUP%%": svg_inner("bluex-primary-reversed.svg").replace('role="img"', 'role="img" aria-label="BlueX. Opportunity, structured."'),
        "%%UPDATED%%": human_date(TODAY),
    }
    for k, v in rep.items():
        text = text.replace(k, v)
    left = re.findall(r"%%[A-Z_]+%%", text)
    if left:
        sys.exit(f"Unknown tokens: {left}")
    return text


# ------------------------------------------------------------------ pages
def build_pages():
    built = []
    folder = os.path.join(SRC, "pages")
    for fn in sorted(os.listdir(folder)):
        if not fn.endswith(".html"):
            continue
        raw = read(os.path.join(folder, fn))
        m = re.match(r"^<!--\s*\n(.*?)\n-->\s*\n(.*)$", raw, re.S)
        meta = dict(l.split(":", 1) for l in m.group(1).splitlines() if ":" in l)
        meta = {k.strip(): v.strip() for k, v in meta.items()}
        body = m.group(2)
        root = ""
        extra = ""
        if meta.get("hero3d") == "yes":
            extra = f'<script defer src="{root}assets/js/hero3d.js"></script>\n'
        noindex = meta.get("noindex") == "yes" or (fn == "insights.html" and not SHOW_INSIGHTS)
        page = head(meta["title"], meta["description"], root, fn, extra, noindex) + header(meta.get("nav", ""), root) + \
            tokens(body, root) + footer(root)
        if fn == "404.html":  # served from any path, so links must be absolute
            page = re.sub(r'(href|src)="(?!https?:|mailto:|tel:|#|/)([^"]*)"', r'\1="/\2"', page)
        write(fn, page)
        if not noindex:
            built.append(fn)
    return built


def build_articles():
    for a in ARTICLES:
        root = "../"
        path = f"insights/{a['slug']}.html"
        body = f"""<article class="article">
  <header class="wrap article-head">
    <p class="article-meta"><a href="{root}insights.html">{esc(a['series'])}</a></p>
    <h1>{esc(a['title'])}</h1>
    <p class="lead">{esc(a['summary'])}</p>
    <p class="article-by">By {esc(a['author'])}. <time datetime="{a['date'].isoformat()}">{human_date(a['date'])}</time>. {a['minutes']} min read</p>
  </header>
  <div class="wrap"><div class="prose article-body">{a['body']}</div></div>
</article>
{newsletter_block()}"""
        write(path, head(a["title"], a["summary"], root, path) + header("insights", root) + body + footer(root))
    return [f"insights/{a['slug']}.html" for a in ARTICLES]


def build_redirects():
    for old, new in REDIRECTS.items():
        write(old, f"""<!doctype html>
<html lang="en-NG"><head><meta charset="utf-8"><title>Moved | Bluechip Experience Limited</title>
<meta name="robots" content="noindex"><link rel="canonical" href="{CFG['site_url']}/{new.split('#')[0]}">
<meta http-equiv="refresh" content="0; url={new}"></head>
<body><p>This page has moved to <a href="{new}">{new}</a>.</p></body></html>
""")


def build_feed():
    base = CFG["site_url"].rstrip("/")
    items = "".join(f"""
  <item>
    <title>{esc(a['title'])}</title>
    <link>{base}/insights/{a['slug']}.html</link>
    <guid>{base}/insights/{a['slug']}.html</guid>
    <pubDate>{format_datetime(dt.datetime.combine(a['date'], dt.time(8), tzinfo=dt.timezone(dt.timedelta(hours=1))))}</pubDate>
    <description>{esc(a['summary'])}</description>
  </item>""" for a in ARTICLES[:20])
    write("feed.xml", f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Bluechip Experience Limited Insights</title>
  <link>{base}/insights.html</link>
  <description>Notes on building and running businesses in Nigeria, from Bluechip Experience Limited.</description>
  <language>en-ng</language>{items}
</channel>
</rss>
""")


def build_seo(pages):
    base = CFG["site_url"].rstrip("/")
    urls = []
    for p in pages:
        if p == "insights.html" and not SHOW_INSIGHTS:
            continue
        loc = base + "/" + ("" if p == "index.html" else p)
        urls.append(f"  <url><loc>{loc}</loc><lastmod>{TODAY.isoformat()}</lastmod></url>")
    write("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
          + "\n".join(urls) + "\n</urlset>\n")
    write("robots.txt", f"User-agent: *\nAllow: /\n\nSitemap: {base}/sitemap.xml\n")


def build_hero3d():
    src = read(os.path.join(SRC, "hero3d.src.js"))
    geo = GEO
    write("assets/js/hero3d.js", src.replace("%%GEO%%", json.dumps(geo, separators=(",", ":"))))


if __name__ == "__main__":
    build_hero3d()
    pages = build_pages()
    pages += build_articles()
    build_redirects()
    build_feed()
    build_seo(pages)
    print(f"Built {len(pages)} pages, {len(ARTICLES)} articles, {len(REDIRECTS)} redirects. "
          f"Insights in menu: {'yes' if SHOW_INSIGHTS else 'no'}.")
