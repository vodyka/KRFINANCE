import { Hono } from "hono";
import { authMiddleware } from "@getmocha/users-service/backend";

const app = new Hono<{ Bindings: Env }>();

// Get all receivables for current user
app.get("/", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  
  const result = await c.env.DB.prepare(
    "SELECT * FROM receivables WHERE user_id = ? ORDER BY receipt_date ASC"
  )
    .bind(user.id)
    .all();

  return c.json(result.results || []);
});

// Create receivable
app.post("/", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json();

  const {
    id,
    companyId,
    description,
    amount,
    receiptDate,
    bankId,
    categoryId,
    status,
    clientId,
    installmentGroupId,
    installmentNumber,
    installmentTotal,
    partialGroupId,
    partialNumber,
    partialTotal,
  } = body;

  await c.env.DB.prepare(
    `INSERT INTO receivables (id, user_id, company_id, description, amount, receipt_date, bank_id, 
     category_id, status, client_id, installment_group_id, installment_number, installment_total, 
     partial_group_id, partial_number, partial_total) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      user.id,
      companyId,
      description,
      amount,
      receiptDate,
      bankId,
      categoryId,
      status,
      clientId || null,
      installmentGroupId || null,
      installmentNumber || null,
      installmentTotal || null,
      partialGroupId || null,
      partialNumber || null,
      partialTotal || null
    )
    .run();

  return c.json({ success: true });
});

// Update receivable
app.put("/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const receivableId = c.req.param("id");
  const body = await c.req.json();

  const {
    description,
    amount,
    receiptDate,
    bankId,
    categoryId,
    status,
    clientId,
  } = body;

  await c.env.DB.prepare(
    `UPDATE receivables SET description = ?, amount = ?, receipt_date = ?, bank_id = ?, 
     category_id = ?, status = ?, client_id = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ? AND user_id = ?`
  )
    .bind(
      description,
      amount,
      receiptDate,
      bankId,
      categoryId,
      status,
      clientId || null,
      receivableId,
      user.id
    )
    .run();

  return c.json({ success: true });
});

// Delete receivable
app.delete("/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const receivableId = c.req.param("id");

  await c.env.DB.prepare(
    "DELETE FROM receivables WHERE id = ? AND user_id = ?"
  )
    .bind(receivableId, user.id)
    .run();

  return c.json({ success: true });
});

export default app;
