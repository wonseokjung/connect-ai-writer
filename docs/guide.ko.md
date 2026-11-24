# connect-ai-writer 사용법

## 명령

| 명령 | 하는 일 |
|---|---|
| `demo [폴더]` | 예제 메모로 5개 플랫폼 글, 사진, 미리보기까지. 영상도 계정도 필요 없어요 |
| `start <원본...> --for threads,naver,x` | 원본을 읽고 `out/<날짜>_<이름>/` 에 `brief.md`, `source/source.txt`, `source/frames.jpg`(영상일 때), 플랫폼마다 빈 `post.md` 를 만들어요 |
| `write [run] --writer "claude -p"` | 선택. 대화창 없이 에이전트가 `post.md` 를 다 써요. 보통은 대화창의 에이전트가 써요 |
| `build [run]` | 사진, 검사, `preview.html`, `post.txt`, `post.json`, `post.html`(블로그), `index.html`, `sheet.jpg`, `handoff/` |
| `check [run]` | 글 검사만 빠르게 |
| `post [run] --to threads\|x\|naver` | Ego Lite에서 편집 화면에 넣고 게시 버튼 앞에서 멈춰요 |
| `voice <파일...> --name "이름" --out voice.md` | 내 받아쓰기로 말투표 만들기 |
| `platforms`, `themes`, `doctor` | 뭐가 준비돼 있는지 보기 |
| `install-skill`, `remove-skill` | 에이전트 스킬 (Claude Code, Codex, Antigravity, Cursor) |

`[run]` 을 안 쓰면 `./out` 안에서 제일 최근 폴더를 써요.

## 원본

- 영상: 같은 이름의 자막 파일을 옆에 두시거나 `--srt 자막.srt` (영상이랑 같은 타임라인이어야 돼요).
- `.srt`, `.vtt`, `.txt`, `.md`. 받아쓰기에 `--video 영상.mp4` 를 같이 주면 장면 사진도 돼요.
- 유튜브 링크: `yt-dlp` 가 있어야 되고, 자막을 읽어요. `--download-video` 는 장면 사진용으로 영상까지 받아요 (내 영상만요).
- 내 페이지 링크: 본문 글을 읽어요.

## post.md 쓰는 법

```
# 제목                                    블로그
## 소제목                                 블로그
내 말로 쓴 글.
[image: frame 05:45 "캡션"]              05:45 근처에서 제일 선명한 장면, 자르지 않아요
[image: quote "내가 한 말 그대로" 10:17]  인용 카드, 원본에 있는 말이어야 돼요
[image: stat "15" "설명" 11:49]          숫자 카드, 원본에 있는 숫자여야 돼요
[image: title "제목" "작은 줄"]           표지
[image: steps "하나" "둘" "셋"]           간단한 그림 (2~6단계)
[image: page https://내사이트 "캡션"]      내 페이지 캡처 (내 .html 파일도 돼요)
[image: file 사진.jpg "캡션"]             내 사진
---                                       쓰레드, X 다음 글
tags: 하나, 둘
```

## 내 폴더에 두는 설정 (전부 선택)

- `platforms.json`, `rules.json`, `banned.json`: 패키지에서 복사해서 고치시면 내 것이 먼저 쓰여요.
- `theme.json`: 색, 글꼴, `brand`(카드마다 들어가는 작은 줄). 밝은 테마는 `--theme paper`.
- `writer.config.json`: 이름, 아이디, 프로필 사진(`avatar`), 글쓰기 명령, 이미지 훅. 이미지 훅은 기본으로 꺼져 있고, 켜도 만든 사진마다 검사에서 알려 줘요.

## 검사 규칙 (rules.json)

원본에 없는 숫자, 원본과 다른 인용, 글자 수, AI 같은 말, 이모지, 꺾쇠 괄호, 긴 줄표, 사진 없는 글, 빈 템플릿은 기본으로 실패예요. 강한 주장, 글 같은 말투, 첫 글에 사진 없음, 만든 사진은 경고예요. 규칙마다 `"fail"`, `"warn"`, `"off"` 로 바꿀 수 있어요.

## post (Ego Lite)

- 플랫폼마다 Ego Lite에서 직접 로그인해 두세요. 이 도구는 로그인도 안 하고 비밀번호나 인증번호도 절대 안 쳐요.
- 돌릴 때마다 자기 작업 공간을 새로 만들고 끝나면 닫아요. 다른 공간은 안 건드려요.
- 기본: 넣고, 화면 찍고, 임시저장하고, 닫아요. `--leave-open` 은 편집 화면을 열어 둬요. `--no-save` 는 저장을 안 눌러요.
- `--publish` 는 터미널에서 플랫폼 이름을 직접 쳐야 게시해요. 네이버 발행은 직접 하셔야 돼요.
- 실제 계정으로 해 본 것: 쓰레드(임시저장). X랑 네이버는 아직 실제 계정으로 안 해 봤어요.
