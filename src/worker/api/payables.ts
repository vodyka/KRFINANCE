import { Hono } from "hono";
import { authMiddleware } from "@getmocha/users-service/backend";

const app = new Hono<{ Bindings: Env }>();

// Get all payables for current user
app.get("/", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  
  const result = await c.env.DB.prepare(
    "SELECT * FROM payables WHERE user_id = ? ORDER BY due_date ASC"
  )
    .bind(user.id)
    .all();

  return c.json(result.results || []);
});

// Create payable
app.post("/", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json();

  const {
    id,
    companyId,
    description,
    amount,
    dueDate,
    bankId,
    categoryId,
    paymentMethod,
    status,
    supplierId,
    installmentGroupId,
    installmentNumber,
    installmentTotal,
    partialGroupId,
    partialNumber,
    partialTotal,
  } = body;

  await c.env.DB.prepare(
    `INSERT INTO payables (id, user_id, company_id, description, amount, due_date, bank_id, 
     category_id, payment_method, status, supplier_id, installment_group_id, installment_number, 
     installment_total, partial_group_id, partial_number, partial_total) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      user.id,
      companyId,
      description,
      amount,
      dueDate,
      bankId,
      categoryId,
      paymentMethod,
      status,
      supplierId || null,
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

// Update payable
app.put("/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const payableId = c.req.param("id");
  const body = await c.req.json();

  const {
    description,
    amount,
    dueDate,
    bankId,
    categoryId,
    paymentMethod,
    status,
    supplierId,
  } = body;

  await c.env.DB.prepare(
    `UPDATE payables SET description = ?, amount = ?, due_date = ?, bank_id = ?, 
     category_id = ?, payment_method = ?, status = ?, supplier_id = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ? AND user_id = ?`
  )
    .bind(
      description,
      amount,
      dueDate,
      bankId,
      categoryId,
      paymentMethod,
      status,
      supplierId || null,
      payableId,
      user.id
    )
    .run();

  return c.json({ success: true });
});

// Delete payable
app.delete("/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const payableId = c.req.param("id");

  await c.env.DB.prepare(
    "DELETE FROM payables WHERE id = ? AND user_id = ?"
  )
    .bind(payableId, user.id)
    .run();

  return c.json({ success: true });
});

export default app;
