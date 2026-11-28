# connect-ai-writer 사용법

## 명령

| 명령 | 하는 일 |
|---|---|
| `demo [폴더]` | 예제 메모로 5개 플랫폼 글, 사진, 미리보기까지. 영상도 계정도 필요 없어요. 크롬이 없어도 글, 검사, 미리보기는 다 나와요 |
| `start <원본...> --for threads,naver,x` | 원본을 읽고 `out/<날짜>_<이름>/` 을 새로 만들어요(같은 이름이면 `-2`, 이어서 하려면 `--resume`). 안에 `brief.md`, `source/source.txt`, `source/frames.jpg`(영상일 때), 플랫폼마다 빈 `post.md` 가 생겨요. `--for all,newsletter` 도 돼요. 내 사진이나 페이지는 `--files 사진.jpg,page.html` 로 넣어요 |
| `brief [run]`, `brief [run] --check` | 글 기획서예요. 누가 읽는지, 뭘 위한 글인지, 꼭 지킬 내용, 공개해도 되는 것, 다음 행동. `--check` 는 꼭 지킬 내용 속 숫자, 인용, 늘었다 줄었다를 원본이랑 맞춰 보고 `editorial-brief.html` 을 만들어요. `plan` 이랑 `write` 가 이걸 따라가요 |
| `write [run] --writer "claude -p"` | 선택. 대화창 없이 에이전트가 `post.md` 를 다 써요. 보통은 대화창의 에이전트가 써요 |
| `build [run]` | 사진, 검사, `preview.html`, `post.txt`, `post.json`, `post.html`(블로그), `check.json`(검사 결과), `index.html`, `sheet.jpg`, `handoff/`. `--no-pictures` 거나 크롬이 없으면 글, 검사, 미리보기만 만들고 못 만든 사진은 이유랑 같이 알려 줘요 |
| `check [run]` | 글 검사만 빠르게 |
| `post [run] --to threads\|x\|naver` | 브라우저(ELDO, 없으면 Ego Lite)에서 편집 화면에 넣고 임시저장해요. `build` 검사를 통과하고 그 뒤로 안 바뀐 글만 넣어요. `--publish` 를 붙이면 발행까지 해요 |
| `voice <파일...> --name "이름" --out voice.md` | 내 받아쓰기로 말투표 만들기 |
| `trends "단어" --listen x,threads` | 구글 트렌드 급상승과 관심도, 검색어 자동완성(구글, 유튜브, 네이버), 위키백과 조회수, 그리고 브라우저로 X, 쓰레드, 유튜브를 읽기만 하는 리스닝. `trends.html`, `ideas.md`, 차트가 나와요. 네이버 데이터랩은 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` 이 있을 때만 |
| `research "주제" <링크나 파일...>` | 출처를 날짜까지 읽어서 `out/<날짜>_<주제>-research/` 에 넣고, 채울 `questions.md`, `facts.md` 를 만들어 줘요. `research add`, `research check` 하시면 사실마다 원문 어느 문장에서 나왔는지 붙여 주고 `research.html` 까지 나와요 |
| `start <리서치 폴더> --for naver,newsletter` | 사실 시트를 보고 글을 쓰는 거예요. 숫자, 인용, 링크를 시트랑 다 맞춰 보고, 블로그 글은 출처 칸이 꼭 있어야 돼요 |
| `plan [run] --score` | 고를 제목이랑 첫 줄 후보, 점수까지 |
| `story "아이디어" --age 7` | 그림책. 쪽마다 장면 줄이 있는 `story.md` 를 쓰고 `build <동화 폴더>` 하면 `book.html`, 쪽 그림, `sheet.jpg`, `book.pdf` 가 나와요 |
| `humanize <파일> --after <고친 글>` | 번역투나 영어 상투어 같은 AI 티를 찾아서 표시해 줘요. `--after` 를 주면 전후 비교 화면도 보여 주고, 숫자, 인용, 이름, 늘었다 줄었다가 다 그대로인지 확인해 주거든요. 말투표를 `--voice` 로 주면 내가 실제로 쓰는 말은 안 잡아요 |
| `check [run] --trace` | 글 속 숫자가 어디서 왔는지. 검사는 숫자, 인용, 방향(같은 숫자 옆의 늘었다 줄었다)까지 봐요. 뜻 전체를 다 보는 건 아니라서 마지막엔 직접 한 번 읽어 주세요 |
| `motion [run] --from threads --render` | connect-ai-motion 이 깔려 있으면 그 글로 모션그래픽 영상 (`--wide` 는 가로만) |
| `engines` | 같이 일하는 다른 AI 에이전트들(motion, video-motion, product-photo, marketer)이 있는지, 없으면 받는 법 |
| `platforms`, `themes`, `doctor` | 뭐가 준비돼 있는지 보기 |
| `install-skill`, `remove-skill` | 에이전트 스킬 (Claude Code, Codex, Antigravity, Cursor) |

`[run]` 을 안 쓰면 `./out` 안에서 제일 최근 폴더를 써요.

## 원본

- 영상: 같은 이름의 자막 파일을 옆에 두시거나(`강의.mp4` 옆에 `강의.srt`) `--srt 자막.srt` (영상이랑 같은 타임라인이어야 돼요). 유튜브에 올린 영상이면 YouTube Studio > 자막 > 언어 > 점 세 개 > 다운로드 > .srt 로 받으시면 돼요.
- `.srt`, `.vtt`, `.txt`, `.md`. 받아쓰기에 `--video 영상.mp4` 를 같이 주면 장면 사진도 돼요.
- 유튜브 링크: `yt-dlp` 가 있어야 되고, 자막을 읽어요. `--download-video` 는 장면 사진용으로 영상까지 받아요 (내 영상만요).
- 내 페이지 링크: 본문 글을 읽어요.

## post.md 쓰는 법

```
# 제목                                    블로그
## 소제목                                 블로그
내 말로 쓴 글.
[image: frame 05:45 "캡션"]              05:45 근처에서 제일 선명한 장면, 얼굴은 안 자르고 사진을 꽉 채워요 (x=0.3 으로 볼 곳을 정할 수도 있어요)
[image: quote "내가 한 말 그대로" 10:17]  인용 카드, 원본에 있는 말이어야 돼요
[image: stat "15" "설명" 11:49]          숫자 카드, 원본에 있는 숫자여야 돼요
[image: title "제목" "작은 줄"]           표지
[image: steps "하나" "둘" "셋"]           간단한 그림 (2~6단계)
[image: page https://내사이트 "캡션"]      내 페이지 캡처 (내 .html 파일은 결과 폴더 안에 있어야 돼요)
[image: file 사진.jpg "캡션"]             내 사진 (결과 폴더 안에. start --files 사진.jpg 로 넣어요)
---                                       쓰레드, X 다음 글
tags: 하나, 둘
```

## 내 폴더에 두는 설정 (전부 선택)

- `platforms.json`, `rules.json`, `banned.json`: 패키지에서 복사해서 고치시면 내 것이 먼저 쓰여요.
- `theme.json`: 색, 글꼴, `brand`(카드마다 들어가는 작은 줄). 밝은 테마는 `--theme paper`.
- `writer.config.json`: 이름, 아이디, 프로필 사진(`avatar`). 명령(글쓰기 명령, 이미지 훅)은 여기 넣어도 안 써요. 받은 폴더 하나가 내 컴퓨터에서 뭘 실행하면 안 되잖아요.

## 내 설정 (명령)

명령은 `~/.connect-ai/connect-ai-writer/writer.config.json` 에만 넣어요. 셸 없이 돌리고, 프롬프트는 인자가 아니라 표준입력으로 넘겨요. 프로그램한테는 PATH, HOME 같은 기본 값이랑 `passEnv` 에 적은 것만 보여요. 이미지 훅은 기본으로 꺼져 있고, 켜도 만든 사진마다 검사에서 알려 줘요.

## 도구가 깔리는 곳

`install-skill` 은 도구를 `~/.connect-ai/connect-ai-writer/<버전>/` 에 복사하고 거기서 `npm ci --omit=dev` 를 해요. npm 이 임시 폴더를 지워도 스킬이 계속 돌아가거든요. 스킬 폴더의 `SKILL.md` 랑 `.connect-ai-writer.json` 에 그 경로가 적혀 있어요.

## 검사 규칙 (rules.json)

원본에 없는 숫자, 원본과 다른 인용, 같은 숫자인데 늘었다 줄었다가 원본이랑 반대인 것, 글자 수, AI 같은 말, 이모지, 꺾쇠 괄호, 긴 줄표, 사진 없는 글, 빈 템플릿은 기본으로 실패예요. 강한 주장, 글 같은 말투, 첫 글에 사진 없음, 만든 사진은 경고예요. 규칙마다 `"fail"`, `"warn"`, `"off"` 로 바꿀 수 있어요.

## post (ELDO 또는 Ego Lite)

- 어떤 브라우저: ELDO(`cab`)가 깔려 있으면 그걸 쓰고, 없으면 Ego Lite를 써요. 직접 고르시려면 `~/.connect-ai/connect-ai-writer/writer.config.json` 에 `"browser": "cab"` 이나 `"ego"` 를 넣거나 `CONNECT_AI_BROWSER=cab|ego` 를 주시면 돼요. cab 설치는 한 번만: [eldobrowser.com](https://eldobrowser.com) (free macOS / Windows)
- ELDO에서는 `writer` 라는 에이전트 이름으로, 일 이름을 붙인 새 공간(글쓰기 AI 에이전트 threads 초안 10:30)에서 일해요. 창이 화면에 있으면 계획 패널에 단계가 하나씩 보여요.
- 플랫폼마다 그 브라우저에서 직접 로그인해 두세요. 이 도구는 로그인도 안 하고 비밀번호나 인증번호도 절대 안 쳐요.
- 돌릴 때마다 자기 작업 공간을 새로 만들고 끝나면 닫아요. 다른 공간은 안 건드려요.
- 넣기 전에 플랫폼, 계정, 제목, 글 수, 사진 수를 먼저 보여 줘요.
- 기본: 넣고, 화면 찍고, 임시저장하고, 닫아요. `--leave-open` 은 편집 화면을 열어 둬요. `--no-save` 는 저장을 안 눌러요. `--drafts-shot` 은 네이버 임시저장 목록도 찍어요.
- `--publish`: 발행 버튼까지 눌러서 올리고, 올라간 링크를 알려 줘요. 에이전트한테 "발행까지 해 줘" 라고 하시면 이걸 붙여요.
- 네이버에 작성 중인 글이 있다는 창이 뜨면 아무것도 안 누르고, 편집 화면을 열어 둔 채로 멈춰요. 확인이나 취소는 직접 고르시고 다시 돌리시면 돼요.
- 실제 계정으로 해 본 것: 쓰레드, 네이버 (임시저장). X는 아직 실제 계정으로 안 해 봤어요.
