# Business OS SaaS - Static MVP

This version is built the familiar way: plain HTML + CSS + JavaScript.

No Node.js.
No npm install.
No build command.
No React/Vite.
No dist folder.

## Deploy on Netlify

Upload these files to GitHub:

- index.html
- styles.css
- app.js
- README.md

Netlify settings:

- Build command: leave blank
- Publish directory: leave blank or use `/`

## Routes

This app uses hash routes:

- /#/login
- /#/signup
- /#/onboarding
- /#/payment-pending
- /#/app/dashboard
- /#/super-admin

## Important

The Supabase anon public key is inside app.js.
Never put the service_role key in frontend code.
