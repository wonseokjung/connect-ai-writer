# Skill: humanize (remove what sounds like an AI, keep every fact)

Process after blader/humanizer (MIT); Korean translationese kinds after nathankim0/humanize-korean (MIT). The patterns are ours, in `humanize.json` (copy it into the project folder to change it).

1. `CW humanize <file> --voice voice.md` marks: Korean 번역투 (~에 대해, ~을 통해, ~에 있어서, 되어지다, ~에 의해, 명사 + 진행하다, ~하는 것이 가능하다, 그녀/그것, ~로 이어진다, 사물이 말하게 하기), staging (단순히 X가 아니라 Y, 혼자 묻고 답하기, "핵심은:"), stock openers and closers, inflated words, stacked hedges, sentence-start connectors, English tells, long dashes and emoji, plus rhythm: sentences all the same length, the same ending again and again, mixed speech levels (합니다 / 해요 / 한다). A word the user's voice sheet has is theirs and is not marked (always pass `--voice`). Marks inside double quotes on one line are listed as QUOTE, "quoted (not counted)": a quoted example or someone's real words. Do not rewrite inside a real quote. A plain place ("그 자리에 있어요") is not 번역투; only ~에 있어서 / ~함에 있어 is.
2. Rewrite in the user's voice (their voice sheet wins over every rule; a phrase they really say is fine). Say the thing directly instead of patching word by word. Keep every number, name, date, quote and claim. Do not add a detail you do not know is true.
3. Save the rewrite and prove it: `CW humanize <before> --after <after>`. It must say "facts kept", and the score should drop. It writes `<file>.humanize.html` (before and after side by side, marks highlighted).
4. Leave alone: quotes, names, titles, normal greetings, and text that talks about a phrase instead of using it.
