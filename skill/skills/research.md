# Skill: research (sources, dates, a fact sheet)

Method adapted from stanford-oval/storm (MIT) and assafelovic/gpt-researcher (Apache-2.0), in our own words.

1. `CW research "topic"` makes `out/<date>_<topic>-research/` with `questions.md`, `facts.md`, `sources/`.
2. Perspectives (questions.md): 3 to 5 people who would read this or know it (a beginner who just heard the word, someone doing it, a skeptic, someone paying for it). Each asks 2 to 4 questions, one at a time, no repeats.
3. Search each question in plain words (no site:, no quotes) with your own web search tool. Prefer recent and reliable pages (official docs, the original report, news with a date); keep a range of views, including the critical one. Add the pages: `CW research add <folder> <link> <link> ...` (also the user's own files, .srt, notes, or a YouTube link). It saves each page's text with its site, published and changed dates, and the day it was read.
4. Read the saved texts (`sources/S1.txt` ...), not your memory. Write `facts.md` under a `## Facts` heading: one fact per line, `- what the source says [S1]`. Copy numbers exactly as the source writes them ("1만3939", "84.6%"). "Quoted words" must be the source's own words. A fact from two sources: `[S1][S3]`. If no page answers a question, leave it out; do not fill gaps from memory.
5. `CW research check <folder>`: every number must be in the source it cites, every quote must be its words. Fix each FIX line. It writes `research.html` (facts with the source sentence behind each number, sources with dates).
6. Write from it: `CW start <research folder> --for naver,threads,newsletter` (see write-platforms.md). The brief tells you the rules: only facts and source texts, `[S1]` marks allowed (they show as [1]), articles and newsletters end with `## 출처` (or `## Sources`): one line per source used, title, site, date, link. `check` fails a link you did not read and an article without a sources section.

Do not: cite a page you did not add, mix up which source said what, or write "studies show" without the source.
