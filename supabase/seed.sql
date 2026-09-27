-- ========================================================
-- PrintTrack - Seed Data
-- ========================================================

-- Insert Sample Upload Sections
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
),
(
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    'DBMS Record',
    'dbms-record',
    'Submit completed Database Management Systems laboratory exercises and SQL query outputs.',
    '2026-10-15 23:59:59+00',
    20.00,
    array['pdf', 'docx'],
    15,
    'open',
    true
),
(
    'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
    'DSA Assignment',
    'dsa-assignment',
    'Data Structures and Algorithms theoretical analysis and tree traversal assignment.',
    '2026-09-20 23:59:59+00',
    10.00,
    array['pdf'],
    5,
    'closed',
    true
)
on conflict (slug) do nothing;

-- Insert Sample Submissions
insert into public.submissions (
    id, upload_section_id, name, roll_number, department, file_name, file_path, file_size, mime_type, submission_status, xerox_status, payment_status, uploaded_at
)
values
(
    'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'PRAVEEN G',
    '25CS174',
    'CSE',
    'Java_Project_Report_Praveen.pdf',
    'java-project-report/25CS174/Java_Project_Report_Praveen.pdf',
    2457600,
    'application/pdf',
    'Verified',
    'Printed',
    'Paid',
    '2026-09-27 14:30:00+00'
),
(
    'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'PRIYA R',
    '25CS175',
    'CSE',
    'Java_Report_Final_Priya.pdf',
    'java-project-report/25CS175/Java_Report_Final_Priya.pdf',
    3145728,
    'application/pdf',
    'Verified',
    'Ready to Print',
    'Pending',
    '2026-09-27 14:35:00+00'
),
(
    'f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c',
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'RAHUL M',
    '25CS180',
    'IT',
    'Rahul_Java_MiniProject.pdf',
    'java-project-report/25CS180/Rahul_Java_MiniProject.pdf',
    1845720,
    'application/pdf',
    'Uploaded',
    'Pending',
    'Pending',
    '2026-09-27 14:40:00+00'
),
(
    '0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
    'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    'ANANYA K',
    '25IT012',
    'IT',
    'DBMS_Record_Queries.pdf',
    'dbms-record/25IT012/DBMS_Record_Queries.pdf',
    4194304,
    'application/pdf',
    'Verified',
    'Taken',
    'Paid',
    '2026-09-26 11:20:00+00'
)
on conflict do nothing;
