import { Hono } from "hono";
import { authMiddleware } from "@getmocha/users-service/backend";

const app = new Hono<{ Bindings: Env }>();

// Get all receipts for current user
app.get("/", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  
  // Get receipts
  const receiptsResult = await c.env.DB.prepare(
    "SELECT * FROM receipts WHERE user_id = ? ORDER BY date DESC"
  )
    .bind(user.id)
    .all();

  const receipts = receiptsResult.results || [];

  // Get receipt-receivable relationships for all receipts
  const receiptIds = receipts.map((r: any) => r.id);
  
  if (receiptIds.length === 0) {
    return c.json([]);
  }

  const placeholders = receiptIds.map(() => "?").join(",");
  const relationshipsResult = await c.env.DB.prepare(
    `SELECT receipt_id, receivable_id FROM receipt_receivables WHERE receipt_id IN (${placeholders})`
  )
    .bind(...receiptIds)
    .all();

  // Map relationships to receipts
  const receiptsWithReceivables = receipts.map((receipt: any) => {
    const relationships = (relationshipsResult.results || []).filter(
      (r: any) => r.receipt_id === receipt.id
    );
    return {
      ...receipt,
      receivableIds: relationships.map((r: any) => r.receivable_id),
    };
  });

  return c.json(receiptsWithReceivables);
});

// Create receipt
app.post("/", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json();

  const {
    id,
    companyId,
    date,
    bankId,
    amount,
    description,
    receivableIds,
  } = body;

  // Insert receipt
  await c.env.DB.prepare(
    `INSERT INTO receipts (id, user_id, company_id, date, bank_id, amount, description) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, user.id, companyId, date, bankId, amount, description)
    .run();

  // Insert receipt-receivable relationships
  if (receivableIds && receivableIds.length > 0) {
    for (const receivableId of receivableIds) {
      await c.env.DB.prepare(
        "INSERT INTO receipt_receivables (receipt_id, receivable_id) VALUES (?, ?)"
      )
        .bind(id, receivableId)
        .run();
    }
  }

  return c.json({ success: true });
});

// Delete receipt
app.delete("/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const receiptId = c.req.param("id");

  // Delete relationships first
  await c.env.DB.prepare(
    "DELETE FROM receipt_receivables WHERE receipt_id = ?"
  )
    .bind(receiptId)
    .run();

  // Delete receipt
  await c.env.DB.prepare(
    "DELETE FROM receipts WHERE id = ? AND user_id = ?"
  )
    .bind(receiptId, user.id)
    .run();

  return c.json({ success: true });
});

export default app;
