import { getDb, send } from "./_db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { success:false, message:"Method not allowed" });
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return send(res, 200, { success:true, database: db.databaseName, message:"MongoDB Atlas connected" });
  } catch (error) {
    console.error("Health check failed:", error.message);
    return send(res, 500, { success:false, message:"Database connection failed. Check Vercel environment variables and Atlas network access." });
  }
}
