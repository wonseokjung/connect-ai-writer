# connect-ai-writer guide

## Commands

| Command | What it does |
|---|---|
| `demo [folder]` | Example notes -> 5 platforms, pictures, previews. No video, no account. Without Chrome the posts, checks and previews are still made |
| `start <source...> --for threads,naver,x` | Reads the source, makes a new `out/<date>_<name>/` (same name again: `-2`; `--resume` to continue one) with `brief.md`, `source/source.txt`, `source/frames.jpg` (video only) and one empty `post.md` per platform. `--for all,newsletter` works. `--files a.jpg,page.html` copies your own pictures/pages in |
| `brief [run]` / `brief [run] --check` | The editorial brief: reader, purpose, claims to keep, what may be public, the next action. `--check` checks every claim's numbers, quotes and up/down words against the source and writes `editorial-brief.html`. `plan` and `write` use it |
| `write [run] --writer "claude -p"` | Optional: a headless agent writes every `post.md`. Normally your agent in chat writes them |
| `build [run]` | Pictures, check, `preview.html`, `post.txt`, `post.json`, `post.html` (blogs), `check.json` (the check result, sealed), `index.html`, `sheet.jpg`, `handoff/`. `--no-pictures` (or no Chrome): text, checks and previews only, each missing picture listed with why |
| `check [run]` | Text checks only, fast |
| `post [run] --to threads\|x\|naver` | Fills the editor in your browser (ELDO, or Ego Lite) and saves a draft. Only a draft that `build` checked and that has not changed since. `--publish` presses publish too |
| `voice <files...> --name "Name" --out voice.md` | Voice sheet from your own transcripts |
| `trends "words" --listen x,threads` | Google Trends feed and interest, search suggestions (Google, YouTube, Naver), Wikipedia views, and optional read-only listening on X, Threads and YouTube through your browser. `trends.html`, `ideas.md`, charts. Naver DataLab only with `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` |
| `research "topic" <links or files...>` | Reads each source with its date into `out/<date>_<topic>-research/`, plus a `questions.md` and a `facts.md` to fill. `research add`, `research check` (every fact traced to a source sentence, `research.html`) |
| `start <research folder> --for naver,newsletter` | Posts from the fact sheet: numbers, quotes and links are checked against it, and blog posts need a sources section |
| `plan [run] --score` | Titles and first lines to choose from, scored |
| `story "idea" --age 7` | A picture book: `story.md` with a scene line per page. `build <story folder>` makes `book.html`, page pictures, `sheet.jpg` and `book.pdf` |
| `humanize <file> --after <rewrite>` | Marks AI tells (Korean translationese, English stock phrases); with `--after`, a before/after page and a check that every number, quote, name and up/down word was kept |
| `check [run] --trace` | Where every number in each post comes from. The check covers numbers, quotes and direction words (늘었다/줄었다, more/less next to the same number), not every meaning |
| `motion [run] --from threads --render` | A motion graphics video of the post by connect-ai-motion, if installed (`--wide` for 16:9 only) |
| `engines` | Our other AI agents (motion, video-motion, product-photo, marketer), found or how to get them |
| `platforms`, `themes`, `doctor` | What is set up and ready |
| `install-skill`, `remove-skill` | The agent skill (Claude Code, Codex, Antigravity, Cursor) |

No `[run]` means the newest run folder under `./out`.

## Sources

- A video: its subtitles next to it with the same name (`my.mp4` + `my.srt`), or `--srt my.srt` (same timeline as the video). From YouTube: YouTube Studio > Subtitles > the language > ... > Download > .srt.
- `.srt`, `.vtt`, `.txt`, `.md`. A transcript plus `--video my.mp4` gives you frames too.
- A YouTube link: needs `yt-dlp`; reads the subtitles. `--download-video` also gets the video for frames (only for your own videos).
- A link to your own page: the article text (Mozilla Readability).
- Several sources in one run: list them all.

## post.md

```
# Title                                  blog platforms
## Heading                               blog platforms
Text in your own words.
[image: frame 05:45 "caption"]          sharpest frame near 05:45, fills the picture, face kept whole (x=0.3 to choose where to look)
[image: quote "exact words" 10:17]      quote card, must be in the source
[image: stat "15" "label" 11:49]        number card, the number must be in the source
[image: title "headline" "small line"]  cover card
[image: steps "one" "two" "three"]      simple diagram (2 to 6 steps)
[image: page https://your.site "cap"]   screenshot of your own page (or a local .html in the run folder)
[image: file photo.jpg "caption"]       your own picture, in the run folder (start --files photo.jpg copies it in)
[image: gen "prompt"]                   only with your own image hook turned on
---                                      next post of a thread (Threads, X)
tags: one, two
```

## Settings in your project folder (all optional)

- `platforms.json`, `rules.json`, `banned.json`: copy from the package and change. Yours win.
- `theme.json`: colors, fonts, `brand` (the small line on every card). `--theme paper` for the light theme.
- `writer.config.json` in a project folder: `{"name": "Your name", "handle": "yourhandle", "avatar": "me.jpg"}`. It cannot set commands: `writer` and `imageHook` in a project file are ignored (doctor says so), so a folder you downloaded cannot run anything on your computer.

## Your own settings (commands)

`~/.connect-ai/connect-ai-writer/writer.config.json` (or `$CONNECT_AI_HOME/connect-ai-writer/`) is the only place for commands:

```json
{"writer": {"command": ["claude", "-p"], "passEnv": []},
 "imageHook": {"enabled": false, "command": ["my-image-tool", "--out", "{out}", "--size", "{w}x{h}"], "passEnv": ["MY_IMAGE_KEY"]}}
```

They run without a shell: the command is split into words once, `{out}`, `{w}`, `{h}` fill whole words, and the prompt goes in on stdin (never in the arguments). The program sees only PATH, HOME, the locale and temp folders, plus the variables you list in `passEnv`. The image hook is off by default; when it is on, `check` still warns on every generated picture.

## Where the kit lives

`install-skill` copies the kit to `~/.connect-ai/connect-ai-writer/<version>/` and runs `npm ci --omit=dev` there, so the skill keeps working when npm cleans its npx cache. `SKILL.md` and `.connect-ai-writer.json` in your agent's skills folder name that full path, plus a pinned `npx github:wonseokjung/connect-ai-writer#<commit>` line if the folder is ever gone. `--no-runtime` skips the copy.

## Check rules (rules.json)

`numbersInSource`, `quotesInSource`, `directionInSource`, `limits`, `bannedPhrases`, `emoji`, `cornerBrackets`, `emDash`, `noImages`, `placeholder` fail by default. `claimWords`, `watchPhrases`, `firstPartImage`, `generatedImages` warn. Set any rule to `"fail"`, `"warn"` or `"off"`. `allowNumbers` lists numbers that may appear without being in the source.

## post (ELDO or Ego Lite)

- Which browser: ELDO (`cab`) when it is installed, else Ego Lite. To choose, put `"browser": "cab"` or `"ego"` in `~/.connect-ai/connect-ai-writer/writer.config.json`, or set `CONNECT_AI_BROWSER=cab|ego`. Install cab once: [eldobrowser.com](https://eldobrowser.com) (free macOS / Windows).
- In ELDO the writer works as the agent `writer`, in a new space named for the job (글쓰기 AI 에이전트 threads 초안 10:30). The plan panel shows each step while the window is on screen.
- Log in to each platform yourself in that browser first. The tool never logs in and never types a password or a code.
- Each run makes its own new task space and closes it at the end. It never touches another space.
- Default: fill, screenshot, save as a draft (Threads, X: the close-and-save dialog; Naver: the 저장 button), close.
- Before anything is sent it shows the platform, the account, the title, the number of posts and pictures.
- It only takes a draft whose `check.json` passed and whose `post.md`, `post.json` and pictures have not changed since `build`.
- `--leave-open`: keep the filled editor open for you. `--no-save`: do not press save. `--drafts-shot` (Naver): also a screenshot of your drafts list.
- `--publish`: press the platform's publish button too and report the link. Your agent adds it when you say "publish it".
- Naver's 작성 중인 글 popup (an unfinished post): it presses nothing, leaves the editor open in the browser and stops (exit 5). You choose 확인 or 취소, then run it again.
- Exit codes: 0 done, 1 error, 3 logged out, 4 no post box found, 5 waiting for you.
- Tested on a live account: Threads and Naver (drafts). X: written, not yet tested on a live account.

## Hand-off

`handoff/marketer-post.json` is in connect-ai-marketer's `post.json` shape (the first post per channel, text). `handoff/writer-package.json` has every post, every picture path (relative to the run folder, no home folder in it), the newsletter subject and preview, and `status: needs human OK`.
