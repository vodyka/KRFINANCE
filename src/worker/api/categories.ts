import { Hono } from "hono";
import { authMiddleware } from "@getmocha/users-service/backend";

const app = new Hono<{ Bindings: Env }>();

// Get all categories for current user
app.get("/", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  
  const result = await c.env.DB.prepare(
    "SELECT * FROM category_data WHERE user_id = ? ORDER BY created_at ASC"
  )
    .bind(user.id)
    .all();

  return c.json(result.results || []);
});

// Create category
app.post("/", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json();

  const { id, companyId, name, type, groupId, isDefault } = body;

  await c.env.DB.prepare(
    `INSERT INTO category_data (id, user_id, company_id, name, type, group_id, is_default) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, user.id, companyId, name, type, groupId, isDefault ? 1 : 0)
    .run();

  return c.json({ success: true });
});

// Update category
app.put("/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const categoryId = c.req.param("id");
  const body = await c.req.json();

  const { name, type, groupId } = body;

  await c.env.DB.prepare(
    `UPDATE category_data SET name = ?, type = ?, group_id = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ? AND user_id = ?`
  )
    .bind(name, type, groupId, categoryId, user.id)
    .run();

  return c.json({ success: true });
});

// Delete category
app.delete("/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const categoryId = c.req.param("id");

  await c.env.DB.prepare(
    "DELETE FROM category_data WHERE id = ? AND user_id = ?"
  )
    .bind(categoryId, user.id)
    .run();

  return c.json({ success: true });
});

export default app;
