# PrintTrack - Student Xerox & Printing Management Web Application

**PrintTrack** is a modern, responsive, production-ready web application designed for campus Xerox / printing centers and student document collection. It streamlines the student submission workflow with automatic page counting, real-time printing queue status, and integrated **Razorpay Online Payments**.

---

## 🌟 Key Features

### 1. Public Student Portal (No Account Required)
- **Direct Access**: Anyone with the section link can upload their document directly. No student signup or login required.
- **Dynamic Xerox Rates**: Each upload section defines its own Xerox rate (e.g. Java Project Report → ₹25, DBMS Record → ₹20, DSA Assignment → ₹10).
- **Automated Page & Price Snapshotting**: Automatically detects PDF page counts and snapshots the final Xerox charge at submission time so future rate changes never alter previously uploaded submissions.
- **Duplicate Prevention & Replacement**: Detects existing submissions for the same `(Upload Section + Roll Number)` and allows confirmation to replace.
- **Seamless Razorpay Online Payment Flow**:
  1. Student uploads document
  2. Submission created with unique, secure 128-bit UUID
  3. Digital Xerox payment section displayed:
     ```
     Submission Successful ✅
     PRAVEEN G
     25CS174
     Java Project Report
     Xerox Charge: ₹25
     Payment Status: Pending
     [ Pay ₹25 ]
     ```
  4. Standard Razorpay Checkout opens with UPI, NetBanking, Cards, and Wallets
  5. Server-side HMAC SHA256 timing-safe verification verifies payment with Razorpay
  6. Submission status updates to **Paid** automatically
  7. Success confirmation displays verified Payment ID, link to live status tracker, and print option.
- **Fail-Safe & Retry Support**: If a payment is cancelled or declined, the student's uploaded file is safe and intact. A clear "Retry Payment" option is provided.
- **Live Submission Status Page** (`/submissions/status/[id]`):
  - File: Uploaded ✅
  - Payment: ₹25 Paid ✅ (or ₹25 Pending with `[ Pay ₹25 ]`)
  - Verification: Pending / Verified
  - Printing: Pending / Ready to Print / Printed
  - Xerox: Pending / Taken

### 2. Administrator Portal (`/admin`)
- **Executive Dashboard** (`/admin`):
  - 8 real-time KPI metrics: Total Sections, Total Submissions, Ready to Print, Printed, Xerox Taken, Expected Revenue, Received Amount, and Outstanding Pending Amount.
  - Recent submissions queue with instant one-click status updates.
- **Payment & Collections Center** (`/admin/payments`):
  - Section-wise revenue summary with Base Rate, Total Files, Paid, Pending, Expected, Received, and Pending balance.
  - Student payment roster with search by name, roll number, upload section, or Razorpay payment ID.
  - Status filters: **All**, **Paid**, **Pending**, **Failed**, **Refunded**.
  - Distinct tracking between **Razorpay Online** payments and **Cash / Counter** manual collections.
  - Verified payment protection: Prevents accidental overwriting of verified Razorpay payment IDs.
  - Detailed payment inspection modal showing status, payment source, method (UPI, Card, etc.), Payment ID, Order ID, and exact timestamp.
- **Upload Sections Management** (`/admin/uploads`):
  - Create and configure upload sections with custom per-page rates and base charges.
- **Submissions Manager & ZIP Packaging** (`/admin/submissions`):
  - Bulk actions: Mark Printed, Mark Taken, Mark Paid, Verify, Delete.
  - Single-click ZIP download with standardized file naming: `ROLLNUMBER_NAME_FILENAME.pdf`.

---

## 💳 Razorpay Payment Gateway Integration

### Security Principles Enforced
1. **Zero Client Trust for Amounts**: The browser NEVER decides the payment amount. The server reads the authoritative rate from the database record and generates the order server-side.
2. **Secret Keys Never Exposed**: `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are strictly kept server-side. Only `NEXT_PUBLIC_RAZORPAY_KEY_ID` is accessible to the frontend.
3. **Cryptographic HMAC SHA256 Verification**: Payments are verified using timing-safe comparisons against the stored order ID in our database.
4. **Authoritative API Verification**: Payment status is fetched from Razorpay's API server-side to confirm captured state, amount, and currency.
5. **Idempotent Webhooks**: The webhook endpoint processes raw unparsed payloads, verifies signatures, and tracks processed events in `payment_webhook_events` to prevent duplicate crediting.

---

## 🛠 Razorpay Setup Guide

### Step 1: Open Razorpay Dashboard & Get API Keys
1. Log in to your [Razorpay Dashboard](https://dashboard.razorpay.com/).
2. In the top-left or top-right, ensure you are in **Test Mode** (toggle button says "Test Mode").
3. Navigate to **Account & Settings** → **API Keys** (under *Website and app settings*).
4. Click **Generate Test Key** (or *Regenerate Key* if already created).
5. Copy your **Key ID** (`rzp_test_...`) and **Key Secret**.

### Step 2: Configure Local Environment Variables
Open `.env.local` in your project root and add:
```env
# Razorpay Configuration
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=yyyyyyyyyyyyyyyyyyyyyyyy
RAZORPAY_WEBHOOK_SECRET=your_local_webhook_secret_here
```
*(Replace `rzp_test_xxxxxxxxxxxxxxxx` and `yyyyyyyyyyyyyyyyyyyyyyyy` with your actual test keys)*.

### Step 3: Enable Auto-Capture in Razorpay
1. In Razorpay Dashboard, go to **Account & Settings** → **Payment capture settings**.
2. Set **Capture automatically** to **Automatically capture all payments immediately** (default recommended).
3. Save changes.

### Step 4: Configure Webhooks
Webhooks ensure that even if a student closes their browser or loses internet immediately after payment, the server receives the notification and marks the submission as **Paid**.

#### 4A. For Local Development (Webhook Tunneling)
Because Razorpay needs a public URL to send webhooks to, you can use a tunneling tool such as `ngrok` or `localtunnel`:
```bash
# Using ngrok
npx ngrok http 3000

# Or using localtunnel
npx localtunnel --port 3000
```
Copy the generated HTTPS URL (e.g. `https://random-subdomain.ngrok-free.app`).

#### 4B. Add Webhook in Razorpay Dashboard
1. In Razorpay Dashboard, go to **Account & Settings** → **Webhooks**.
2. Click **Add New Webhook**.
3. **Webhook URL**:
   - For local testing: `https://your-ngrok-domain.ngrok-free.app/api/webhooks/razorpay`
   - For production: `https://your-custom-domain.com/api/webhooks/razorpay`
4. **Secret**: Enter a strong secret string (e.g. `PrintTrackWebhookSecret2026`).
5. Set `RAZORPAY_WEBHOOK_SECRET=PrintTrackWebhookSecret2026` in your `.env.local` / production environment.
6. **Active Events**: Select the following required events:
   - `payment.captured`
   - `order.paid`
   - `payment.failed`
   - `refund.processed`
7. Click **Create Webhook**.

### Step 5: Execute Database Migration in Supabase
Run the provided SQL migration in your Supabase project's **SQL Editor**:
File path: [`supabase/migrations/20260929_razorpay_integration.sql`](file:///c:/Users/LENOVO/OneDrive/Desktop/zerox%20management/supabase/migrations/20260929_razorpay_integration.sql)

This safely adds:
- `payment_source`, `payment_amount`, `payment_currency`, `razorpay_order_id`, `razorpay_payment_id`, `payment_method`, `payment_verified_at`, `payment_paid_at` columns.
- Indexes for instant lookups on `razorpay_order_id` and `razorpay_payment_id`.
- `payment_webhook_events` audit table for strict webhook idempotency.

### Step 6: Testing the Integration
1. Start your local server:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:3000`.
3. Open an active upload section (e.g. **Java Project Report**).
4. Enter test student details:
   - Name: `PRAVEEN G`
   - Roll Number: `25CS174`
   - Select or drag a PDF document.
5. Click **Upload & Submit Document**.
6. The payment section will appear showing the exact calculated Xerox charge.
7. Click **[ Pay ₹XX ]**. The Razorpay Checkout modal will open.
8. Use Razorpay's Test Credentials:
   - **UPI**: Enter `success@razorpay` and approve.
   - **Card**: Use Razorpay test card numbers (e.g. `4111 1111 1111 1111`, expiry any future date, CVV `123`).
9. Upon completion, the server will cryptographically verify the signature and display:
   ```
   Payment Successful ✅
   ₹25 Paid
   Payment ID: pay_xxxxxxxx
   ```
10. Open the Admin Portal at `http://localhost:3000/admin/payments` to see the live record updated with **Paid (Razorpay)** and the transaction ID.

### Step 7: Switching to Live Mode (Production)
Going live requires **NO code rewrite**. Only environment variables:
1. In the Razorpay Dashboard, toggle from **Test Mode** to **Live Mode**.
2. Go to **Account & Settings** → **API Keys** and generate **Live Key ID** (`rzp_live_...`) and **Live Key Secret**.
3. In your production hosting environment (e.g. Vercel, Railway, VPS):
   ```env
   NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your_live_secret_here
   RAZORPAY_WEBHOOK_SECRET=your_live_webhook_secret_here
   ```
4. Create a production webhook pointing to:
   `https://your-production-domain.com/api/webhooks/razorpay`
   with your live webhook secret and the 4 required events (`payment.captured`, `order.paid`, `payment.failed`, `refund.processed`).

---

## 🔑 Admin Access Credentials

- **Admin Route**: `/admin` (or `/admin/login`)
- **Default Email**: `praveeng8969@gmail.com`
- **Default Password**: `PRAVEEN@008969`

---

## 📂 Architecture Overview

```
├── supabase/
│   ├── schema.sql                                # Complete database schema with RLS
│   └── migrations/
│       └── 20260929_razorpay_integration.sql     # Safe idempotent database migration
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── payments/
│   │   │   │   ├── create-order/route.ts         # Secure server order creation
│   │   │   │   └── verify/route.ts               # Timing-safe HMAC SHA256 payment verification
│   │   │   ├── webhooks/
│   │   │   │   └── razorpay/route.ts             # Raw body signature verification & idempotent handler
│   │   │   └── submissions/
│   │   │       ├── [id]/route.ts                 # Public status lookup
│   │   │       ├── route.ts                      # Submissions list and delete
│   │   │       └── status/route.ts               # Admin status toggle
│   │   ├── submissions/
│   │   │   ├── [slug]/page.tsx                   # Public submissions queue
│   │   │   └── status/[id]/page.tsx              # Live student status tracker with payment button
│   │   ├── upload/[slug]/page.tsx                # Public document upload & Razorpay checkout
│   │   └── admin/
│   │       ├── page.tsx                          # Admin Dashboard with live financial metrics
│   │       ├── payments/page.tsx                 # Payment reconciliation (Razorpay vs Cash)
│   │       └── submissions/page.tsx              # Submission queue & bulk actions
│   ├── components/
│   │   ├── payment/
│   │   │   ├── RazorpayPaymentButton.tsx         # Payment button with loading, verifying & retry states
│   │   │   └── PaymentCard.tsx                   # Receipt & digital payment card
│   │   ├── StatusBadge.tsx                       # Semantic badges (Green, Orange, Red, Purple)
│   │   └── PaymentStatusSelector.tsx             # Admin selector distinguishing Razorpay vs Cash
│   └── lib/
│       ├── payments/
│       │   ├── money.ts                          # Floating-point safe paise/rupees conversions
│       │   ├── razorpay.ts                       # Server Razorpay instance & credential helpers
│       │   ├── verifySignature.ts                # Timing-safe HMAC verification
│       │   └── loadScript.ts                     # Razorpay checkout.js script loader
│       └── data-store.ts                         # Data repository with real-time sync
```
