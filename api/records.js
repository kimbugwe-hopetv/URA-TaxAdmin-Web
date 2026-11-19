import { ObjectId } from "mongodb";
import { getDb, checkCollection, send } from "./_db.js";

function parseDocument(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    const error = new Error("Record must be a JSON object.");
    error.status = 400;
    throw error;
  }
  const copy = { ...value };
  delete copy._id;
  return copy;
}

export default async function handler(req, res) {
  try {
    const collection = checkCollection(String(req.query.collection || ""));
    const db = await getDb();
    const col = db.collection(collection);

    if (req.method === "GET") {
      const search = String(req.query.search || "").trim();
      const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 250);
      let filter = {};
      if (search) {
        const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(safe, "i");
        filter = { $or: [
          { _id: regex }, { tin: regex }, { business_name: regex },
          { fdn: regex }, { exemption_type: regex }, { tax_head: regex },
          { status: regex }, { district: regex }, { seller_tin: regex }, { buyer_tin: regex }
        ]};
      }
      const records = await col.find(filter).limit(limit).toArray();
      return send(res, 200, { success:true, data: records });
    }

    if (req.method === "POST") {
      const doc = parseDocument(req.body);
      if (req.body?._id !== undefined && req.body?._id !== null && String(req.body._id).trim()) {
        doc._id = String(req.body._id).trim();
      }
      const result = await col.insertOne(doc);
      return send(res, 201, { success:true, id: result.insertedId });
    }

    const id = String(req.query.id || "");
    if (!id) return send(res, 400, { success:false, message:"Record ID is required." });

    if (req.method === "PUT") {
      const doc = parseDocument(req.body);
      const result = await col.updateOne({ _id: id }, { $set: doc });
      if (!result.matchedCount) return send(res, 404, { success:false, message:"Record not found." });
      return send(res, 200, { success:true, modified: result.modifiedCount });
    }

    if (req.method === "DELETE") {
      const result = await col.deleteOne({ _id: id });
      if (!result.deletedCount) return send(res, 404, { success:false, message:"Record not found." });
      return send(res, 200, { success:true });
    }

    return send(res, 405, { success:false, message:"Method not allowed" });
  } catch (error) {
    console.error("Records API error:", error);
    return send(res, error.status || 500, { success:false, message:error.status ? error.message : "Database request failed." });
  }
}
