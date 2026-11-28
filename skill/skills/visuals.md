# Skill: visuals with our other AI agents

The writer makes cards and frames itself. For more, it works with the other CONNECT AI LAB agents when they are on the computer. `CW engines` shows which are found. It never installs or downloads them; if one is missing, tell the user the line to get it and go on without it.

- Motion graphics video of a post (connect-ai-motion, no footage): `CW motion <run> --from threads` writes `motion/threads/script.md` (one short line per scene, words and numbers only from the post) and a storyboard. Read the script as one story and improve it (a number line, a contrast, a closing line). Then `CW motion <run> --from threads --render` renders 16:9 and 9:16 (`--wide` for 16:9 only). It takes a few minutes; ask before rendering on a busy computer. `build` then shows the video in the preview and lists it in `handoff/`. For Reels, Shorts and Threads use the 9:16 file; for a blog the 16:9 one.
- Motion graphics on the user's own talking-head video: connect-ai-video-motion (`npx connect-ai-video-motion`), then use its output frames or clip with `[image: file ...]` or as the post's video.
- Product photos from one phone photo (white background, scenes): connect-ai-product-photo, when it is on the computer; use its pictures with `[image: file ...]`.
- Posting, replies, listening: connect-ai-marketer reads `handoff/writer-package.json`.
- A kit folder works too: `CAIW_MOTION_KIT=/path/to/connect-ai-motion` (and CAIW_VIDEO_MOTION_KIT, CAIW_PRODUCT_PHOTO_KIT, CAIW_MARKETER_KIT).
