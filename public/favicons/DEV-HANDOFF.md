# SatyaDheesh Favicon — Dev Handoff

The icon is the angled gavel on a cream tile (saffron #bf4a07, dark #120f0b, grey base #a39c92).
Pure vector — no font dependency, renders identically on every browser/OS.

## Files (in /favicons)
- `satyadheesh-gavel-angled.svg`  ← master, scalable, use as primary favicon
- `gavel-16.png`, `gavel-32.png`, `gavel-48.png`  ← classic favicon PNGs
- `gavel-180.png`  ← Apple touch icon (iOS home screen)
- `gavel-192.png`, `gavel-512.png`  ← Android / PWA manifest icons

## 1. Put the files in the site root (or /icons) and add to <head>:
```html
<link rel="icon" type="image/svg+xml" href="/favicons/satyadheesh-gavel-angled.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicons/gavel-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicons/gavel-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/favicons/gavel-180.png">
<link rel="manifest" href="/site.webmanifest">
```
(Modern browsers use the SVG; the PNGs are fallbacks for older ones and for iOS/Android.)

## 2. Add to site.webmanifest (for installable/PWA):
```json
{
  "icons": [
    { "src": "/favicons/gavel-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/favicons/gavel-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

## 3. (Optional) favicon.ico
Some legacy tooling still requests `/favicon.ico`. If your build wants one, generate it from `gavel-32.png` (any ICO converter, or a build plugin like `vite-plugin-favicon` / `favicons-webpack-plugin`).

## Notes
- Tell the dev to hard-refresh / bump a cache-buster — browsers cache favicons aggressively.
- The brand "hidden स = र + य" mark and other explorations are also in /favicons if you want them later.
