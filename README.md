# URA Tax Administration – Web Edition

A browser-based rewrite of the Electron dashboard using HTML, CSS, Vanilla JavaScript, Vercel Functions and MongoDB Atlas.

## Collections retained

- `taxpayers`
- `tax_assessments`
- `tax_incentives_exemptions`
- `efris_transactions`

## Deploy to Vercel

1. Create a new GitHub repository and push this project.
2. Import that repository into Vercel.
3. In **Vercel → Project → Settings → Environment Variables**, add:
   - `MONGODB_URI`: your MongoDB Atlas connection string
   - `MONGODB_DB`: `URA_TaxAdmin_DB`
4. In MongoDB Atlas → Network Access, allow access from Vercel. For a temporary demonstration, Atlas may offer `0.0.0.0/0`; this allows connections from any IP and should only be used with a restricted database user and should be removed after the demonstration.
5. Redeploy the Vercel project.

No build command is required for the static frontend. Vercel automatically deploys the `/api` serverless functions.

## Run locally

```bash
npm install
npm install --global vercel
cp .env.example .env
# Edit .env and set your real MongoDB Atlas connection string
vercel dev
```

## API endpoints

- `GET /api/health`
- `GET /api/stats`
- `GET /api/records?collection=taxpayers`
- `GET /api/records?collection=taxpayers&search=Kampala`
- `POST /api/records?collection=taxpayers`
- `PUT /api/records?collection=taxpayers&id=UG-TIN-...`
- `DELETE /api/records?collection=taxpayers&id=UG-TIN-...`

The API allowlists the four intended collections. Record IDs are treated as strings to preserve the identifiers used by the current dataset.

## Notes

- MongoDB credentials are server-side environment variables and must never be added to frontend files or committed to GitHub.
- This is a demonstration starter. Add authentication and role-based authorization before using it with real taxpayer information.
- The app currently displays up to 100 records per collection request.
