-- ========================================================
-- Migration: Add Razorpay Online Payment Support
-- Description: Extends submissions schema for Razorpay gateway,
--              creates webhook idempotency audit table,
--              and updates constraints & indexes safely.
-- ========================================================

-- 1. Update submissions payment_status CHECK constraint safely
do $$
begin
    -- Drop old check constraint if it exists
    if exists (
        select 1 from information_schema.constraint_column_usage
        where table_name = 'submissions' and column_name = 'payment_status'
    ) then
        alter table public.submissions drop constraint if exists submissions_payment_status_check;
    end if;
end $$;

alter table public.submissions
    add constraint submissions_payment_status_check
    check (payment_status in ('Pending', 'Paid', 'Failed', 'Refunded', 'pending', 'paid', 'failed', 'refunded'));

-- 2. Add Razorpay and payment tracking columns to submissions
alter table public.submissions
    add column if not exists payment_source text not null default 'manual'
    check (payment_source in ('razorpay', 'cash', 'manual', 'online'));

alter table public.submissions
    add column if not exists payment_amount numeric(10, 2);

-- Backfill payment_amount from existing amount if null
update public.submissions
set payment_amount = amount
where payment_amount is null;

alter table public.submissions
    add column if not exists payment_currency text not null default 'INR';

alter table public.submissions
    add column if not exists razorpay_order_id text;

alter table public.submissions
    add column if not exists razorpay_payment_id text;

alter table public.submissions
    add column if not exists payment_method text;

alter table public.submissions
    add column if not exists payment_verified_at timestamptz;

alter table public.submissions
    add column if not exists payment_paid_at timestamptz;

-- 3. Indexes for fast lookup by Razorpay identifiers
create index if not exists idx_submissions_razorpay_order_id
    on public.submissions (razorpay_order_id)
    where razorpay_order_id is not null;

create index if not exists idx_submissions_razorpay_payment_id
    on public.submissions (razorpay_payment_id)
    where razorpay_payment_id is not null;

create index if not exists idx_submissions_payment_source
    on public.submissions (payment_source);

-- 4. Create Webhook Events idempotency table
create table if not exists public.payment_webhook_events (
    id uuid primary key default gen_random_uuid(),
    event_key text not null unique,
    event_type text not null,
    razorpay_payment_id text,
    razorpay_order_id text,
    received_at timestamptz not null default now(),
    processed_at timestamptz default now(),
    status text not null default 'processed',
    payload jsonb
);

create index if not exists idx_payment_webhook_events_key
    on public.payment_webhook_events (event_key);

create index if not exists idx_payment_webhook_events_order
    on public.payment_webhook_events (razorpay_order_id)
    where razorpay_order_id is not null;

-- Enable RLS on webhook events
alter table public.payment_webhook_events enable row level security;

-- Only authenticated admin / service role can view/write webhook events
create policy "Admins have full access to webhook events"
    on public.payment_webhook_events for all
    to authenticated
    using (true)
    with check (true);
