-- ============================================================
-- DEMO 코인사이트 샘플 (landing01 / admin01) — v3 스키마
-- 이미 v1/v2 스키마를 실행하신 경우, 이 파일은 안전하게 그 위에
-- 추가로 실행할 수 있도록 작성했습니다 (기존 테이블/데이터를 지우지 않음).
-- Supabase 대시보드 > SQL Editor 에 전체를 붙여넣고 Run 하세요.
-- ============================================================

-- 1) 회원 테이블에 MyCoin 잔고 컬럼 추가
alter table demo_users add column if not exists mycoin_balance numeric not null default 500;

-- 기존 user_1 계정 MyCoin 잔고 기본값 세팅 (없을 때만)
update demo_users set mycoin_balance = 500 where username = 'user_1' and mycoin_balance = 0;

-- 2) 코인교환 신청 (MyCoin ⇄ USDT)
create table if not exists demo_exchange_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references demo_users(id) on delete cascade,
  direction text not null check (direction in ('buy', 'sell')),  -- buy: USDT→MyCoin, sell: MyCoin→USDT
  mycoin_amount numeric not null check (mycoin_amount > 0),
  usdt_amount numeric not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- 3) 사이트 설정 (환율 등 key-value) — 기존에 site_settings를 지우셨다면 재생성됩니다
create table if not exists demo_settings (
  key text primary key,
  value text not null
);
insert into demo_settings (key, value) values ('exchange_rate', '24')
  on conflict (key) do nothing;

-- 4) 차트 데이터 — 거래량 (10칸, 1~5는 고정 시드, 6~10은 비워둠)
create table if not exists demo_chart_volume (
  slot_index int primary key check (slot_index between 1 and 10),
  value numeric
);
insert into demo_chart_volume (slot_index, value) values
  (1, 2525600), (2, 1774520), (3, 55109010), (4, 3227735), (5, 4992550),
  (6, null), (7, null), (8, null), (9, null), (10, null)
on conflict (slot_index) do nothing;

-- 5) 차트 데이터 — 가격 (10칸, USD, 1~5는 고정 시드, 6~10은 비워둠)
create table if not exists demo_chart_price (
  slot_index int primary key check (slot_index between 1 and 10),
  value numeric
);
insert into demo_chart_price (slot_index, value) values
  (1, 23.012), (2, 23.088), (3, 24.020), (4, 23.061), (5, 24.066),
  (6, null), (7, null), (8, null), (9, null), (10, null)
on conflict (slot_index) do nothing;

-- 6) 뉴스레터 구독 (샘플 전용 — 실제 마이코인소프트 뉴스레터와 별개)
create table if not exists demo_newsletter (
  id bigint generated always as identity primary key,
  email text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- RLS — 이 데모는 관리자 화면까지 전부 "공개"하는 것이 요청사항이라
-- 아래 정책은 의도적으로 매우 개방적입니다. (실제 서비스에는 이렇게
-- 열어두면 안 됩니다. 가짜 데이터만 다루는 데모 페이지 전제입니다.)
-- ============================================================
alter table demo_exchange_requests enable row level security;
alter table demo_settings enable row level security;
alter table demo_chart_volume enable row level security;
alter table demo_chart_price enable row level security;
alter table demo_newsletter enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'demo_exchange_requests' and policyname = 'public all demo_exchange_requests') then
    create policy "public all demo_exchange_requests" on demo_exchange_requests for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'demo_settings' and policyname = 'public all demo_settings') then
    create policy "public all demo_settings" on demo_settings for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'demo_chart_volume' and policyname = 'public all demo_chart_volume') then
    create policy "public all demo_chart_volume" on demo_chart_volume for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'demo_chart_price' and policyname = 'public all demo_chart_price') then
    create policy "public all demo_chart_price" on demo_chart_price for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'demo_newsletter' and policyname = 'public all demo_newsletter') then
    create policy "public all demo_newsletter" on demo_newsletter for all using (true) with check (true);
  end if;
end $$;
