# Nazik Downloader

A free, browser-based tool for saving public videos from TikTok, YouTube, Instagram and Facebook. Built with plain HTML, CSS and JavaScript. No framework and no build step.

Live site: [https://nazik-downloader.pages.dev](https://nazik-downloader.pages.dev)

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Homepage with the downloader |
| `download-tiktok-video.html` | TikTok guide and downloader |
| `download-youtube-video.html` | YouTube guide and downloader |
| `download-instagram-reels.html` | Instagram guide and downloader |
| `download-facebook-video.html` | Facebook guide and downloader |
| `about/`, `privacy/`, `terms/` | Info and legal pages |
| `404.html` | Not-found page |
| `style.css`, `app.js` | Shared styles and script |
| `sitemap.xml`, `robots.txt`, `_headers` | Search and hosting files |

## Run locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy

Connect the repository to Cloudflare Pages with no build command and an empty output directory.

## License

Released under the [MIT License](LICENSE).

Developed by Ghullam Nazik Mastoi.
