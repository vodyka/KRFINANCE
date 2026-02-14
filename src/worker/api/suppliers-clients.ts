import { Hono } from "hono";
import { authMiddleware } from "@getmocha/users-service/backend";

const app = new Hono<{ Bindings: Env }>();

// Get all suppliers/clients for current user
app.get("/", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  
  // Get suppliers/clients
  const scResult = await c.env.DB.prepare(
    "SELECT * FROM suppliers_clients_data WHERE user_id = ? ORDER BY name ASC"
  )
    .bind(user.id)
    .all();

  const suppliersClients = scResult.results || [];

  // Get contact types for all suppliers/clients
  const scIds = suppliersClients.map((sc: any) => sc.id);
  
  if (scIds.length === 0) {
    return c.json([]);
  }

  const placeholders = scIds.map(() => "?").join(",");
  const typesResult = await c.env.DB.prepare(
    `SELECT supplier_client_id, contact_type FROM supplier_client_types WHERE supplier_client_id IN (${placeholders})`
  )
    .bind(...scIds)
    .all();

  // Map contact types to suppliers/clients
  const scWithTypes = suppliersClients.map((sc: any) => {
    const types = (typesResult.results || []).filter(
      (t: any) => t.supplier_client_id === sc.id
    );
    return {
      ...sc,
      contactTypes: types.map((t: any) => t.contact_type),
    };
  });

  return c.json(scWithTypes);
});

// Create supplier/client
app.post("/", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json();

  const {
    id,
    companyId,
    name,
    documentType,
    documentNumber,
    email,
    phone,
    address,
    city,
    state,
    postalCode,
    notes,
    contactTypes,
  } = body;

  // Insert supplier/client
  await c.env.DB.prepare(
    `INSERT INTO suppliers_clients_data (id, user_id, company_id, name, document_type, 
     document_number, email, phone, address, city, state, postal_code, notes) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      user.id,
      companyId,
      name,
      documentType || null,
      documentNumber || null,
      email || null,
      phone || null,
      address || null,
      city || null,
      state || null,
      postalCode || null,
      notes || null
    )
    .run();

  // Insert contact types
  if (contactTypes && contactTypes.length > 0) {
    for (const contactType of contactTypes) {
      await c.env.DB.prepare(
        "INSERT INTO supplier_client_types (supplier_client_id, contact_type) VALUES (?, ?)"
      )
        .bind(id, contactType)
        .run();
    }
  }

  return c.json({ success: true });
});

// Update supplier/client
app.put("/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const scId = c.req.param("id");
  const body = await c.req.json();

  const {
    name,
    documentType,
    documentNumber,
    email,
    phone,
    address,
    city,
    state,
    postalCode,
    notes,
    contactTypes,
  } = body;

  // Update supplier/client
  await c.env.DB.prepare(
    `UPDATE suppliers_clients_data SET name = ?, document_type = ?, document_number = ?, 
     email = ?, phone = ?, address = ?, city = ?, state = ?, postal_code = ?, notes = ?, 
     updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`
  )
    .bind(
      name,
      documentType || null,
      documentNumber || null,
      email || null,
      phone || null,
      address || null,
      city || null,
      state || null,
      postalCode || null,
      notes || null,
      scId,
      user.id
    )
    .run();

  // Delete old contact types
  await c.env.DB.prepare(
    "DELETE FROM supplier_client_types WHERE supplier_client_id = ?"
  )
    .bind(scId)
    .run();

  // Insert new contact types
  if (contactTypes && contactTypes.length > 0) {
    for (const contactType of contactTypes) {
      await c.env.DB.prepare(
        "INSERT INTO supplier_client_types (supplier_client_id, contact_type) VALUES (?, ?)"
      )
        .bind(scId, contactType)
        .run();
    }
  }

  return c.json({ success: true });
});

// Delete supplier/client
app.delete("/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const scId = c.req.param("id");

  // Delete contact types first
  await c.env.DB.prepare(
    "DELETE FROM supplier_client_types WHERE supplier_client_id = ?"
  )
    .bind(scId)
    .run();

  // Delete supplier/client
  await c.env.DB.prepare(
    "DELETE FROM suppliers_clients_data WHERE id = ? AND user_id = ?"
  )
    .bind(scId, user.id)
    .run();

  return c.json({ success: true });
});

export default app;
