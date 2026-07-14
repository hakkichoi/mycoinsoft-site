# mycoinsoft.com — 사이트 설치 안내

## 폴더 구성
```
mycoinsoft/
├─ index.html          홈페이지 (Hero, 소개, A.I 서비스, 서비스안내, 푸터)
├─ exchange.html        코인 교환 페이지 (별도 페이지, 신청 팝업 포함)
├─ admin.html            관리자 페이지
├─ css/                  스타일
├─ js/                   기능 스크립트
├─ assets/                이미지 리소스
└─ supabase/schema.sql    Supabase 테이블 생성 스크립트
```

## 1) Supabase 설정 (관리자 데이터 저장소)
1. https://supabase.com 에서 무료 회원가입 후 새 프로젝트 생성
2. 프로젝트 생성이 끝나면 좌측 메뉴 **SQL Editor** 로 이동 → `supabase/schema.sql` 파일 내용을 전체 복사해서 붙여넣고 **Run**
   - 소개(연혁), 코인 교환 목록, 환율 설정, 교환 신청 내역, 문의하기까지 테이블 5개가 한 번에 만들어집니다.
   - 샘플 데이터가 함께 들어가니, 실제 운영 데이터로 관리자 페이지에서 수정하시면 됩니다.
3. 좌측 메뉴 **Authentication → Users** 에서 관리자로 사용할 이메일/비밀번호 계정을 **Add user**로 직접 생성
   - 이 사이트는 회원가입 기능이 없으므로, 관리자 계정은 반드시 Supabase 대시보드에서 직접 만들어야 합니다.
4. **Project Settings → API** 메뉴에서 `Project URL` 과 `anon public` 키를 복사
5. `js/supabase-config.js` 파일을 열어 아래 두 줄을 방금 복사한 값으로 교체
   ```js
   const SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co';
   const SUPABASE_ANON_KEY = 'YOUR-ANON-PUBLIC-KEY';
   ```

## 2) 코인 교환 신청 이메일 알림 (FormSubmit)
1. `js/supabase-config.js` 의 `ADMIN_NOTIFY_EMAIL` 은 `choihakki@gmail.com` 으로 이미 설정되어 있습니다. 코인교환 신청과 홈페이지 "문의하기" 둘 다 이 주소로 전달됩니다. 다른 이메일로 받고 싶으시면 이 값만 바꾸면 됩니다.
2. 사이트 배포 후, **코인교환 페이지에서 테스트로 신청서 1건을 실제로 제출**하세요.
   FormSubmit은 최초 1회 해당 이메일로 활성화(확인) 메일을 보내며, 그 메일의 링크를 눌러야 이후 신청 건이 정상적으로 전달됩니다.
3. 이후부터는 신청이 들어올 때마다 해당 이메일로 자동 발송되며, 동시에 Supabase `exchange_requests` 테이블과 관리자 페이지 "교환 신청 내역"에도 기록이 남습니다.

## 3) 뉴스레터 구독 설정 (Google 설문지 + 시트) — 코딩 없이 가능
푸터의 "이메일 등록" 폼은 Google 설문지(Forms)에 연결되어, 등록된 이메일이 자동으로 회원님의 Google 시트에 한 줄씩 쌓이는 방식입니다. 아래 순서대로 한 번만 설정하시면 됩니다.

1. https://forms.google.com 접속 → **빈 양식(+)** 으로 새 설문지 생성
2. 질문을 하나만 만들고, 질문 유형을 **"단답형"** 으로 설정, 질문 제목은 "이메일" 등으로 입력 (필요하면 우측 하단 점 3개 메뉴에서 "응답 검사기 → 텍스트 → 이메일 주소"를 켜면 형식 검증도 됩니다)
3. 화면 상단 **"응답" 탭** 클릭 → 초록색 스프레드시트 아이콘 클릭 → **"새 스프레드시트 만들기"** 선택. 이제부터 응답이 들어올 때마다 이 구글 시트에 자동으로 쌓입니다.
4. 다시 **질문 화면**으로 돌아와 우측 상단 **점 3개 메뉴 → "미리 채워진 링크 받기"** 클릭
5. 이메일 질문에 아무 값이나 입력(예: test@test.com) 후 **"링크 받기"** → **"링크 복사"**
6. 복사한 링크는 이런 모양입니다:
   `https://docs.google.com/forms/d/e/1FAIpQL.../viewform?usp=pp_url&entry.123456789=test%40test.com`
   여기서 두 가지를 찾으세요:
   - `d/e/` 와 `/viewform` 사이의 긴 문자열 = **폼 ID**
   - `entry.` 로 시작하는 숫자 = **이메일 항목 ID** (예: `entry.123456789`)
7. `js/supabase-config.js` 파일을 열어 아래 두 줄을 방금 찾은 값으로 교체하세요:
   ```js
   const NEWSLETTER_FORM_ACTION = 'https://docs.google.com/forms/d/e/여기에_폼ID/formResponse';
   const NEWSLETTER_EMAIL_ENTRY = 'entry.여기에_숫자';
   ```
   (링크의 `/viewform` 부분을 `/formResponse` 로 바꿔서 넣는 것이 핵심입니다.)
8. 저장 후 배포된 사이트에서 실제로 이메일 하나를 등록해보고, 연결해둔 Google 시트에 그 이메일이 한 줄 추가되는지 확인하세요.

## 4) GitHub Pages 배포
1. GitHub에서 새 저장소 생성 (예: `mycoinsoft-site`)
2. 이 폴더(mycoinsoft/) 안의 모든 파일을 저장소 루트에 업로드 (GitHub Desktop 사용 시: 폴더를 그대로 커밋 → Push)
3. 저장소 **Settings → Pages** 에서 Branch를 `main`(또는 `master`) / 폴더 `/ (root)` 로 설정 후 저장
4. 몇 분 후 `https://[아이디].github.io/mycoinsoft-site/` 로 접속 가능
5. 기존 도메인 `mycoinsoft.com` 을 연결하려면:
   - 저장소 **Settings → Pages → Custom domain** 에 `mycoinsoft.com` 입력
   - 도메인 등록업체(가비아, 후이즈 등) DNS 설정에서 GitHub Pages가 안내하는 A 레코드 4개(또는 CNAME)를 등록

## 5) 관리자 페이지 사용법
- `mycoinsoft.com/admin.html` 접속 → 1)에서 만든 관리자 이메일/비밀번호로 로그인
- **소개 · 연혁 관리** : 홈페이지에 흐르는 연도별 히스토리 추가/수정/삭제
- **코인 교환 목록 관리** : 코인교환 페이지에 표시될 코인, USDT 가격, 노출 여부 관리
- **환율 설정** : VICT로 신청 시 USDT로 환산할 기준 비율(1 VICT = ? USDT) 설정
- **교환 신청 내역** : 사용자가 제출한 신청 기록 확인
- **문의 내역** : 홈페이지 "문의하기" 양식으로 접수된 문의 확인

## 6) 아직 채워야 할 부분
- 뉴스레터 Google 설문지 연결 (3번 항목 참고 — 연결 전까지는 구독 폼에 안내 문구만 표시됩니다)
- 회사 소재지(현재 "대한민국 서울"로만 되어 있습니다. 정확한 주소가 있으면 `index.html` 푸터의 `footer-info` 부분을 수정해주세요)
- 코인교환 페이지의 각 코인별 "코인정보 / 백서 / 홈페이지" 실제 링크 (관리자 페이지에서 코인별로 입력 가능)

## 7) SEO 설정
- `robots.txt`, `sitemap.xml` 을 사이트 루트에 함께 포함했습니다. 도메인이 `mycoinsoft.com` 이 아니거나 다르게 배포하시는 경우, 두 파일과 각 페이지 `<head>` 안의 `canonical` / `og:url` 값을 실제 도메인으로 바꿔주세요.
- `index.html`, `exchange.html` 에 검색엔진용 메타태그(title, description, keywords), Open Graph, Twitter 카드, 구조화 데이터(JSON-LD, Organization)를 넣었습니다.
- `admin.html` 은 검색엔진에 노출되지 않도록 `noindex` 처리되어 있고 `robots.txt`에서도 제외했습니다.
- 배포 후 Google Search Console(https://search.google.com/search-console) 에 사이트를 등록하고 `sitemap.xml` 을 제출하시면 색인이 더 빨라집니다.

## A.I 서비스 · 서비스안내 섹션
말씀하신 대로 이 두 섹션은 관리자 입력 없이 첨부 PPT 내용을 그대로 반영해 코드에 직접 넣었습니다. 문구나 가격을 바꾸실 때는 `index.html` 의 `id="ai"`, `id="service"` 구역을 직접 수정하시면 됩니다.
