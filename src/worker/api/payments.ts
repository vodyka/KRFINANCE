import { Hono } from "hono";
import { authMiddleware } from "@getmocha/users-service/backend";

const app = new Hono<{ Bindings: Env }>();

// Get all payments for current user
app.get("/", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  
  // Get payments
  const paymentsResult = await c.env.DB.prepare(
    "SELECT * FROM payments WHERE user_id = ? ORDER BY date DESC"
  )
    .bind(user.id)
    .all();

  const payments = paymentsResult.results || [];

  // Get payment-payable relationships for all payments
  const paymentIds = payments.map((p: any) => p.id);
  
  if (paymentIds.length === 0) {
    return c.json([]);
  }

  const placeholders = paymentIds.map(() => "?").join(",");
  const relationshipsResult = await c.env.DB.prepare(
    `SELECT payment_id, payable_id FROM payment_payables WHERE payment_id IN (${placeholders})`
  )
    .bind(...paymentIds)
    .all();

  // Map relationships to payments
  const paymentsWithPayables = payments.map((payment: any) => {
    const relationships = (relationshipsResult.results || []).filter(
      (r: any) => r.payment_id === payment.id
    );
    return {
      ...payment,
      payableIds: relationships.map((r: any) => r.payable_id),
    };
  });

  return c.json(paymentsWithPayables);
});

// Create payment
app.post("/", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json();

  const {
    id,
    companyId,
    date,
    bankId,
    paymentMethod,
    amount,
    description,
    discount,
    interest,
    fine,
    payableIds,
  } = body;

  // Insert payment
  await c.env.DB.prepare(
    `INSERT INTO payments (id, user_id, company_id, date, bank_id, payment_method, amount, 
     description, discount, interest, fine) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      user.id,
      companyId,
      date,
      bankId,
      paymentMethod,
      amount,
      description,
      discount || null,
      interest || null,
      fine || null
    )
    .run();

  // Insert payment-payable relationships
  if (payableIds && payableIds.length > 0) {
    for (const payableId of payableIds) {
      await c.env.DB.prepare(
        "INSERT INTO payment_payables (payment_id, payable_id) VALUES (?, ?)"
      )
        .bind(id, payableId)
        .run();
    }
  }

  return c.json({ success: true });
});

// Delete payment
app.delete("/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const paymentId = c.req.param("id");

  // Delete relationships first
  await c.env.DB.prepare(
    "DELETE FROM payment_payables WHERE payment_id = ?"
  )
    .bind(paymentId)
    .run();

  // Delete payment
  await c.env.DB.prepare(
    "DELETE FROM payments WHERE id = ? AND user_id = ?"
  )
    .bind(paymentId, user.id)
    .run();

  return c.json({ success: true });
});

export default app;
