import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "URA_TaxAdmin_DB";
if (!uri) throw new Error("MONGODB_URI is not configured in Vercel Environment Variables.");

let clientPromise;
let cachedDb;

export async function getDb() {
  if (cachedDb) return cachedDb;
  if (!clientPromise) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
    clientPromise = client.connect();
  }
  const client = await clientPromise;
  cachedDb = client.db(dbName);
  return cachedDb;
}

export const ALLOWED_COLLECTIONS = [
  "taxpayers",
  "tax_incentives_exemptions",
  "efris_transactions",
  "tax_assessments"
];

export function checkCollection(name) {
  if (!ALLOWED_COLLECTIONS.includes(name)) {
    const error = new Error("Collection is not allowed.");
    error.status = 400;
    throw error;
  }
  return name;
}

export function send(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}
