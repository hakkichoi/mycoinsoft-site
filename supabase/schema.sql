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

-- 2) 코인 교환 목록 (admin이 관리, 사용자는 조회만)
create table if not exists coins (
  id bigint generated always as identity primary key,
  symbol text not null,             -- 예: BTC, ETH, VICT, BLC
  name text not null,               -- 표시용 이름
  price_usdt numeric not null,      -- 1개당 USDT 가격
  info_url text,
  whitepaper_url text,
  homepage_url text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 3) 사이트 설정 (VICT/USDT 환율 등 key-value)
create table if not exists site_settings (
  key text primary key,
  value text not null
);

insert into site_settings (key, value) values ('vict_usdt_rate', '1')
  on conflict (key) do nothing;

-- 4) 코인 교환 신청 내역 (사용자가 제출, 관리자만 조회)
create table if not exists exchange_requests (
  id bigint generated always as identity primary key,
  name text not null,
  phone text not null,
  email text not null,
  send_coin text not null,          -- USDT 또는 VICT
  send_amount numeric not null,
  receive_coin text not null,       -- 대상 코인 symbol
  receive_amount numeric not null,  -- 계산된 예상 수량
  wallet_address text not null,     -- TRON 지갑 주소
  message text,
  created_at timestamptz not null default now()
);

-- 5) 문의하기 (홈페이지 문의 폼 - 이름/전화번호/이메일/메시지)
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
alter table coins enable row level security;
alter table site_settings enable row level security;
alter table exchange_requests enable row level security;
alter table contact_messages enable row level security;

-- 공개 조회 (누구나)
create policy "public read timeline" on timeline_events for select using (true);
create policy "public read coins" on coins for select using (active = true);
create policy "public read settings" on site_settings for select using (true);

-- 로그인한 관리자만 쓰기/수정/삭제, 그리고 coins는 비활성 항목까지 전부 조회 가능
create policy "admin write timeline" on timeline_events for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "admin all coins" on coins for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "admin write settings" on site_settings for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 교환 신청 : 누구나 등록 가능(회원가입 없음), 조회는 관리자만
create policy "public insert exchange" on exchange_requests for insert with check (true);
create policy "admin read exchange" on exchange_requests for select
  using (auth.role() = 'authenticated');

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

insert into coins (symbol, name, price_usdt, info_url, whitepaper_url, homepage_url, sort_order) values
  ('BTC', 'Bitcoin', 67235, '#', '#', '#', 1),
  ('ETH', 'Ethereum', 2355, '#', '#', '#', 2),
  ('BLC', 'BLC Coin', 1.72, '#', '#', '#', 3);
