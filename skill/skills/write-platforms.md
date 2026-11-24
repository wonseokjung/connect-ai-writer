# Skill: write for each platform (from a video, subtitles, notes, a page, or a research folder)

1. Start: `CW start <source> --for threads,naver,x --voice <voice.md>`. Sources: a video (its .srt next to it, or `--srt my.srt`), `.srt`/`.vtt`/`.txt`/`.md`, a YouTube link (needs yt-dlp), the user's own page, or a research folder. It prints the run folder `out/<date>_<name>/` (a new folder each time; `--resume` continues the same one). The user's own photos or local pages: `--files a.jpg,page.html` (copied into the run folder; local files outside it are never used).
   - No voice sheet yet and the user has their own transcripts (lives, lectures)? `CW voice <files...> --name "<their name>" --out voice.md`, then `--voice voice.md`. Transcripts stay on their computer.
2. Read `brief.md`, `source/source.txt`, `source/voice.md`, and look at `source/frames.jpg` (sharp frames with their times) if there is a video.
3. Editorial brief first (skills/editorial-brief.md: reader, purpose, claims to keep, what may be public, next action), then plan (skills/plan-hooks.md), then write each `<platform>/post.md` (replace the `{{write}}` line). Every post keeps the brief's claims and ends with its next action:
   - Threads and X: posts separated by a line with only `---`. Blog platforms: `# Title`, `## Heading`, a picture between paragraphs, `keyword: ...`. Last line `tags: a, b`.
   - Pictures, one line each where the picture goes:
     `[image: frame 05:45 "caption"]`, `[image: quote "exact words from source.txt" 10:17]`, `[image: stat "15" "what it is" 11:49]`, `[image: title "headline" "small line"]`, `[image: steps "one" "two" "three"]`, `[image: page https://their.site "caption"]`, `[image: file photo.jpg "caption"]` (also a trends chart png).
   - The first post of a thread gets the best picture. Quote cards copy the words exactly. A caption is the user's words too.
   - A frame fills the card around the face (Apple Vision on a Mac). If the crop lost something, add `x=0.3` to that line.
4. Humanize (skills/humanize.md) if anything sounds written by an AI.
5. `CW build <run>`: pictures, checks, `preview.html` per platform, `index.html`, `sheet.jpg`, `post.txt`, `handoff/`. Fix every FIX line and build again. LOOK lines: fix them unless the user really talks like that. Look at `sheet.jpg` yourself.
6. Show `index.html` and the sheet; say nothing was posted.
7. Draft in the editor if the user wants: `CW post <run> --to threads` (or `naver`, `x`). It saves a draft and closes its own space; `--leave-open` keeps the editor open. Threads and Naver blog were tested on a live account (draft only); X is not yet, so say so.
8. Instagram, LinkedIn, Tistory, Brunch: the user posts from `preview.html` (copy button, pictures in `images/`), or hands `handoff/writer-package.json` to connect-ai-marketer.

Limits live in `platforms.json` with where each number came from. Threads 500 characters and 10 pictures; X 280 weighted (Korean letters count 2) and 4 pictures; LinkedIn 3,000; Instagram 2,200 and up to 5 hashtags.
