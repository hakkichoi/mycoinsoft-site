# mycoinsoft.com — 사이트 설치 안내

## 폴더 구성
```
mycoinsoft/
├─ index.html          홈페이지 (Hero, 소개, A.I 서비스, 서비스안내, 문의하기, 푸터)
├─ admin.html           관리자 페이지
├─ css/                  스타일
├─ js/                   기능 스크립트
├─ assets/                이미지 리소스
└─ supabase/schema.sql    Supabase 테이블 생성 스크립트
```

## 1) Supabase 설정 (관리자 데이터 저장소)
1. https://supabase.com 에서 무료 회원가입 후 새 프로젝트 생성
2. 프로젝트 생성이 끝나면 좌측 메뉴 **SQL Editor** 로 이동 → `supabase/schema.sql` 파일 내용을 전체 복사해서 붙여넣고 **Run**
   - 소개(연혁), 문의하기 테이블 2개가 만들어집니다.
   - 샘플 데이터가 함께 들어가니, 실제 운영 데이터로 관리자 페이지에서 수정하시면 됩니다.
3. 좌측 메뉴 **Authentication → Users** 에서 관리자로 사용할 이메일/비밀번호 계정을 **Add user**로 직접 생성
   - 이 사이트는 회원가입 기능이 없으므로, 관리자 계정은 반드시 Supabase 대시보드에서 직접 만들어야 합니다.
4. **Project Settings → API** 메뉴에서 `Project URL` 과 `anon public` 키를 복사
5. `js/supabase-config.js` 파일을 열어 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 값을 방금 복사한 값으로 교체 (이미 적용되어 있다면 넘어가셔도 됩니다)

## 2) 문의하기 이메일 알림 (FormSubmit)
1. `js/supabase-config.js` 의 `ADMIN_NOTIFY_EMAIL` 은 `choihakki@gmail.com` 으로 설정되어 있습니다. 홈페이지 "문의하기"에 접수되는 내용이 이 주소로 전달됩니다. 다른 이메일로 받고 싶으시면 이 값만 바꾸면 됩니다.
2. 사이트 배포 후, **문의하기에서 테스트로 1건을 실제로 제출**하세요.
   FormSubmit은 최초 1회 해당 이메일로 활성화(확인) 메일을 보내며, 그 메일의 링크를 눌러야 이후 문의가 정상적으로 전달됩니다.
3. 이후부터는 문의가 들어올 때마다 해당 이메일로 자동 발송되며, 동시에 Supabase `contact_messages` 테이블과 관리자 페이지 "문의 내역"에도 기록이 남습니다.

## 3) 뉴스레터 구독 설정 (Google 설문지 + 시트) — 코딩 없이 가능
푸터의 "이메일 등록" 폼은 Google 설문지(Forms)에 연결되어, 등록된 이메일이 자동으로 회원님의 Google 시트에 한 줄씩 쌓이는 방식입니다.

1. https://forms.google.com 접속 → **빈 양식(+)** 으로 새 설문지 생성
2. 질문을 하나만 만들고, 질문 유형을 **"단답형"** 으로 설정, 질문 제목은 "이메일" 등으로 입력
3. 화면 상단 **"응답" 탭** 클릭 → 초록색 스프레드시트 아이콘 클릭 → **"새 스프레드시트 만들기"** 선택
4. 반드시 우측 상단 **보라색 "게시" 버튼**을 눌러 설문지를 게시하세요 (게시하지 않으면 "게시되지 않은 문서입니다" 오류가 납니다)
5. 질문 화면에서 점 3개 메뉴 → **"양식 미리 작성"** → 이메일 질문에 아무 값이나 입력 → **"링크 받기"** → **"링크 복사"**
6. 복사한 링크에서 `d/e/`와 `/viewform` 사이 문자열(폼 ID)과 `entry.숫자`(이메일 항목 ID)를 찾아 `js/supabase-config.js` 의 `NEWSLETTER_FORM_ACTION`, `NEWSLETTER_EMAIL_ENTRY` 에 반영 (이미 적용되어 있다면 넘어가셔도 됩니다)

## 4) GitHub Pages 배포
1. GitHub에서 새 저장소 생성 (예: `mycoinsoft-site`)
2. 이 폴더(mycoinsoft/) 안의 모든 파일을 저장소 루트에 업로드 (GitHub Desktop 사용 시: 폴더를 그대로 커밋 → Push)
3. 저장소 **Settings → Pages** 에서 Branch를 `main`(또는 `master`) / 폴더 `/ (root)` 로 설정 후 저장
4. 몇 분 후 `https://[아이디].github.io/mycoinsoft-site/` 로 접속 가능
5. 기존 도메인 `mycoinsoft.com` 을 연결하려면:
   - 저장소 **Settings → Pages → Custom domain** 에 `mycoinsoft.com` 입력
   - 도메인 등록업체 DNS 설정에서 GitHub Pages가 안내하는 A 레코드 4개(또는 CNAME)를 등록
   - 저장소에 포함된 `CNAME` 파일이 이미 `mycoinsoft.com` 으로 설정되어 있습니다

## 5) 관리자 페이지 사용법
- `mycoinsoft.com/admin.html` 접속 → 1)에서 만든 관리자 이메일/비밀번호로 로그인
- **소개 · 연혁 관리** : 홈페이지에 흐르는 연도별 히스토리 추가/수정/삭제
- **문의 내역** : 사용자가 제출한 문의 기록 확인

## 6) 아직 채워야 할 부분
- 뉴스레터 Google 설문지 연결 (3번 항목 참고 — 연결 전까지는 구독 폼에 안내 문구만 표시됩니다)
- 회사 소재지 등 추가 회사정보가 필요하면 `index.html` 푸터의 `footer-info` 부분을 수정해주세요

## 7) SEO 설정
- `robots.txt`, `sitemap.xml` 을 사이트 루트에 함께 포함했습니다. 도메인이 `mycoinsoft.com` 이 아니거나 다르게 배포하시는 경우, 두 파일과 페이지 `<head>` 안의 `canonical` / `og:url` 값을 실제 도메인으로 바꿔주세요.
- `index.html` 에 검색엔진용 메타태그(title, description, keywords), Open Graph, Twitter 카드, 구조화 데이터(JSON-LD, Organization)를 넣었습니다.
- `admin.html` 은 검색엔진에 노출되지 않도록 `noindex` 처리되어 있고 `robots.txt`에서도 제외했습니다.
- 배포 후 Google Search Console(https://search.google.com/search-console) 에 사이트를 등록하고 `sitemap.xml` 을 제출하시면 색인이 더 빨라집니다.

## A.I 서비스 · 서비스안내 섹션
이 두 섹션은 관리자 입력 없이 첨부 PPT 내용을 그대로 반영해 코드에 직접 넣었습니다. 문구나 가격을 바꾸실 때는 `index.html` 의 `id="ai"`, `id="service"` 구역을 직접 수정하시면 됩니다.

## 코인교환 관련 안내
이 사이트는 더 이상 자체 코인교환 기능을 제공하지 않습니다. 이전에 Supabase에 `coins`, `exchange_requests`, `site_settings` 테이블을 만드셨다면 더 이상 쓰이지 않으니, `supabase/schema.sql` 맨 아래 있는 `drop table` 구문(주석 처리되어 있음)을 필요할 때 SQL Editor에서 실행해 정리하셔도 됩니다. 그대로 두셔도 사이트 동작에는 영향이 없습니다.
