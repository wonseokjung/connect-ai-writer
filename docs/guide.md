# connect-ai-writer guide

## Commands

| Command | What it does |
|---|---|
| `demo [folder]` | Example notes -> 5 platforms, pictures, previews. No video, no account |
| `start <source...> --for threads,naver,x` | Reads the source, makes `out/<date>_<name>/` with `brief.md`, `source/source.txt`, `source/frames.jpg` (video only) and one empty `post.md` per platform |
| `write [run] --writer "claude -p"` | Optional: a headless agent writes every `post.md`. Normally your agent in chat writes them |
| `build [run]` | Pictures, check, `preview.html`, `post.txt`, `post.json`, `post.html` (blogs), `index.html`, `sheet.jpg`, `handoff/` |
| `check [run]` | Text checks only, fast |
| `post [run] --to threads\|x\|naver` | Fills the editor in Ego Lite and stops before the post button |
| `voice <files...> --name "Name" --out voice.md` | Voice sheet from your own transcripts |
| `platforms`, `themes`, `doctor` | What is set up and ready |
| `install-skill`, `remove-skill` | The agent skill (Claude Code, Codex, Antigravity, Cursor) |

No `[run]` means the newest run folder under `./out`.

## Sources

- A video: its subtitles next to it with the same name, or `--srt my.srt` (same timeline as the video).
- `.srt`, `.vtt`, `.txt`, `.md`. A transcript plus `--video my.mp4` gives you frames too.
- A YouTube link: needs `yt-dlp`; reads the subtitles. `--download-video` also gets the video for frames (only for your own videos).
- A link to your own page: the article text (Mozilla Readability).
- Several sources in one run: list them all.

## post.md

```
# Title                                  blog platforms
## Heading                               blog platforms
Text in your own words.
[image: frame 05:45 "caption"]          sharpest frame near 05:45, never cropped
[image: quote "exact words" 10:17]      quote card, must be in the source
[image: stat "15" "label" 11:49]        number card, the number must be in the source
[image: title "headline" "small line"]  cover card
[image: steps "one" "two" "three"]      simple diagram (2 to 6 steps)
[image: page https://your.site "cap"]   screenshot of your own page (or a local .html)
[image: file photo.jpg "caption"]       your own picture
[image: gen "prompt"]                   only with your own image hook turned on
---                                      next post of a thread (Threads, X)
tags: one, two
```

## Settings in your project folder (all optional)

- `platforms.json`, `rules.json`, `banned.json`: copy from the package and change. Yours win.
- `theme.json`: colors, fonts, `brand` (the small line on every card). `--theme paper` for the light theme.
- `writer.config.json`:
  ```json
  {"name": "Your name", "handle": "yourhandle", "avatar": "me.jpg",
   "writer": {"command": "claude -p"},
   "imageHook": {"enabled": false, "command": "my-image-tool --prompt {prompt} --out {out} --size {w}x{h}"}}
  ```
  The image hook is off by default. When it is on, `check` still warns on every generated picture.

## Check rules (rules.json)

`numbersInSource`, `quotesInSource`, `limits`, `bannedPhrases`, `emoji`, `cornerBrackets`, `emDash`, `noImages`, `placeholder` fail by default. `claimWords`, `watchPhrases`, `firstPartImage`, `generatedImages` warn. Set any rule to `"fail"`, `"warn"` or `"off"`. `allowNumbers` lists numbers that may appear without being in the source.

## post (Ego Lite)

- Log in to each platform yourself in Ego Lite first. The tool never logs in and never types a password or a code.
- Each run makes its own new task space and closes it at the end. It never touches another space.
- Default: fill, screenshot, save as a draft (Threads, X: the close-and-save dialog; Naver: the 저장 button), close.
- `--leave-open`: keep the filled editor open for you. `--no-save`: do not press save.
- `--publish`: asks you to type the platform name in the terminal, then presses the post button. Naver publishing stays manual (its publish panel).
- Tested on a live account: Threads (draft). X and Naver: written, not yet tested on a live account.

## Hand-off

`handoff/marketer-post.json` is in connect-ai-marketer's `post.json` shape (the first post per channel, text). `handoff/writer-package.json` has every post, every picture path and `status: needs human OK`.
