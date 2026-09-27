-- ========================================================
-- PrintTrack - Seed Data
-- ========================================================

-- Insert Initial Java Project Report Upload Section
insert into public.upload_sections (id, title, slug, description, deadline, xerox_rate, allowed_file_types, max_file_size, status, public_submission_list)
values
(
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'Java Project Report',
    'java-project-report',
    'Upload your completed Java project report including source code documentation and test screenshots.',
    '2026-09-30 23:59:59+00',
    25.00,
    array['pdf'],
    10,
    'open',
    true
)
on conflict (slug) do nothing;
