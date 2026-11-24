# Skill: picture book (동화)

Method adapted from weaiw/storybook-generator-skill (MIT), in our own words. Illustrations are drawn by code (lib/scenes.mjs): animals and things only, never people, no image model, nothing to download.

1. From one sentence ("우리 아이 잠자리 동화 써 줘, 7살, 공룡"): `CW story "7살, 공룡, 잠자리 동화" --age 7 --title "<title>"`. Ages 3 to 8. It makes `out/<date>_<title>-story/` with `brief.md` (how much text a page holds for that age) and `story.md`.
2. Before writing, five lines only for you: who wants what; the fun rule of this world; the first try that fails or is misunderstood; the discovery, shown not told; the warm change at the end that echoes the first page.
3. story.md: a head (`# Title`, `age:`, `lang:`, `mood: bedtime` if it is one, `for: <child's name>` if the user gave it, `cover: [scene: ...]`), then pages separated by `---`. Each page: one `[scene: ...]` line and the page text.
   - Each page has one action, one discovery, one feeling change or one choice. A page that can go without changing the story gets merged.
   - End pages so the child wants to turn: an unfinished action, a question, a sound.
   - A line the child can say along, changed a little each time. Never end with a lesson; show the hero doing the new thing.
   - Bedtime: slower and softer toward the end, the last page quiet.
4. Scene line: `[scene: <backdrop> <things> | <animal>:<color>:<mood>:<place>:<size> ...]`.
   Backdrops: day night sunset space sea forest room snow rain. Things: moon stars star-big sun cloud rainbow comet planet rocket mountain volcano hill tree pine house flower egg bed lamp book boat blanket snowflakes raindrops. Animals: dino rabbit bear cat owl whale fish bird robot. Colors: green blue pink orange purple yellow brown gray white red teal gold. Moods: happy sleepy sad surprised excited calm. Place: left center right. Size: small big. Korean words work (밤 언덕 달 별 | 공룡:초록:졸린). Keep the hero the same animal and color on every page.
5. `CW build <story folder>`: `book.html` (print it), `book.pdf`, `pages/*.jpg`, `sheet.jpg`, `check.md`. The check warns when a page holds too much text for the age, a sentence is long, a word is scary for a young child, the last page preaches, or the text names a thing (달, 별, 로켓, 고래 ...) that is not in that page's picture. Fix and build again.
6. Show `book.html` and the sheet.
