# Al-Farha Cargo Enterprise Logistics Portal & PWA (GitHub + Vercel)

Complete hostable web application and Progressive Web App (PWA) migrated from Google Apps Script (`HtmlService`) to a modular `.html` + `.js` architecture ready for **GitHub** and **Vercel**.

---

## Repository Structure

```text
AlfarhacargoPWASystem/
├── index.html                # Splash router (routes to /dashboard.html on desktop or /mobiledashboard.html on mobile)
├── login.html                # Unified Glassmorphic Sign-In page
├── dashboard.html            # Desktop Dashboard, Live Tracking Modal & Delivery Notifications
├── booking.html              # Desktop Shipment Booking (Single Entry & Bulk CSV Upload)
├── transfers.html            # Branch Inventory, Outbound Dispatch & Smart Bulk Inbound Scanner
├── consolidation.html        # Hub Consolidation (Master Bag Creation & Manifest)
├── statusupdate.html         # Desktop Scan & Update, CSV Docket Mapping & Force API Sync
├── adminpanel.html           # Master Control Panel (User Management & Branch Network CRUD)
├── mobiledashboard.html      # Mobile PWA Dashboard with Pull-to-Refresh & Bottom Sheets
├── mobilebooking.html        # Mobile Booking with Camera Barcode Scanner & External API Fetch
├── mstatusupdate.html        # Mobile Barcode Scan & Milestone Updater
├── manifest.json             # PWA Web App Manifest
├── sw.js                     # Offline-capable Service Worker
├── vercel.json               # Vercel routing & header configuration
├── package.json              # Node/Vercel project metadata
├── auth-guard.js             # Session timeout (3h) & background resume guard
├── nav.js                    # Mobile bottom navigation bar
├── notifications.js          # Cross-device unread delivery notification manager
├── packageModal.js           # Package details bottom-sheet & country flag mapper
├── scanner.js                # Html5Qrcode camera barcode scanner with audio feedback
├── tracking.js               # Mobile live tracking timeline & stepper modal
├── externalApi.js            # External order API helper
├── api/
│   ├── order-proxy.js        # Vercel Serverless Proxy for alfarhaonline.com Order API
│   └── gas-proxy.js          # Vercel Serverless Proxy for Google Apps Script API
├── js/
│   ├── api-client.js         # Unified GAS fetch client + google.script.run compatibility bridge
│   ├── sidebar.js            # Shared desktop sidebar navigation & role visibility
│   ├── index.js              # Splash router logic
│   ├── login.js              # Authentication controller
│   ├── dashboard.js          # Desktop dashboard controller
│   ├── booking.js            # Desktop booking & CSV upload controller
│   ├── transfers.js          # Branch transfers & inbound scanner controller
│   ├── consolidation.js      # Master bag consolidation controller
│   ├── statusupdate.js       # Desktop status update & carrier sync controller
│   ├── adminpanel.js         # Admin user & branch management controller
│   ├── mobiledashboard.js    # Mobile dashboard controller
│   ├── mobilebooking.js      # Mobile booking controller
│   └── mstatusupdate.js      # Mobile status update controller
└── gas-backend/              # Drop-in Google Apps Script backend files for your Google Sheet
    ├── pwa.gs                # Upgraded doPost(e) API router handling all 26 Desktop & Mobile actions
    ├── Database.gs           # Core Google Sheets CRUD & Carrier API integrations (SMSA, Aramex, DHL, Delhivery, 17Track)
    ├── notifications.gs      # Automated HTML email alerts & subscription handler
    ├── API.gs                # Carrier sync helpers
    ├── Code.gs               # Spreadsheet ID configuration
    └── appsscript.json       # GAS manifest
```

---

## Deployment Instructions

### Step 1: Update `pwa.gs` in Your Google Apps Script Project
1. Open your Google Apps Script project (`Untitled project`).
2. Replace the contents of `pwa.gs` with `gas-backend/pwa.gs` from this repository (which adds `doPost` routes for Desktop Transfers, Consolidations, CSV Docket Upload, Force API Sync, and Admin User/Branch management).
3. Click **Deploy > Manage deployments > Edit (pencil icon) > Version: New version > Deploy**.
4. If your Web App URL changes, update `GOOGLE_API_URL` in `js/api-client.js` (and optionally set `GOOGLE_API_URL` in Vercel Environment Variables).

### Step 2: Push to GitHub & Connect to Vercel
1. Commit and push all files in this repository to your GitHub repository (`AlfarhacargoPWASystem`).
2. Import the GitHub repository in **Vercel**:
   - **Framework Preset**: `Other` (Static HTML/JS + `/api` Serverless Functions)
   - **Root Directory**: `./`
3. Click **Deploy** — Vercel will automatically host all `.html` and `.js` files and deploy `/api/order-proxy` and `/api/gas-proxy`.
