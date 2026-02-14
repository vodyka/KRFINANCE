import { Hono } from "hono";
import { authMiddleware } from "@getmocha/users-service/backend";

const app = new Hono<{ Bindings: Env }>();

// Migrate all data from localStorage to database
app.post("/", authMiddleware, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json();

  const {
    companies,
    banks,
    categories,
    payables,
    payments,
    receivables,
    receipts,
    suppliersClients,
    activeCompanyId,
  } = body;

  // Helper function to ensure no undefined values
  const toNull = (value: any) => value === undefined ? null : value;

  try {
    // Start by clearing existing data for this user
    await c.env.DB.prepare("DELETE FROM companies WHERE user_id = ?").bind(user.id).run();
    await c.env.DB.prepare("DELETE FROM banks WHERE user_id = ?").bind(user.id).run();
    await c.env.DB.prepare("DELETE FROM category_data WHERE user_id = ?").bind(user.id).run();
    await c.env.DB.prepare("DELETE FROM payables WHERE user_id = ?").bind(user.id).run();
    await c.env.DB.prepare("DELETE FROM payments WHERE user_id = ?").bind(user.id).run();
    await c.env.DB.prepare("DELETE FROM payment_payables WHERE payment_id IN (SELECT id FROM payments WHERE user_id = ?)").bind(user.id).run();
    await c.env.DB.prepare("DELETE FROM receivables WHERE user_id = ?").bind(user.id).run();
    await c.env.DB.prepare("DELETE FROM receipts WHERE user_id = ?").bind(user.id).run();
    await c.env.DB.prepare("DELETE FROM receipt_receivables WHERE receipt_id IN (SELECT id FROM receipts WHERE user_id = ?)").bind(user.id).run();
    await c.env.DB.prepare("DELETE FROM suppliers_clients_data WHERE user_id = ?").bind(user.id).run();
    await c.env.DB.prepare("DELETE FROM supplier_client_types WHERE supplier_client_id IN (SELECT id FROM suppliers_clients_data WHERE user_id = ?)").bind(user.id).run();

    // Insert companies
    for (const company of companies || []) {
      // Skip invalid companies
      if (!company.id || !company.name) {
        console.warn('Skipping invalid company:', company);
        continue;
      }

      await c.env.DB.prepare(
        "INSERT INTO companies (id, user_id, name, cnpj, address) VALUES (?, ?, ?, ?, ?)"
      )
        .bind(
          company.id, 
          user.id, 
          company.name, 
          toNull(company.cnpj), 
          toNull(company.address)
        )
        .run();
    }

    // Insert banks
    for (const bank of banks || []) {
      // Skip invalid banks
      if (!bank.id || !bank.companyId || !bank.accountName) {
        console.warn('Skipping invalid bank:', bank);
        continue;
      }

      await c.env.DB.prepare(
        `INSERT INTO banks (id, user_id, company_id, bank_name, bank_code, account_name, 
         initial_balance, balance_start_date, overdraft_limit, is_default) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          bank.id,
          user.id,
          bank.companyId,
          bank.bankName || 'Banco',
          toNull(bank.bankCode),
          bank.accountName,
          toNull(bank.initialBalance) || 0,
          bank.balanceStartDate || new Date().toISOString().split('T')[0],
          toNull(bank.overdraftLimit) || 0,
          bank.isDefault ? 1 : 0
        )
        .run();
    }

    // Insert categories
    for (const category of categories || []) {
      // Skip invalid categories
      if (!category.id || !category.name || !category.type || !category.groupId) {
        console.warn('Skipping invalid category:', category);
        continue;
      }

      await c.env.DB.prepare(
        `INSERT INTO category_data (id, user_id, company_id, name, type, group_id, is_default) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          category.id,
          user.id,
          "company-default",
          category.name,
          category.type,
          category.groupId,
          category.isDefault ? 1 : 0
        )
        .run();
    }

    // Insert payables
    for (const payable of payables || []) {
      // Skip invalid payables
      if (!payable.id || !payable.companyId || !payable.description || 
          payable.amount === undefined || !payable.dueDate || !payable.bankId || 
          !payable.categoryId || !payable.status) {
        console.warn('Skipping invalid payable:', payable);
        continue;
      }

      await c.env.DB.prepare(
        `INSERT INTO payables (id, user_id, company_id, description, amount, due_date, bank_id, 
         category_id, payment_method, status, supplier_id, installment_group_id, installment_number, 
         installment_total, partial_group_id, partial_number, partial_total) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          payable.id,
          user.id,
          payable.companyId,
          payable.description,
          payable.amount,
          payable.dueDate,
          payable.bankId,
          payable.categoryId,
          payable.paymentMethod || 'pix',
          payable.status,
          toNull(payable.supplierId),
          toNull(payable.installmentGroupId),
          toNull(payable.installmentNumber),
          toNull(payable.installmentTotal),
          toNull(payable.partialGroupId),
          toNull(payable.partialNumber),
          toNull(payable.partialTotal)
        )
        .run();
    }

    // Insert payments and their relationships
    for (const payment of payments || []) {
      // Skip invalid payments
      if (!payment.id || !payment.companyId || !payment.date || !payment.bankId || 
          payment.amount === undefined || !payment.description) {
        console.warn('Skipping invalid payment:', payment);
        continue;
      }

      await c.env.DB.prepare(
        `INSERT INTO payments (id, user_id, company_id, date, bank_id, payment_method, amount, 
         description, discount, interest, fine) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          payment.id,
          user.id,
          payment.companyId,
          payment.date,
          payment.bankId,
          payment.paymentMethod || 'pix',
          payment.amount,
          payment.description,
          toNull(payment.discount),
          toNull(payment.interest),
          toNull(payment.fine)
        )
        .run();

      // Insert payment-payable relationships
      for (const payableId of payment.payableIds || []) {
        await c.env.DB.prepare(
          "INSERT INTO payment_payables (payment_id, payable_id) VALUES (?, ?)"
        )
          .bind(toNull(payment.id), toNull(payableId))
          .run();
      }
    }

    // Insert receivables
    for (const receivable of receivables || []) {
      // Skip invalid receivables
      if (!receivable.id || !receivable.companyId || !receivable.description || 
          receivable.amount === undefined || !receivable.receiptDate || !receivable.bankId || 
          !receivable.categoryId || !receivable.status) {
        console.warn('Skipping invalid receivable:', receivable);
        continue;
      }

      await c.env.DB.prepare(
        `INSERT INTO receivables (id, user_id, company_id, description, amount, receipt_date, bank_id, 
         category_id, status, client_id, installment_group_id, installment_number, installment_total, 
         partial_group_id, partial_number, partial_total) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          receivable.id,
          user.id,
          receivable.companyId,
          receivable.description,
          receivable.amount,
          receivable.receiptDate,
          receivable.bankId,
          receivable.categoryId,
          receivable.status,
          toNull(receivable.clientId),
          toNull(receivable.installmentGroupId),
          toNull(receivable.installmentNumber),
          toNull(receivable.installmentTotal),
          toNull(receivable.partialGroupId),
          toNull(receivable.partialNumber),
          toNull(receivable.partialTotal)
        )
        .run();
    }

    // Insert receipts and their relationships
    for (const receipt of receipts || []) {
      // Skip invalid receipts
      if (!receipt.id || !receipt.companyId || !receipt.date || !receipt.bankId || 
          receipt.amount === undefined || !receipt.description) {
        console.warn('Skipping invalid receipt:', receipt);
        continue;
      }

      await c.env.DB.prepare(
        `INSERT INTO receipts (id, user_id, company_id, date, bank_id, amount, description) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          receipt.id,
          user.id,
          receipt.companyId,
          receipt.date,
          receipt.bankId,
          receipt.amount,
          receipt.description
        )
        .run();

      // Insert receipt-receivable relationships
      for (const receivableId of receipt.receivableIds || []) {
        await c.env.DB.prepare(
          "INSERT INTO receipt_receivables (receipt_id, receivable_id) VALUES (?, ?)"
        )
          .bind(toNull(receipt.id), toNull(receivableId))
          .run();
      }
    }

    // Insert suppliers/clients
    for (const sc of suppliersClients || []) {
      // Skip invalid suppliers/clients
      if (!sc.id || !sc.companyId || !sc.name) {
        console.warn('Skipping invalid supplier/client:', sc);
        continue;
      }

      await c.env.DB.prepare(
        `INSERT INTO suppliers_clients_data (id, user_id, company_id, name, document_type, 
         document_number, email, phone, address, city, state, postal_code, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          sc.id,
          user.id,
          sc.companyId,
          sc.name,
          toNull(sc.documentType),
          toNull(sc.documentNumber),
          toNull(sc.email),
          toNull(sc.phone),
          toNull(sc.address),
          toNull(sc.city),
          toNull(sc.state),
          toNull(sc.postalCode),
          toNull(sc.notes)
        )
        .run();

      // Insert contact types
      for (const contactType of sc.contactTypes || []) {
        await c.env.DB.prepare(
          "INSERT INTO supplier_client_types (supplier_client_id, contact_type) VALUES (?, ?)"
        )
          .bind(toNull(sc.id), toNull(contactType))
          .run();
      }
    }

    // Update user settings
    await c.env.DB.prepare(
      `INSERT INTO user_settings (user_id, active_company_id) VALUES (?, ?)
       ON CONFLICT(user_id) DO UPDATE SET active_company_id = ?, updated_at = CURRENT_TIMESTAMP`
    )
      .bind(toNull(user.id), toNull(activeCompanyId), toNull(activeCompanyId))
      .run();

    return c.json({ success: true, message: "Dados migrados com sucesso!" });
  } catch (error) {
    console.error("Migration error:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

export default app;
