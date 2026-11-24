# NOTICE

connect-ai-writer is CONNECT AI LAB's code (MIT, see LICENSE). No third-party code is copied into it. The parts below are installed, called or used as a reference.

| Part | Source | Licence | How |
|---|---|---|---|
| `sharp` (and libvips) | lovell/sharp, npm | Apache-2.0 (libvips LGPL-3.0, prebuilt, dynamically linked) | Installed dependency: resizing, frame sharpness, contact sheet |
| `marked` | markedjs/marked, npm | MIT | Installed dependency: blog post.html |
| `@mozilla/readability` | mozilla/readability, npm | Apache-2.0 | Installed dependency: the article text of your own page |
| `linkedom` | WebReflection/linkedom, npm | ISC | Installed dependency: a light DOM for Readability |
| Chrome / Edge / Chromium | your own browser | its own licence | Called in headless mode for cards and page screenshots. Nothing is downloaded |
| `ffmpeg` / `ffprobe` | FFmpeg | LGPL-2.1+ or GPL, depending on the build | Optional. Called as a separate program for frames. Not bundled |
| `yt-dlp` | yt-dlp/yt-dlp | Unlicense (public domain) | Optional. Called as a separate program to read YouTube subtitles. Not bundled |
| Ego Lite (`ego-browser`) | lite.ego.app | its own terms | Optional. Called as a separate program for `post`. Not bundled |
| X weighted length rules | twitter/twitter-text v3 config | Apache-2.0 | Reference only: the weight ranges are re-implemented in `lib/check.mjs` (same as connect-ai-marketer's xcount) |
| Skill installer | connect-ai-motion / connect-ai-video-motion (CONNECT AI LAB) | MIT | Ours, reused |
| Banner, Ego Lite bridge pattern | connect-ai-product-photo, connect-ai-marketer (CONNECT AI LAB) | MIT | Ours, reused |
| `examples/` notes, page and posts | CONNECT AI LAB | MIT | Ours. They describe this tool only |
| `docs/showcase/*` | Frames and cards from AI Mentor Jay's own lesson video, made with this tool | All rights reserved | Showcase only; do not reuse |
| `docs/brand/jay.jpg` | AI Mentor Jay | All rights reserved | Brand image; do not reuse |

Fonts: cards use the fonts on your computer (theme `fontHeadline`, `fontBody`). No font is bundled. You can point `fontFiles` in your theme at font files you are allowed to use.

## Licence switch

The code is MIT today. If the owner moves to MIT with the Commons Clause, `node scripts/switch-license.mjs commons-clause` rewrites LICENSE and the `license` field in package.json in one step (`mit` switches back).
