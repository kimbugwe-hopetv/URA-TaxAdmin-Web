import { getDb, ALLOWED_COLLECTIONS, send } from "./_db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return send(res, 405, { success:false, message:"Method not allowed" });
  try {
    const db = await getDb();
    const counts = await Promise.all(ALLOWED_COLLECTIONS.map(name => db.collection(name).countDocuments()));
    const data = Object.fromEntries(ALLOWED_COLLECTIONS.map((name, i) => [name, counts[i]]));
    data.total = counts.reduce((a,b) => a+b, 0);
    return send(res, 200, { success:true, data });
  } catch (error) {
    console.error("Statistics error:", error);
    return send(res, 500, { success:false, message:"Could not load database statistics." });
  }
}
