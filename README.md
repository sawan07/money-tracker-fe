# Money Tracker Frontend

A simple frontend for adding monthly expenses and earnings to a Google Sheet backend.

## Setup

1. Deploy the Google Apps Script as a Web App.
2. Copy the deployment URL.
3. Replace `API_URL` in `js/app.js` with your Web App URL.

## Google Apps Script deployment with clasp

This repo keeps the Apps Script backend in `scripts/`.

1. Install dependencies:
   ```sh
   npm install
   ```
2. Authenticate clasp:
   ```sh
   npm run clasp:login
   ```
3. Copy `.clasp.json.example` to `.clasp.json`, then replace the `scriptId` with the Apps Script project ID from **Project Settings > IDs > Script ID**.
4. Push backend changes:
   ```sh
   npm run clasp:push
   ```

After pushing code, create or update the web app deployment in Apps Script if you need a new deployed version.

## Run locally

Just open `index.html` in your browser.

## Deploy

- **GitHub Pages**: Push this repo to GitHub, then enable Pages.
- **Netlify**: Drag-drop the folder in Netlify dashboard.
- **Vercel**: Connect GitHub repo, deploy.
