# Anubhav Medical Billing

A secure web-based medical billing system for pharmacies/medical stores to generate professional PDF invoices from structured bill and line-item data.

The project includes:
- Session-based admin authentication
- A responsive billing dashboard
- Server-side PDF generation using Playwright + Chromium

## Overview
Anubhav Medical Billing is a Node.js + Express application that serves a billing dashboard and generates printable A4 medical bill PDFs.

It is designed for fast invoice creation with store metadata, patient details, medicine line-items, discount handling, and amount-in-words formatting.

## Features
- Protected login page with admin credentials from environment variables
- Session-based access control (`express-session`)
- Auth-protected billing dashboard (`/`)
- Dynamic line item rows (add/remove)
- Auto amount calculation based on quantity, packing, MRP, and discount
- Manual amount support when quantity/MRP are not provided
- Server-side PDF generation (`/api/generate-pdf`)
- Multi-page PDF support for long item lists
- Indian number system amount-to-words formatting (e.g., Lakh/Crore)
- Clean printable invoice layout optimized for A4

## Tech Stack
### Backend
- Node.js
- Express 5
- Express Session
- Playwright (Chromium)
- Dotenv

### Frontend
- Vanilla HTML/CSS/JavaScript (served statically from `public/`)

## How It Works
1. User signs in at `/login` with admin credentials.
2. Server creates an authenticated session (`adarsh.sid` cookie).
3. User fills bill details, patient details, and line items on dashboard.
4. Frontend sends payload to `POST /api/generate-pdf`.
5. Backend renders bill HTML template and converts it to PDF via Playwright.
6. Browser downloads generated PDF file.

## Project Structure
```text
Anubhav-Billing/
  public/
    index.html
    login.html
    css/style.css
    js/app.js
  src/
    app.js
    controllers/
      auth.controller.js
      pdf.controller.js
    middleware/
      auth.middleware.js
    routes/
      auth.routes.js
      pdf.routes.js
    templates/
      medical-bill.template.js
  server.js
  package.json
```

## Prerequisites
- Node.js 18+
- npm 9+
- Chromium dependencies compatible with Playwright runtime

## Installation and Local Setup
1. Clone and enter project directory:
```bash
git clone <your-repository-url>
cd Anubhav-Billing
```

2. Install dependencies:
```bash
npm install
```

3. Install Playwright Chromium (required for PDF generation):
```bash
npm run build
```

4. Create `.env` file in project root:
```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password
ADMIN_NAME=Administrator
PORT=3000
```

5. Start the server:
```bash
npm start
```

6. Open in browser:
```text
http://localhost:3000/login
```

## Environment Variables
Required:
- `ADMIN_USERNAME`: Admin login username
- `ADMIN_PASSWORD`: Admin login password

Optional:
- `ADMIN_NAME`: Display name shown in toolbar after login
- `PORT`: Server port (default: `3000`)

## Usage Guide
1. Sign in from `/login`.
2. Fill store and bill details.
3. Fill patient details.
4. Add medicine line-items in the table.
5. Click `Generate PDF`.
6. Downloaded file name format:
   - `medical-bill-<billNo>.pdf` (if bill number is entered)
   - `medical-bill-invoice.pdf` (fallback)

## API Reference
Base URL (local):
```text
http://localhost:3000
```

### Authentication Routes
#### `POST /auth/login`
Login with admin credentials.

Request body:
```json
{
  "username": "admin",
  "password": "your-strong-password"
}
```

Success response:
```json
{
  "success": true,
  "user": {
    "username": "admin",
    "name": "Administrator"
  }
}
```

Error responses:
- `400`: Missing username/password
- `401`: Invalid credentials

#### `GET /auth/me`
Returns current session user.

Success:
```json
{
  "user": {
    "username": "admin",
    "name": "Administrator"
  }
}
```

Error:
- `401`: Session expired/not authenticated

#### `POST /auth/logout`
Destroys current session.

Success:
```json
{
  "success": true
}
```

### PDF Route (Protected)
#### `POST /api/generate-pdf`
Generates and returns PDF (`application/pdf`).

Minimum example request:
```json
{
  "storeName": "KRISHNA MEDICAL STORE",
  "billNo": "KMS00226",
  "billDate": "04/01/2026",
  "patientName": "Rahul Sharma",
  "items": [
    {
      "productName": "Dolo 650",
      "packing": "10x15",
      "batchNo": "D650A21",
      "exp": "12/27",
      "quantity": "30",
      "mrp": "35",
      "discount": "5",
      "amount": "66.50"
    }
  ]
}
```

Response:
- `200`: Binary PDF stream with `Content-Disposition: attachment`
- `401`: Unauthorized
- `500`: PDF generation failed

## PDF Data Model
Top-level supported fields include:
- Store info: `storeName`, `storeTagline`, `storeAddress`, `storePhone`, `storeEmail`
- Compliance info: `gstin`, `drugLicense1`, `drugLicense2`
- Bill info: `billNo`, `billDate`
- Patient info: `patientName`, `patientAddress`, `patientMobile`, `doctorName`
- Optional notes: `prescription`, `footerNote`
- `items`: Array of line-items

Each item supports:
- `productName`
- `packing`
- `batchNo`
- `exp`
- `quantity`
- `mrp`
- `discount`
- `amount`

Note:
When `quantity` and `mrp` are present, amount is recalculated using rate logic. Otherwise entered `amount` is used.

## Scripts
From `package.json`:

- `npm start`
  - Runs server with `PLAYWRIGHT_BROWSERS_PATH=0 node server.js`

- `npm run build`
  - Installs Chromium for Playwright with `PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium`

## Deployment Notes
- Ensure Playwright Chromium is installed in deployment environment.
- Persist secure environment variables (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, session secret).
- Serve over HTTPS in production.
- Configure reverse proxy and sticky sessions if scaling across multiple instances.

## Troubleshooting
### Error: Missing ADMIN_USERNAME or ADMIN_PASSWORD
Set both values in `.env` and restart server.

### PDF generation failed (500)
Likely Chromium/Playwright issue. Run:
```bash
npm run build
```

### Redirected to `/login` while using app
Session expired or not authenticated. Sign in again.

### PDF amount looks incorrect
Check `packing`, `quantity`, `mrp`, and `discount` values. Amount is auto-derived when quantity and MRP are available.

## Known Limitations
- Session secret is currently hardcoded in `src/app.js`.
- No database persistence for bills/users (single runtime session model).
- No role-based access control (single admin credential model).
- No API rate limiting/CSP/security headers configured yet.
