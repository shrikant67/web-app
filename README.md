# Reporting App (frontend demo)

This is a self-contained HTML5 frontend demo for a small reporting application.

Features
- Login / Logout (demo client-side auth using localStorage)
- App header with app name on the left and user details on the right
- Tabs: Dashboard, Reports, Products
  - Dashboard: pie chart & line chart showing product sales (Chart.js)
  - Reports: search product sales and view results in a paginated table
  - Products: paginated list of products with Add / Edit / Delete (CRUD) — data persisted in localStorage for demo
- No backend required — everything runs in the browser

How to run
1. Clone or copy these files into your repository (root).
2. Open index.html in a modern browser (Chrome/Edge/Firefox).
3. On first load the app seeds sample data. Login with any username/password.
4. Navigate tabs and try adding/editing products.

Notes & next steps
- This is a client-only demo. For production, move auth and data operations to a secure backend (API + DB).
- You can replace localStorage with REST calls by modifying assets/app.js to call your API endpoints for auth, products, reports, and chart data.
- If you want, I can add a simple backend (Flask/Express) and a GitHub Actions workflow to build/test/deploy — tell me which stack you prefer.
