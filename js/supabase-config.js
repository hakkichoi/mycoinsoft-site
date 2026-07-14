/* ============================================================
   Supabase 연결 설정
   1) https://supabase.com 에서 새 프로젝트를 만드세요 (무료 플랜으로 충분합니다)
   2) 프로젝트 대시보드 > Project Settings > API 에서
      "Project URL" 과 "anon public" 키를 아래에 붙여넣으세요.
   3) /supabase/schema.sql 파일을 SQL Editor에 붙여넣고 실행하면
      필요한 테이블이 모두 생성됩니다.
============================================================ */

const SUPABASE_URL = 'https://mbujojcktnbvcpewfwqd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1idWpvamNrdG5idmNwZXdmd3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMDExNDMsImV4cCI6MjA5OTU3NzE0M30.6Ox3LYQCZGZjF7rSQlyZytq9YU8OK2IeoAgomOVyazc';

// 코인 교환 신청 알림을 받을 관리자 이메일 (FormSubmit 사용)
// 최초 1회, 실제 폼 제출을 한 번 해서 해당 이메일로 온 확인 메일에서
// 활성화 링크를 눌러야 정상적으로 이메일이 전달됩니다. (formsubmit.co 안내 참고)
const ADMIN_NOTIFY_EMAIL = 'choihakki@gmail.com';

// 뉴스레터 구독 폼 — Google 설문지에 연결 (README 안내에 따라 값을 채워주세요)
const NEWSLETTER_FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLSclK8zc19SujRuo2NppMrQ4vn0d-0E5fRgGv0tVXGUFqan3JA/formResponse';
const NEWSLETTER_EMAIL_ENTRY = 'entry.1378839989';

let _supabaseClient = null;
function getSupabase() {
  if (_supabaseClient) return _supabaseClient;
  if (typeof window.supabase === 'undefined') {
    console.error('Supabase 라이브러리가 로드되지 않았습니다.');
    return null;
  }
  _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _supabaseClient;
}
