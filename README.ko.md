<!-- BANNER PLACEHOLDER: docs/brand/banner.jpg, 제이 실제 얼굴이 들어간 CONNECT AI LAB 브랜드 배너 (리드가 실제 사진으로 만듦, 생성 금지). 넣을 때:
<p align="center"><img src="docs/brand/banner.jpg" width="100%" alt="connect-ai-writer, AI 멘토 제이, CONNECT AI LAB"></p>
-->

<p align="center">
  <b>CONNECT AI LAB</b> · 모두를 위한 AI 교육 · AI education for everyone<br>
  <a href="https://www.youtube.com/@CONNECT-AI-LAB">YouTube: CONNECT AI LAB</a> · <a href="https://www.aicitybuilders.com/vibecoding">강의: 비주얼 바이브코딩</a> · <a href="README.md">English</a>
</p>

# connect-ai-writer

**AI 글쓰기 직원이에요. 영상 하나만 주시면 쓰레드, 네이버 블로그, X 글을 내 말투로 써 주고, 사진까지 내 자료로 같이 만들어 줘요.**

![실제 강의 영상으로 만든 사진들: 선명한 장면, 숫자 카드, 인용 카드, 그림](docs/showcase/cards.jpg)

## 시작

```bash
npx connect-ai-writer demo
```

예제 메모로 쓰레드, 네이버 블로그, X, 링크드인, 인스타그램 글이 나오고, 사진 20장이랑 미리보기가 같이 열려요. 계정은 필요 없어요. Node.js 20.9 이상이랑 크롬만 있으면 돼요.

에이전트(Claude Code, Codex, Antigravity, Cursor)에서 쓰시려면 이렇게 하시면 돼요.

```bash
npx connect-ai-writer install-skill
```

그다음에 영상이 있는 폴더에서 에이전트를 열고 "이 영상으로 쓰레드랑 네이버 블로그 글 써 줘" 이렇게 한번 말해 보세요.

## 이렇게 나와요

<table>
<tr>
<td width="33%" valign="top"><img src="docs/showcase/threads_preview.jpg" width="100%" alt="쓰레드 미리보기"><br><b>쓰레드는 이어지는 글로</b><br><sub>글마다 500자 안으로, 사진도 같이 붙어요.</sub></td>
<td width="33%" valign="top"><img src="docs/showcase/naver_preview.jpg" width="100%" alt="네이버 블로그 미리보기"><br><b>네이버 블로그는 긴 글로</b><br><sub>제목, 소제목, 문단 사이 사진, 태그까지요.</sub></td>
<td width="33%" valign="top"><img src="docs/showcase/x_preview.jpg" width="100%" alt="X 미리보기"><br><b>X는 글자 수를 다르게 세요</b><br><sub>한글은 한 글자를 2로 세거든요. 이 친구가 다 세 줘요.</sub></td>
</tr>
<tr>
<td width="33%" valign="top"><img src="docs/showcase/threads_editor.jpg" width="100%" alt="쓰레드 편집 화면에 들어간 임시글"><br><b>편집 화면까지만 가요</b><br><sub>Ego Lite에서 글을 넣고 임시저장하고, 게시 버튼 앞에서 멈춰요.</sub></td>
<td colspan="2" valign="top"><img src="docs/showcase/sheet.jpg" width="100%" alt="한 번 돌린 사진 전부"><br><b>사진은 전부 내 자료로 만들어요</b><br><sub>내 영상의 선명한 장면, 내가 한 말, 내가 말한 숫자, 내 페이지요. 없는 사람, 없는 화면, 없는 숫자는 절대 안 만들어요.</sub></td>
</tr>
</table>

## 이렇게 돌아가요

```bash
npx connect-ai-writer start 내영상.mp4 --for threads,naver,x --voice voice.md
# 에이전트가 brief.md 를 보고 플랫폼마다 post.md 를 써요
npx connect-ai-writer build
npx connect-ai-writer post --to threads        # 편집 화면에 넣고 임시저장, 게시는 안 해요
```

| 단계 | 하는 일 |
|---|---|
| `voice` | 내 받아쓰기로 말투표를 만들어요. 내가 자주 쓰는 어미, 첫마디, 절대 안 쓰는 말이요 |
| `start` | 영상이랑 자막, 메모, 유튜브 링크, 내 페이지를 읽고, 선명한 장면을 골라 두고, 글 쓸 때 볼 brief 를 만들어요 |
| `build` | 플랫폼 크기에 맞춰 사진을 만들고, 검사하고, `preview.html` 이랑 바로 붙여 넣을 `post.txt` 를 만들어요 |
| `check` | 원본에 없는 숫자나 인용, 글자 수 초과, AI 같은 말투, 이모지, 꺾쇠 괄호, 긴 줄표, 사진 없는 글을 잡아요 |
| `post` | Ego Lite에서 내 로그인으로 편집 화면에 넣고, 게시 버튼 앞에서 멈춰요. `--publish` 는 내가 직접 쳐야만 돼요 |

플랫폼 규칙은 전부 [platforms.json](platforms.json)에 있고, 어디서 확인했는지도 같이 적어 뒀어요. `verified: false` 로 된 건 공식 페이지에서 확인을 못 한 거라서, 한 번 더 보셔야 돼요.

글쓰기 직원은 플랫폼마다 글이랑 사진을 만들고, 다 만든 걸 올리는 건 마케팅 직원 [connect-ai-marketer](https://github.com/wonseokjung/connect-ai-marketer)가 해요. `handoff/` 폴더에 넘길 파일이 같이 나와요.

---

명령이랑 옵션은 [docs/guide.ko.md](docs/guide.ko.md)에 다 정리해 뒀어요. 저장소를 받으셨으면 `npm install` 하고 `npm test` 해 보시면 돼요.

라이선스는 MIT예요. 설치되는 패키지랑 불러 쓰는 프로그램은 각자 라이선스가 있고, [NOTICE.md](NOTICE.md)에 정리해 뒀어요.

이런 도구를 내 AI 에이전트로 직접 만드는 법은 [비주얼 바이브코딩](https://www.aicitybuilders.com/vibecoding)에서 알려 드려요.

<table><tr>
<td width="140" valign="top"><img src="docs/brand/jay.jpg" width="128" alt="AI 멘토 제이"></td>
<td valign="top"><b>만든 사람: AI 멘토 제이</b> · CONNECT AI LAB<br>
제가 이런 AI 직원을 하나씩 만들어서 다 공개하고 있거든요. 만드는 법은 유튜브랑 강의에서 보여 드려요.<br>
<a href="https://www.youtube.com/@CONNECT-AI-LAB">YouTube</a> · <a href="https://www.aicitybuilders.com/vibecoding">비주얼 바이브코딩</a> · <a href="https://github.com/wonseokjung">다른 오픈소스</a></td>
</tr></table>

<!-- team:start -->
## CONNECT AI LAB의 AI 직원들

AI 직원을 하나씩 오픈소스로 만들고 있어요. 필요한 직원부터 데려가 쓰세요.

<table>
<tr><td width="34%" valign="top"><b>사업 해부 직원</b><br><a href="https://github.com/wonseokjung/reversebusiness"><code>reversebusiness</code></a></td><td valign="top">사업 웹사이트 주소 하나 주면 그 사업이 어떻게 돈 버는지 읽어 줘요.</td></tr>
<tr><td width="34%" valign="top"><b>영상 편집 직원</b><br><a href="https://github.com/wonseokjung/connect-ai-video-motion"><code>connect-ai-video-motion</code></a></td><td valign="top">내 영상을 주면 몸을 피해서 빈자리에 모션그래픽을 넣어 줘요.</td></tr>
<tr><td width="34%" valign="top"><b>모션그래픽 직원</b><br><a href="https://github.com/wonseokjung/connect-ai-motion"><code>connect-ai-motion</code></a></td><td valign="top">글 몇 줄 주면 모션그래픽 영상을 만들어 줘요. 찍은 영상은 없어도 돼요.</td></tr>
<tr><td width="34%" valign="top"><b>마케팅팀</b><br><a href="https://github.com/wonseokjung/connect-ai-marketer"><code>connect-ai-marketer</code></a></td><td valign="top">내 브라우저에서 24시간 댓글, 리스닝, 업로드를 맡아요.</td></tr>
<tr><td width="34%" valign="top"><b>글쓰기 직원</b> · <b>지금 보는 직원</b><br><a href="https://github.com/wonseokjung/connect-ai-writer"><code>connect-ai-writer</code></a></td><td valign="top">영상이나 메모를 주면 플랫폼마다 내 말투로 글을 쓰고 사진까지 만들어 줘요.</td></tr>
</table>
<!-- team:end -->
