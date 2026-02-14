import { Hono } from "hono";
import { authMiddleware } from "@getmocha/users-service/backend";

const app = new Hono<{ Bindings: Env }>();

// Get all companies for current user
app.get("/", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  
  const result = await c.env.DB.prepare(
    "SELECT * FROM companies WHERE user_id = ? ORDER BY created_at ASC"
  )
    .bind(user.id)
    .all();

  return c.json(result.results || []);
});

// Create company
app.post("/", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json();

  const { id, name, cnpj, address } = body;

  await c.env.DB.prepare(
    "INSERT INTO companies (id, user_id, name, cnpj, address) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(id, user.id, name, cnpj || null, address || null)
    .run();

  return c.json({ success: true });
});

// Update company
app.put("/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const companyId = c.req.param("id");
  const body = await c.req.json();

  const { name, cnpj, address } = body;

  await c.env.DB.prepare(
    "UPDATE companies SET name = ?, cnpj = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?"
  )
    .bind(name, cnpj || null, address || null, companyId, user.id)
    .run();

  return c.json({ success: true });
});

// Delete company
app.delete("/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const companyId = c.req.param("id");

  await c.env.DB.prepare(
    "DELETE FROM companies WHERE id = ? AND user_id = ?"
  )
    .bind(companyId, user.id)
    .run();

  return c.json({ success: true });
});

export default app;
