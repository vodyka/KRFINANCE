import { Hono } from "hono";
import { authMiddleware } from "@getmocha/users-service/backend";

const app = new Hono<{ Bindings: Env }>();

// Get all banks for current user
app.get("/", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  
  const result = await c.env.DB.prepare(
    "SELECT * FROM banks WHERE user_id = ? ORDER BY created_at ASC"
  )
    .bind(user.id)
    .all();

  return c.json(result.results || []);
});

// Create bank
app.post("/", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json();

  const { id, companyId, bankName, bankCode, accountName, initialBalance, balanceStartDate, overdraftLimit, isDefault } = body;

  await c.env.DB.prepare(
    `INSERT INTO banks (id, user_id, company_id, bank_name, bank_code, account_name, initial_balance, 
     balance_start_date, overdraft_limit, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      user.id,
      companyId,
      bankName,
      bankCode || null,
      accountName,
      initialBalance || 0,
      balanceStartDate,
      overdraftLimit || 0,
      isDefault ? 1 : 0
    )
    .run();

  return c.json({ success: true });
});

// Update bank
app.put("/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const bankId = c.req.param("id");
  const body = await c.req.json();

  const { bankName, bankCode, accountName, initialBalance, balanceStartDate, overdraftLimit } = body;

  await c.env.DB.prepare(
    `UPDATE banks SET bank_name = ?, bank_code = ?, account_name = ?, initial_balance = ?, 
     balance_start_date = ?, overdraft_limit = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ? AND user_id = ?`
  )
    .bind(
      bankName,
      bankCode || null,
      accountName,
      initialBalance || 0,
      balanceStartDate,
      overdraftLimit || 0,
      bankId,
      user.id
    )
    .run();

  return c.json({ success: true });
});

// Delete bank
app.delete("/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const bankId = c.req.param("id");

  await c.env.DB.prepare(
    "DELETE FROM banks WHERE id = ? AND user_id = ?"
  )
    .bind(bankId, user.id)
    .run();

  return c.json({ success: true });
});

export default app;
