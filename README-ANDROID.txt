ELIAS NIKAH CONTRIBUTIONS MANAGER
=================================

WHAT IS INCLUDED
- index.html: app screens
- styles.css: mobile-friendly design
- app.js: application logic and IndexedDB storage
- manifest.webmanifest: installable app details
- sw.js: offline caching service worker
- icon.svg: app icon

IMPORTANT STORAGE INFORMATION
Your contributors, pledges, payments and gifts are stored in IndexedDB in the browser profile on this phone. The app does not upload them to a server. Do not clear Chrome/site data unless you have exported a backup. Export a JSON backup regularly and keep a copy somewhere safe. CSV is provided for spreadsheet viewing; JSON is the full restore backup.

ANDROID SETUP (Acode + Chrome)
1. Install Acode from a trusted app store if it is not already installed.
2. Extract this ZIP into a folder named elias_nikah_contributions_manager.
3. In Acode, open that folder and open index.html.
4. Start Acode's Preview / Live Server feature (the exact menu wording may vary by Acode version). Use its local-server preview, not a plain file:// preview.
5. Open the preview address in Chrome on the same phone. It should use localhost or 127.0.0.1. If Acode provides a local IP address instead, service-worker installation may be restricted; use localhost preview if available.
6. Keep the project folder in place. In Chrome, open the app, then use the three-dot menu and choose "Add to Home screen" or "Install app" if offered.
7. Open the new home-screen icon to use it like an app.

OFFLINE USE
- First open the app while the local preview server is running so its files can be cached.
- The service worker can cache the app shell when served from localhost or HTTPS.
- After the first successful load, the cached app shell can work offline. IndexedDB data remains in the same browser profile.
- Do not clear Chrome site data or uninstall/clear app storage if you want to preserve records.
- Some Android local-server apps stop their server when closed. If the app shell does not reopen offline, start Acode's preview again.

HOW TO USE
1. People: add each contributor once.
2. Pledges: record the amount they promised.
3. Payments: select the pledge and enter each amount received. Multiple payments can be attached to one pledge.
4. Other gifts: record non-cash items/services such as rice, sugar, transport, water or cooking oil. Estimated value is optional.
5. Records: search the combined register.
6. Backup: download JSON for full backup and restore; CSV is for spreadsheet viewing.

PAYMENT RULE
A payment is linked to a pledge. If a contributor makes a payment without a prior pledge, create a pledge for the agreed amount first, or record it in a separate note until you can classify it correctly. The app warns before allowing a payment above the remaining pledge balance.

RESTORE WARNING
Restoring JSON replaces the app's current records. Export a fresh backup first if you need to keep both sets. CSV files cannot be restored; use the JSON backup for restoration.

PRIVACY
This is a personal offline record-keeping tool, not a bank or payment processor. It does not verify MTN/Airtel transactions. Always confirm receipt independently before recording a payment. Protect your phone with a screen lock.
