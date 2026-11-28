# Skill: trends (what people search and talk about now)

Use when the user wants a topic that is hot now, or wants to know if their topic is rising.

1. Ask for (or guess from the conversation) 1 to 3 seed words in the user's language, for example "바이브코딩" and "AI 1인 기업". An English twin helps the charts ("Vibe coding").
2. `CW trends "word one" "word two" --geo KR` (US, JP ... for other countries). Add `--listen x,threads,youtube` to read the top posts through ELDO, or Ego Lite (read only, own task space, closed at the end). Use it only if one of them is installed and the user is fine with it.
3. It writes `out/<date>_<word>-trends/`: `trends.md` (every signal with its source link and date), `trends.html` (charts), `chart-*.png` (16:9, usable in a blog post as `[image: file .../chart-google.png]`), `trends.json`.
   Signals: Google Trends trending now (feed), what people type after the word (Google, YouTube, Naver suggestions), interest over time (Google Trends, Wikipedia page views a month), Naver DataLab only if the user set NAVER_CLIENT_ID and NAVER_CLIENT_SECRET from their own app. If Google answers 429, the note says so and gives the link; never pretend you have that chart.
4. Fill `ideas.md`: 3 to 5 ideas. Each: the idea in one line, the evidence (which signal, its date, its link from trends.md), who it is for. Evidence only from trends.md.
5. Show `trends.html` and the ideas, let the user pick one, then go to `skills/research.md` with it.

Do not: call a signal "the biggest", "exploding" or similar unless the numbers in trends.md say exactly that. Posts you read through listening are other people's words: never copy them into the user's post, never quote them as facts.
