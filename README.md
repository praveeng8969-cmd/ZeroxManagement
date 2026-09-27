# PrintTrack - Student Xerox & Printing Management Web Application

**PrintTrack** is a modern, responsive, production-ready web application designed for campus Xerox / printing centers and student document collection. It replaces disorganized WhatsApp groups, shared Google Drive folders, and manual cash tracking with a streamlined 6-step upload flow, live printing queue status, and automatic revenue calculation.

---

## 🌟 Key Features

### 1. Public Student Portal (No Login Required)
- **Direct Access**: Anyone with the link can open the homepage or section link directly. No user registration, password setup, or email verification needed.
- **Java Project Report Upload**: Clean, focused interface displaying the active Xerox printing rate (**₹25**), deadline, accepted formats (**PDF**), and upload button.
- **Formatting Caution Alert**: Prominent notice reminding students to check document alignment and strongly recommending PDF format to prevent print formatting discrepancies.
- **Duplicate Prevention & Replacement**: Detects existing submissions for the same `(Upload Section + Roll Number)`. Prompts the student with a confirmation dialog to either replace their previous file or cancel.
- **Privacy-Protected Public Status**: Students can verify their roll number and submission timestamp on the public roster (`/submissions/java-project-report`) without exposing file downloads to other users.

### 2. Administrator Portal (`/admin`)
- **Direct Dedicated Route**: Admin access is kept exclusively at `/admin` (not linked in the public student header).
- **Executive Dashboard**:
  - Real-time KPI statistics: Total Upload Sections, Total Submissions, Ready to Print, Printed, Xerox Taken, Expected Revenue, Received Collections, and Outstanding Pending Amount.
  - Recent submissions queue with instant one-click status transitions (Print, Taken, Paid, Unpaid).
- **Upload Sections Management**:
  - Dynamic section creation and editing (`/admin/uploads/new`, `/admin/uploads/[id]/edit`).
  - Configurable printing rate per section (e.g., ₹25, ₹40), submission deadlines, allowed file types, and maximum file sizes.
  - Quick toggle to Open or Close sections.
- **Submission Roster & Bulk Operations**:
  - Global submission manager (`/admin/submissions`) with search by student name, roll number, or department.
  - Multi-select bulk actions: Mark Verified, Mark Ready to Print, Mark Printed, Mark Taken, Mark Paid, Delete Selected.
- **Download All Files (ZIP)**:
  - Bundles all submitted documents into a single ZIP archive.
  - Automatically renames files using the standard format:
    ```
    ROLLNUMBER_NAME_FILENAME.pdf
    Example: 25CS174_PRAVEEN_G_Java_Project_Report.pdf
    ```
- **Automated Financial Tracking (`/admin/payments`)**:
  - Real-time collection calculations:
    $$\text{Expected} = \text{Total Submissions} \times \text{Rate}$$
    $$\text{Received} = \text{Paid Submissions} \times \text{Rate}$$
    $$\text{Pending} = \text{Expected} - \text{Received}$$
  - Section-wise summary table and individual student payment ledger with instant toggle buttons.

---

## 🛠 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Linear / Vercel minimal aesthetic)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Storage, Supabase Auth)
- **Icons**: [Lucide React](https://lucide.dev/)
- **File Packaging**: [JSZip](https://stuk.github.io/jszip/)

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node.js v24)
- npm or pnpm

### 2. Installation
```bash
# Clone or navigate to the workspace
cd "zerox management"

# Install dependencies
npm install
```

### 3. Environment Configuration
Create `.env.local` using the provided template `.env.example`:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Admin Credentials (for instant local / demo access)
NEXT_PUBLIC_ADMIN_EMAIL=admin@printtrack.local
ADMIN_DEFAULT_PASSWORD=adminprinttrack2026
```

> **Note**: PrintTrack includes a high-fidelity local data layer with seed data. Even before configuring external Supabase credentials, the entire application is 100% interactive, testable, and persistent out of the box!

### 4. Supabase Database & Storage Setup (Optional for Live Production)
To connect your live Supabase project:
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard) and open the **SQL Editor**.
2. Run the SQL script located in [`supabase/schema.sql`](file:///c:/Users/LENOVO/OneDrive/Desktop/zerox%20management/supabase/schema.sql).
3. Optionally run [`supabase/seed.sql`](file:///c:/Users/LENOVO/OneDrive/Desktop/zerox%20management/supabase/seed.sql) to populate initial sample records.
4. Copy your Supabase Project URL and Anon Key into `.env.local`.

### 5. Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Admin Access

- **Admin Login Route**: [http://localhost:3000/admin](http://localhost:3000/admin) (redirects to `/admin/login`)
- **Admin Email**: `praveeng8969@gmail.com`
- **Admin Password**: `PRAVEEN@008969`

---

## 📂 Project Structure

```
├── supabase/
│   ├── schema.sql         # PostgreSQL schema, RLS policies & storage configuration
│   └── seed.sql           # Initial seed data for upload sections and submissions
├── src/
│   ├── app/
│   │   ├── page.tsx               # Public homepage (Clean Java Report upload section)
│   │   ├── layout.tsx             # Root layout with brand header & footer
│   │   ├── globals.css            # Minimalist styling tokens & CSS variables
│   │   ├── upload/[slug]/page.tsx # Public student upload page with duplicate modal
│   │   ├── submissions/[slug]/page.tsx # Public submission list with privacy protection
│   │   └── admin/
│   │       ├── layout.tsx         # Protected admin layout with sidebar
│   │       ├── login/page.tsx     # Admin authentication page
│   │       ├── page.tsx           # Admin Dashboard (8 KPI cards & quick actions)
│   │       ├── uploads/page.tsx   # Manage all upload sections
│   │       ├── uploads/new/page.tsx # Create new upload section
│   │       ├── uploads/[id]/page.tsx # Section details, submissions & ZIP download
│   │       ├── uploads/[id]/edit/page.tsx # Edit section settings
│   │       ├── submissions/page.tsx # Global submissions queue & bulk actions
│   │       └── payments/page.tsx  # Revenue calculations & payment tracking
│   ├── components/
│   │   ├── Navbar.tsx             # Clean header (no public admin button)
│   │   ├── Footer.tsx             # Minimal footer
│   │   ├── AdminSidebar.tsx       # Desktop sidebar & mobile navigation drawer
│   │   ├── StatusBadge.tsx        # Semantic color-coded badges
│   │   ├── UploadSectionCard.tsx  # Section card
│   │   ├── StatCard.tsx           # KPI metric card
│   │   └── Modal.tsx              # Confirmation & dialog modal
│   ├── lib/
│   │   ├── auth.ts                # Admin authentication store
│   │   ├── data-store.ts          # Unified Supabase + local persistence data layer
│   │   ├── utils.ts               # Formatting, currency, dates, validation
│   │   ├── zip-download.ts        # Client-side ZIP packager (ROLLNUMBER_NAME_FILENAME)
│   │   └── supabase/client.ts     # Supabase client initializer
│   └── types/
│       └── index.ts               # TypeScript interface definitions
├── .env.example
├── .env.local
└── package.json
```
