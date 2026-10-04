# Insights articles

Each article is one Markdown file in this folder. The file name becomes the web address:
`why-documents-come-first.md` is published at `/insights/why-documents-come-first.html`.

Start every file with this header:

```
---
title: Why documents come first
date: 2026-11-04
author: Jimi Adewole
summary: One or two sentences shown on the Insights page and in the newsletter.
draft: false
---

The article, written in Markdown. Use ## for subheadings.
```

Set `draft: true` to keep an article out of the site while it is being written.

Then run `python3 _source/build.py` from the site folder and publish the changes.
Insights appears in the menu once three articles are published (see `insights_min_articles` in `config.json`).
Files starting with `_` are ignored.
