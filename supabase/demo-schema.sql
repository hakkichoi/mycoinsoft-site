-- ============================================================
-- DEMO 코인사이트 샘플 (landing01 / admin01) — Supabase 스키마
-- 기존 마이코인소프트 본 사이트 테이블과는 완전히 별개입니다.
-- Supabase 대시보드 > SQL Editor 에 전체를 붙여넣고 Run 하세요.
-- ============================================================

-- 1) 데모 회원
create table if not exists demo_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  pin text not null,                 -- 4자리 데모 로그인 PIN (실제 비밀번호 아님)
  wallet_balance numeric not null default 1000000,   -- 데모 지급금 (가상 원화)
  referral_code text not null unique,
  referred_by text references demo_users(referral_code),
  created_at timestamptz not null default now()
);

-- 2) 입출금 신청
create table if not exists demo_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references demo_users(id) on delete cascade,
  type text not null check (type in ('deposit', 'withdraw')),
  amount numeric not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- 3) 공지사항
create table if not exists demo_notices (
  id bigint generated always as identity primary key,
  title text not null,
  content text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- RLS — 이 데모는 로그인 없이 관리자 화면까지 전부 "공개"하는 것이
-- 요청사항이라, 아래 정책은 의도적으로 매우 개방적입니다.
-- (실제 서비스라면 절대 이렇게 열어두면 안 됩니다. 데모용 가짜 데이터만
-- 다루는 페이지라는 전제 하에 이렇게 구성했습니다.)
-- ============================================================
alter table demo_users enable row level security;
alter table demo_transactions enable row level security;
alter table demo_notices enable row level security;

create policy "public all demo_users" on demo_users for all using (true) with check (true);
create policy "public all demo_transactions" on demo_transactions for all using (true) with check (true);
create policy "public all demo_notices" on demo_notices for all using (true) with check (true);

-- ============================================================
-- 샘플 공지 데이터
-- ============================================================
insert into demo_notices (title, content, pinned) values
  ('DEMO 코인사이트 체험 안내', '이 페이지는 마이코인소프트가 제작하는 코인 홈페이지 샘플입니다. 실제 자산이 아닌 가상의 데모 데이터로 동작합니다.', true);
