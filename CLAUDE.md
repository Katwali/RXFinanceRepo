# RX Finance — Microloan Platform

## Project Overview
A microloan platform for the Namibian market built with vanilla HTML/CSS/JS and Supabase.

## Tech Stack
- Frontend: Vanilla HTML, CSS, JavaScript (no framework)
- Backend: Supabase (Postgres + Auth + Storage)
- Hosting: Vercel
- Embedded in: Google Sites via iframe

## Project Structure
RXFinanceRepo/

├── client.html          # Client portal (loan application, dashboard)

├── admin.html           # Admin portal (pipeline, approve/reject)

├── Logo-02.png          # RX Finance logo (used in topbars + login screens)

├── vercel.json          # Vercel deployment + iframe headers

├── js/

│   ├── config.js        # Supabase client initialization

│   ├── state.js         # Global AppState pub/sub object

│   ├── auth.js          # Client auth (email/password + forgot password)

│   ├── client-ui.js     # Client portal UI and logic

│   └── admin-ui.js      # Admin portal UI and logic

└── css/

├── client.css       # Client portal styles

└── admin.css        # Admin portal styles

## Brand / Design System
- Logo: `Logo-02.png` rendered via `.logo-img` (64px login) / `.logo-img-sm` (36px topbars)
- Color palette defined as CSS variables in both `client.css` and `admin.css`:
  - `--navy: #1B3A6B` — primary brand (buttons, headings, topbar, active states)
  - `--navy-light: #2C5490` — button gradient accent
  - `--navy-pale: #E8EDF5` — light navy backgrounds, focus rings
  - `--gold: #C9A84C` — hero tagline, pending/review badges, warning buttons
  - `--gold-light: #F5ECD0` — pending/review badge backgrounds
  - `--green: #2E7D52` — approved/success/active states
  - `--green-light: #DCEEE1` — approved badge backgrounds
  - `--red: #C0392B` — errors, rejected, overdue only
  - `--red-light: #F8D7D2` — error/rejected backgrounds
  - `--gray-bg: #F5F6FA` — page backgrounds
  - `--gray-dark: #2C2C2C` — body text
  - `--gray-mid: #6B7280` — labels, secondary text
  - `--gray-border: #E5E7EB` — borders, dividers
  - `--white: #FFFFFF`
- Topbar: navy background with gold bottom border
- Status badge mapping:
  - pending → gold
  - review → navy-pale
  - approved → green
  - active → navy-pale
  - disbursed → navy-pale
  - rejected → red
  - overdue → red
  - completed → gray

## Supabase Config
- Project URL: https://xxdaqxefkofmvgrgcewo.supabase.co
- Auth: Email/password, no email confirmation required
- Storage bucket: kyc-documents (private, signed URLs 60s expiry)
- Resend connected for SMTP email delivery

## Database Tables
- profiles — extends auth.users (full_name, phone, id_number)
- applications — loan applications (amount, term_months, total_repayable, status, admin_notes)
- repayments — installment schedule (due_date, amount, status, paid_date, transaction_ref)
- documents — KYC file references (doc_type, file_name, file_url)
- contracts — e-signatures (signature_data, signed_ip)

## Application Status Flow
pending → review → approved → disbursed → active → completed
                ↘ rejected

## Business Rules
- Interest rate: 30% flat on principal
- Total repayable = principal + (principal × 0.30)
- Monthly installment = total repayable / term months
- Minimum loan amount: N$500
- Repayment schedule auto-generated on admin approval
- Documents stored per user folder: {user_id}/{doc_type}_{timestamp}.{ext}

## Auth Flow
- Client: email/password login with Sign In / Register / Forgot Password tabs
- Password reset via Resend SMTP email
- Auth uses localStorage (not cookies) to survive Google Sites iframe
- Scripts load order: config.js → state.js → client-ui.js → auth.js
- All auth wrapped in DOMContentLoaded event

## Admin Access
- Admin emails hardcoded in ADMIN_EMAILS array in admin-ui.js
- Current admin: cartallax2013@gmail.com
- Admin UUID: 69d9797e-a499-49b8-bfa7-e796e83d51cf
- RLS policies on all tables use admin UUID directly
- Admin can: view all applications, approve/reject, generate repayment schedule, mark paid, view documents

## KYC Documents
Individual clients upload:
- id — National ID / Passport
- payslip — Latest payslip
- bank_statement — 3 months bank statement

SME clients upload:
- company_reg — BIPA registration
- owner_id — Director ID
- bank_statement — Business bank statement
- invoice — Invoice or quote

## Live URLs
- Client portal: https://rxf-inance-repo.vercel.app/client.html
- Admin portal: https://rxf-inance-repo.vercel.app/admin.html
- Vercel dashboard: https://vercel.com/parallax-tech/rxf-inance-repo

## Deploy Command
```powershell
git add .
git commit -m "your message"
git push origin main
vercel --prod
```

## Known Issues / TODO
- [ ] Email notifications to client when loan approved
- [ ] Multiple admin user support
- [ ] Mobile UI polish
- [ ] Proper role-based auth (currently hardcoded admin email)
- [ ] Payment tracking via EasyWallet/Pay2Phone/FNB
- [ ] Overdue loan auto-detection
- [ ] Client password reset flow (Resend SMTP connected, needs testing)
- [ ] Admin dashboard summary stats (total disbursed, revenue, collections)

## Important Notes
- No build step — pure static files served by Vercel
- Supabase JS loaded via CDN in each HTML file
- vercel.json sets frame-ancestors * to allow Google Sites iframe embedding
- Do NOT use fixed positioning (breaks iframe height)
- Do NOT change JS function names or element IDs without updating all references
- AppState is global pub/sub object — always use AppState.setState() to update