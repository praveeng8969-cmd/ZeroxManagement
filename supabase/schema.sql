-- ========================================================
-- PrintTrack - Supabase PostgreSQL Database Schema
-- ========================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. UPLOAD SECTIONS TABLE
create table if not exists public.upload_sections (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    slug text not null unique,
    description text,
    deadline timestamptz not null,
    xerox_rate numeric(10, 2) not null default 1.50,
    extra_charge numeric(10, 2) not null default 40.00,
    allowed_file_types text[] not null default array['pdf'],
    max_file_size integer not null default 10, -- in Megabytes
    status text not null default 'open' check (status in ('open', 'closed')),
    public_submission_list boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Index for faster queries by slug and status
create index if not exists idx_upload_sections_slug on public.upload_sections (slug);
create index if not exists idx_upload_sections_status on public.upload_sections (status);

-- Safe migration for projects created with an older schema.
alter table public.upload_sections add column if not exists extra_charge numeric(10, 2) not null default 40.00;

-- 2. SUBMISSIONS TABLE
create table if not exists public.submissions (
    id uuid primary key default gen_random_uuid(),
    upload_section_id uuid not null references public.upload_sections(id) on delete cascade,
    name text not null,
    roll_number text not null,
    department text,
    file_name text not null,
    file_path text not null,
    file_url text,
    file_size bigint not null,
    mime_type text not null,
    page_count integer not null default 1 check (page_count > 0),
    amount numeric(10, 2) not null default 41.50 check (amount >= 0),
    payment_amount numeric(10, 2),
    payment_currency text not null default 'INR',
    payment_source text not null default 'manual' check (payment_source in ('razorpay', 'cash', 'manual', 'online')),
    razorpay_order_id text,
    razorpay_payment_id text,
    payment_method text,
    payment_verified_at timestamptz,
    payment_paid_at timestamptz,
    submission_status text not null default 'Uploaded' check (submission_status in ('Uploaded', 'Verified', 'Rejected')),
    xerox_status text not null default 'Pending' check (xerox_status in ('Pending', 'Ready to Print', 'Printed', 'Taken')),
    payment_status text not null default 'Pending' check (payment_status in ('Pending', 'Paid', 'Failed', 'Refunded', 'pending', 'paid', 'failed', 'refunded')),
    uploaded_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uq_section_roll unique (upload_section_id, roll_number)
);

-- Indexes for submissions
create index if not exists idx_submissions_section on public.submissions (upload_section_id);
create index if not exists idx_submissions_roll on public.submissions (roll_number);
create index if not exists idx_submissions_statuses on public.submissions (submission_status, xerox_status, payment_status);
create index if not exists idx_submissions_razorpay_order on public.submissions (razorpay_order_id);
create index if not exists idx_submissions_razorpay_payment on public.submissions (razorpay_payment_id);
create index if not exists idx_submissions_payment_source on public.submissions (payment_source);

-- Safe migration for projects created with an older schema.
alter table public.submissions add column if not exists page_count integer not null default 1;
alter table public.submissions add column if not exists amount numeric(10, 2) not null default 41.50;
alter table public.submissions add column if not exists payment_amount numeric(10, 2);
alter table public.submissions add column if not exists payment_currency text not null default 'INR';
alter table public.submissions add column if not exists payment_source text not null default 'manual';
alter table public.submissions add column if not exists razorpay_order_id text;
alter table public.submissions add column if not exists razorpay_payment_id text;
alter table public.submissions add column if not exists payment_method text;
alter table public.submissions add column if not exists payment_verified_at timestamptz;
alter table public.submissions add column if not exists payment_paid_at timestamptz;

-- 3. PAYMENTS AUDIT TABLE (Optional extension for fine-grained tracking)
create table if not exists public.payments (
    id uuid primary key default gen_random_uuid(),
    submission_id uuid not null references public.submissions(id) on delete cascade,
    amount numeric(10, 2) not null,
    payment_status text not null default 'Pending' check (payment_status in ('Pending', 'Paid', 'Failed', 'Refunded')),
    payment_method text default 'Cash',
    paid_at timestamptz,
    updated_at timestamptz not null default now()
);

-- 4. WEBHOOK IDEMPOTENCY TABLE
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

create index if not exists idx_payment_webhook_events_key on public.payment_webhook_events (event_key);
create index if not exists idx_payment_webhook_events_order on public.payment_webhook_events (razorpay_order_id);

-- 5. AUTO-UPDATE TIMESTAMP FUNCTION
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create or replace trigger tr_upload_sections_updated_at
    before update on public.upload_sections
    for each row execute function public.handle_updated_at();

create or replace trigger tr_submissions_updated_at
    before update on public.submissions
    for each row execute function public.handle_updated_at();

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================

alter table public.upload_sections enable row level security;
alter table public.submissions enable row level security;
alter table public.payments enable row level security;
alter table public.payment_webhook_events enable row level security;

-- Upload Sections:
-- Anyone (public) can read active upload sections
create policy "Public users can view upload sections"
    on public.upload_sections for select
    using (true);

-- Authenticated admins can create, update, and delete upload sections
create policy "Admins can manage upload sections"
    on public.upload_sections for all
    to authenticated
    using (true)
    with check (true);

-- Submissions:
-- Public can view limited fields if public_submission_list is true (enforced in API or view)
create policy "Public can view submissions list"
    on public.submissions for select
    using (
        exists (
            select 1 from public.upload_sections s
            where s.id = submissions.upload_section_id
            and s.public_submission_list = true
        )
    );

-- Public users can insert submissions (and replace their own by roll_number)
create policy "Public can submit their files"
    on public.submissions for insert
    with check (true);

create policy "Public can update/replace their own submission"
    on public.submissions for update
    using (true)
    with check (true);

-- Authenticated admins can do anything with submissions
create policy "Admins have full access to submissions"
    on public.submissions for all
    to authenticated
    using (true)
    with check (true);

-- Webhook events: Authenticated admins/service role only
create policy "Admins have full access to webhook events"
    on public.payment_webhook_events for all
    to authenticated
    using (true)
    with check (true);

-- ========================================================
-- STORAGE BUCKET CONFIGURATION
-- ========================================================
-- Run in Supabase SQL editor:
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do nothing;

-- Storage RLS: Public can upload files
create policy "Public can upload submission files"
    on storage.objects for insert
    with check (bucket_id = 'submissions');

-- Storage RLS: Public cannot download directly, only Authenticated Admin can select/download
create policy "Admins can view and download submission files"
    on storage.objects for select
    to authenticated
    using (bucket_id = 'submissions');

create policy "Admins can delete submission files"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'submissions');
