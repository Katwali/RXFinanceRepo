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

├── vercel.json          # Vercel deployment + iframe headers

├── js/

│   ├── config.js        # Supabase client initialization

│   ├── state.js         # Global AppState pub/sub object

│   ├── auth.js          # Client auth (email/password)

│   ├── client-ui.js     # Client portal UI and logic

│   └── admin-ui.js      # Admin portal UI and logic

└── css/

├── client.css       # Client portal styles

└── admin.css        # Admin portal styles

## Supabase Config
- Project URL: https://xxdaqxefkofmvgrgcewo.supabase.co
- Auth: Email/password, no email confirmation
- Storage bucket: kyc-documents (private, signed URLs)

## Database Tables
- profiles — extends auth.users (full_name, phone, id_number)
- applications — loan applications (amount, term_months, total_repayable, status)
- repayments — installment schedule (due_date, amount, status)
- documents — KYC file references (doc_type, file_url)
- contracts — e-signatures (signature_data)

## Application Status Flow
pending → review → approved → disbursed → active → completed
                ↘ rejected

## Business Rules
- Interest rate: 30% flat on principal
- Total repayable = principal + (principal × 0.30)
- Monthly installment = total repayable / term months
- Repayment schedule auto-generated on approval

## Admin Access
- Admin emails hardcoded in admin-ui.js ADMIN_EMAILS array
- Admin RLS policy based on user UUID: 69d9797e-a499-49b8-bfa7-e796e83d51cf
- Current admin: cartallax2013@gmail.com

## Live URLs
- Client portal: https://rxf-inance-repo.vercel.app/client.html
- Admin portal: https://rxf-inance-repo.vercel.app/admin.html
- Vercel dashboard: https://vercel.com/parallax-tech/rxf-inance-repo

## Known Issues / TODO
- [ ] Email notifications when loan approved
- [ ] Multiple admin user support
- [ ] Mobile UI polish
- [ ] Proper role-based auth (currently hardcoded admin email)
- [ ] Payment tracking via EasyWallet/Pay2Phone/FNB
- [ ] Overdue loan detection and alerts

## Deploy Command
```bash
vercel --prod
```

## Important Notes
- Auth uses localStorage (not cookies) to survive Google Sites iframe
- Supabase JS loaded via CDN in each HTML file
- No build step — pure static files
- Scripts must load in order: config.js → state.js → client-ui.js → auth.js
