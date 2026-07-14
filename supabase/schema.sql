-- ============================================================
-- MYCOINSOFT.COM  — Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에 전체를 붙여넣고 Run 하세요.
-- ============================================================

-- 1) 소개 섹션 : 연도별 비즈니스 히스토리 (ledger tape)
create table if not exists timeline_events (
  id bigint generated always as identity primary key,
  year text not null,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 2) 문의하기 (홈페이지 문의 폼 - 이름/전화번호/이메일/메시지)
create table if not exists contact_messages (
  id bigint generated always as identity primary key,
  name text not null,
  phone text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
alter table timeline_events enable row level security;
alter table contact_messages enable row level security;

-- 공개 조회 (누구나)
create policy "public read timeline" on timeline_events for select using (true);

-- 로그인한 관리자만 쓰기/수정/삭제
create policy "admin write timeline" on timeline_events for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 문의하기 : 누구나 등록 가능(회원가입 없음), 조회는 관리자만
create policy "public insert contact" on contact_messages for insert with check (true);
create policy "admin read contact" on contact_messages for select
  using (auth.role() = 'authenticated');

-- ============================================================
-- 샘플 데이터 (원하는 대로 수정/삭제하세요)
-- ============================================================
insert into timeline_events (year, title, sort_order) values
  ('2018', '국내 최초 중형 코인거래소 오픈', 1),
  ('2019', '국내 최초 채굴형 거래소 론칭', 2),
  ('2020', '해외 거래소 상장 2건', 3),
  ('2021', '거래소 제작 9건 누적', 4),
  ('2022', '코인 제작 150건 이상 수행', 5),
  ('2023', '코인 상장 30건 이상 지원', 6);

-- ============================================================
-- 예전에 코인교환 기능을 위해 만들었던 테이블을 이미 실행하셨다면,
-- 더 이상 쓰지 않으니 아래 구문으로 정리(삭제)하셔도 됩니다. (선택사항)
-- ============================================================
-- drop table if exists coins;
-- drop table if exists exchange_requests;
-- drop table if exists site_settings;
