# NOTICE

connect-ai-writer is source available by CONNECT AI LAB under MIT with the Commons Clause: free to use, change and share, not for resale (see LICENSE). No third-party code is copied into it. The parts below are installed, called or used as a reference. For every borrowed method there is a link to the exact file at the exact commit we read, and where it is applied here.

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
| X weighted length rules | [twitter/twitter-text config/v3.json](https://github.com/twitter/twitter-text/blob/30e2430d90cff3b46393ea54caf511441983c260/config/v3.json) | Apache-2.0 | Reference only: the weight ranges are re-implemented in `lib/check.mjs` (`xLength`), same as connect-ai-marketer's xcount |
| Skill installer | connect-ai-motion / connect-ai-video-motion (CONNECT AI LAB) | MIT | Ours, reused |
| Banner, Ego Lite bridge pattern | connect-ai-product-photo, connect-ai-marketer (CONNECT AI LAB) | MIT | Ours, reused |
| Research method | stanford-oval/storm (fb951af7): [persona_generator.py](https://github.com/stanford-oval/storm/blob/fb951af7744dab086e34962e9bc6fe878e145f83/knowledge_storm/storm_wiki/modules/persona_generator.py), [knowledge_curation.py](https://github.com/stanford-oval/storm/blob/fb951af7744dab086e34962e9bc6fe878e145f83/knowledge_storm/storm_wiki/modules/knowledge_curation.py), [outline_generation.py](https://github.com/stanford-oval/storm/blob/fb951af7744dab086e34962e9bc6fe878e145f83/knowledge_storm/storm_wiki/modules/outline_generation.py), [article_generation.py](https://github.com/stanford-oval/storm/blob/fb951af7744dab086e34962e9bc6fe878e145f83/knowledge_storm/storm_wiki/modules/article_generation.py), [article_polish.py](https://github.com/stanford-oval/storm/blob/fb951af7744dab086e34962e9bc6fe878e145f83/knowledge_storm/storm_wiki/modules/article_polish.py) | MIT | Method only: perspectives, questions, grounded answers, two-pass outline, cited sections, lead. Rewritten in our words in `skill/skills/research.md`; the fact sheet and its check in `lib/research.mjs` |
| Research source rules | assafelovic/gpt-researcher (9d39a2f8): [prompts.py](https://github.com/assafelovic/gpt-researcher/blob/9d39a2f86d55e264f69dfeff2365f27fad3c1144/gpt_researcher/prompts.py), [skills/curator.py](https://github.com/assafelovic/gpt-researcher/blob/9d39a2f86d55e264f69dfeff2365f27fad3c1144/gpt_researcher/skills/curator.py) | Apache-2.0 | Rules only: broad sources, recent and reliable first, never cite what was not read. Applied in `skill/skills/research.md` and the sources check in `lib/check.mjs` (`shapeFindings`) |
| Hooks, titles, email rules, edit sweeps | coreyhaines31/marketingskills (8fd2fcad): [copywriting](https://github.com/coreyhaines31/marketingskills/blob/8fd2fcade2fd6629026e9dfe6d133b55b36968b9/skills/copywriting/SKILL.md), [emails](https://github.com/coreyhaines31/marketingskills/blob/8fd2fcade2fd6629026e9dfe6d133b55b36968b9/skills/emails/SKILL.md), [copy-editing](https://github.com/coreyhaines31/marketingskills/blob/8fd2fcade2fd6629026e9dfe6d133b55b36968b9/skills/copy-editing/SKILL.md), [social](https://github.com/coreyhaines31/marketingskills/blob/8fd2fcade2fd6629026e9dfe6d133b55b36968b9/skills/social/SKILL.md) | MIT | Ideas only, in `skill/skills/plan-hooks.md`, `newsletter-article.md`, `edit-factcheck.md`; the hook, title and subject checks in `lib/check.mjs` (`shapeFindings`) and `lib/plan.mjs` |
| Humanize families and process | blader/humanizer (a32f2440): [SKILL.md](https://github.com/blader/humanizer/blob/a32f24407364c74c812b43c15926d638bee1e072/SKILL.md) | MIT | Ideas only (its list draws on a Wikipedia page under CC BY-SA, so no wording was taken). Our own patterns in `humanize.json`, applied by `lib/humanize.mjs` and `skill/skills/humanize.md` |
| Korean translationese kinds | nathankim0/humanize-korean (b51aa598): [references/ai-tell-rulebook.md](https://github.com/nathankim0/humanize-korean/blob/b51aa5985be0a94a645788f1395b29a118bc9c33/humanize-korean/references/ai-tell-rulebook.md) | MIT | The eight kinds as a guide; our own patterns and hints in `humanize.json` (ko) |
| Picture-book method | weaiw/storybook-generator-skill (72d30ecd): [SKILL.md](https://github.com/weaiw/storybook-generator-skill/blob/72d30ecd51d12986738db6d4f40d79cd7fa6358a/SKILL.md) | MIT | Method only: one action per page, text-picture contract, echo ending, no preaching. Applied in `skill/skills/story.md` and the story check in `lib/story.mjs` |
| Google Trends interest flow | GeneralMills/pytrends (a9984ffd): [pytrends/request.py](https://github.com/GeneralMills/pytrends/blob/a9984ffdc9b31d853dde2ab614a77ecbf2bf33a1/pytrends/request.py) | Apache-2.0 | The request flow (explore, then the widget token), re-implemented in `lib/trends.mjs` |
| Skill folder layout | anthropics/skills (e4bb5d96): [skill-creator/SKILL.md](https://github.com/anthropics/skills/blob/e4bb5d960d87126ff3b3a8af1a104b7db67560ba/skills/skill-creator/SKILL.md), [spec](https://github.com/anthropics/skills/blob/e4bb5d960d87126ff3b3a8af1a104b7db67560ba/spec/agent-skills-spec.md) | Apache-2.0 | Reference for a router `skill/SKILL.md` with sub-skill files in `skill/skills/` |
| Wikipedia page views | Wikimedia REST API | data CC0 | Read with no key |
| Trending feed, search suggestions | Google Trends RSS, Google / YouTube / Naver suggest | each service's terms | Read with no key, a few requests per run |
| Picture-book illustrations | `lib/scenes.mjs` (CONNECT AI LAB) | ours (this licence) | Ours: animals, things and skies drawn in code. No people |
| Other agents | connect-ai-motion, connect-ai-video-motion, connect-ai-product-photo, connect-ai-marketer (CONNECT AI LAB) | MIT | Optional engines, found if installed, never bundled |
| `examples/` notes, page and posts | CONNECT AI LAB | ours (this licence) | Ours. They describe this tool only |
| Editorial brief | ordinary editorial practice (a creative brief before writing) | none | No source copied; the five sections and their checks are ours, in `lib/brief.mjs` and `skill/skills/editorial-brief.md` |
| `docs/showcase/*` | Frames and cards from AI Mentor Jay's own lesson video, made with this tool | All rights reserved | Showcase only; do not reuse |
| `docs/brand/jay.jpg` | AI Mentor Jay | All rights reserved | Brand image; do not reuse |

Fonts: cards use the fonts on your computer (theme `fontHeadline`, `fontBody`). No font is bundled. You can point `fontFiles` in your theme at font files you are allowed to use.

## Licence

MIT with the Commons Clause (see LICENSE). That makes it source available, not "open source" in the OSI sense: you may use, change and share it, and use it for your own business and channels. You may not Sell it, which the Commons Clause defines as giving others, for a fee, a product or service whose value comes entirely or substantially from this software (for example selling the tool, paid access to it, or a paid course or hosting built mainly on it). What you write with it is yours.

The installed and called parts above keep their own licences.
