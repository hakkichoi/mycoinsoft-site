# mycoinsoft.com — 사이트 설치 안내

## 폴더 구성
```
mycoinsoft/
├─ index.html          홈페이지 (Hero, 소개, A.I 서비스, 서비스안내, 푸터)
├─ exchange.html        코인 교환 페이지 (별도 페이지, 신청 팝업 포함)
├─ admin.html            관리자 페이지
├─ css/                  스타일
├─ js/                   기능 스크립트
├─ assets/                이미지 (텔레그램 QR 등)
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

## 3) GitHub Pages 배포
1. GitHub에서 새 저장소 생성 (예: `mycoinsoft-site`)
2. 이 폴더(mycoinsoft/) 안의 모든 파일을 저장소 루트에 업로드 (GitHub Desktop 사용 시: 폴더를 그대로 커밋 → Push)
3. 저장소 **Settings → Pages** 에서 Branch를 `main`(또는 `master`) / 폴더 `/ (root)` 로 설정 후 저장
4. 몇 분 후 `https://[아이디].github.io/mycoinsoft-site/` 로 접속 가능
5. 기존 도메인 `mycoinsoft.com` 을 연결하려면:
   - 저장소 **Settings → Pages → Custom domain** 에 `mycoinsoft.com` 입력
   - 도메인 등록업체(가비아, 후이즈 등) DNS 설정에서 GitHub Pages가 안내하는 A 레코드 4개(또는 CNAME)를 등록

## 4) 관리자 페이지 사용법
- `mycoinsoft.com/admin.html` 접속 → 1)에서 만든 관리자 이메일/비밀번호로 로그인
- **소개 · 연혁 관리** : 홈페이지에 흐르는 연도별 히스토리 추가/수정/삭제
- **코인 교환 목록 관리** : 코인교환 페이지에 표시될 코인, USDT 가격, 노출 여부 관리
- **환율 설정** : VICT로 신청 시 USDT로 환산할 기준 비율(1 VICT = ? USDT) 설정
- **교환 신청 내역** : 사용자가 제출한 신청 기록 확인
- **문의 내역** : 홈페이지 "문의하기" 양식으로 접수된 문의 확인

## 5) 아직 채워야 할 부분
- 푸터의 카카오톡 / 위챗 링크·이미지 (현재는 자리표시자입니다. 실제 채널 링크와 QR 이미지를 `assets/` 에 추가한 뒤 `index.html` 푸터의 해당 카드를 교체해주세요)
- 회사 소재지(현재 "대한민국 서울"로만 되어 있습니다. 정확한 주소가 있으면 `index.html` 푸터의 `footer-info` 부분을 수정해주세요)
- 코인교환 페이지의 각 코인별 "코인정보 / 백서 / 홈페이지" 실제 링크 (관리자 페이지에서 코인별로 입력 가능)

## A.I 서비스 · 서비스안내 섹션
말씀하신 대로 이 두 섹션은 관리자 입력 없이 첨부 PPT 내용을 그대로 반영해 코드에 직접 넣었습니다. 문구나 가격을 바꾸실 때는 `index.html` 의 `id="ai"`, `id="service"` 구역을 직접 수정하시면 됩니다.
