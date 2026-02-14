import { Hono } from "hono";
import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  authMiddleware,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
  getCurrentUser,
} from "@getmocha/users-service/backend";
import { getCookie, setCookie } from "hono/cookie";
import { welcomeEmail } from "./email-templates";
import companiesApi from "./api/companies";
import banksApi from "./api/banks";
import migrationApi from "./api/migration";
import categoriesApi from "./api/categories";
import payablesApi from "./api/payables";
import paymentsApi from "./api/payments";
import receivablesApi from "./api/receivables";
import receiptsApi from "./api/receipts";
import suppliersClientsApi from "./api/suppliers-clients";

const app = new Hono<{ Bindings: Env }>();

// Mount API routes
app.route("/api/companies", companiesApi);
app.route("/api/banks", banksApi);
app.route("/api/categories", categoriesApi);
app.route("/api/payables", payablesApi);
app.route("/api/payments", paymentsApi);
app.route("/api/receivables", receivablesApi);
app.route("/api/receipts", receiptsApi);
app.route("/api/suppliers-clients", suppliersClientsApi);
app.route("/api/migrate", migrationApi);

// Get OAuth redirect URL
app.get("/api/oauth/google/redirect_url", async (c) => {
  const redirectUrl = await getOAuthRedirectUrl("google", {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

// Exchange code for session token
app.post("/api/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  const sessionToken = await exchangeCodeForSessionToken(body.code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 24 * 60 * 60, // 60 days
  });

  // Get user information
  const user = await getCurrentUser(sessionToken, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  if (user) {
    // Check if user already has a subscription record
    const existingSubscription = await c.env.DB.prepare(
      "SELECT * FROM user_subscriptions WHERE user_id = ?"
    )
      .bind(user.id)
      .first();

    // If new user, create subscription and send welcome email
    if (!existingSubscription) {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 30);

      await c.env.DB.prepare(
        "INSERT INTO user_subscriptions (user_id, email, trial_ends_at, subscription_status) VALUES (?, ?, ?, ?)"
      )
        .bind(user.id, user.email, trialEndsAt.toISOString(), "trial")
        .run();

      // Send welcome email
      const userName = user.google_user_data.name || user.email.split("@")[0];
      
      try {
        const emailService = c.env.EMAILS as unknown as import("@/shared/types").EmailService;
        await emailService.send({
          to: user.email,
          subject: "Bem-vindo ao Kryzer Finanças - 30 dias grátis!",
          html_body: welcomeEmail(userName, trialEndsAt.toISOString()),
          text_body: `Olá ${userName}, seu cadastro foi realizado com sucesso no Kryzer Finanças! Você ganhou 30 dias de acesso completo para explorar todos os recursos do sistema. Seu período de avaliação termina em ${trialEndsAt.toLocaleDateString('pt-BR')}.`,
        });
      } catch (error) {
        console.error("Failed to send welcome email:", error);
        // Don't fail the login if email fails
      }
    }
  }

  return c.json({ success: true }, 200);
});

// Get current user
app.get("/api/users/me", authMiddleware, async (c) => {
  return c.json(c.get("user"));
});

// Dashboard endpoints
app.get("/api/bank-accounts", authMiddleware, async (c) => {
  const user = c.get("user");
  
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM bank_accounts WHERE user_id = ? OR user_id = 'demo' ORDER BY created_at DESC"
  )
    .bind(user!.id)
    .all();

  return c.json({ accounts: results });
});

app.get("/api/categories", authMiddleware, async (c) => {
  const user = c.get("user");
  
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM categories WHERE user_id = ? OR user_id = 'system' OR user_id = 'demo' ORDER BY parent_id NULLS FIRST, name"
  )
    .bind(user!.id)
    .all();

  return c.json({ categories: results });
});

app.post("/api/categories", authMiddleware, async (c) => {
  const user = c.get("user");
  const body = await c.req.json();

  const icon = body.type === "income" ? "🔼" : "🔽";
  
  await c.env.DB.prepare(
    "INSERT INTO categories (user_id, name, type, parent_id, icon, is_system) VALUES (?, ?, ?, ?, ?, 0)"
  )
    .bind(user!.id, body.name, body.type, body.parent_id || null, icon)
    .run();

  return c.json({ success: true }, 201);
});

app.delete("/api/categories/:id", authMiddleware, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");

  // Check if category belongs to user and is not a system category
  const category = await c.env.DB.prepare(
    "SELECT * FROM categories WHERE id = ? AND user_id = ? AND is_system = 0"
  )
    .bind(id, user!.id)
    .first();

  if (!category) {
    return c.json({ error: "Category not found or cannot be deleted" }, 404);
  }

  // Delete the category
  await c.env.DB.prepare("DELETE FROM categories WHERE id = ?")
    .bind(id)
    .run();

  return c.json({ success: true }, 200);
});

app.get("/api/financeiro-dashboard", authMiddleware, async (c) => {
  const user = c.get("user");
  const bankId = c.req.query("bank_id");
  const categoryId = c.req.query("category_id");
  const paymentMethod = c.req.query("payment_method");
  const dateFilter = c.req.query("date_filter") || "month";
  const startDate = c.req.query("start_date");
  const endDate = c.req.query("end_date");

  let dateCondition = "";
  const now = new Date();
  
  if (dateFilter === "month") {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    dateCondition = `AND transaction_date >= '${firstDay.toISOString().split('T')[0]}' AND transaction_date <= '${lastDay.toISOString().split('T')[0]}'`;
  } else if (dateFilter === "lastMonth") {
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    dateCondition = `AND transaction_date >= '${firstDay.toISOString().split('T')[0]}' AND transaction_date <= '${lastDay.toISOString().split('T')[0]}'`;
  } else if (dateFilter === "last30") {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    dateCondition = `AND transaction_date >= '${thirtyDaysAgo.toISOString().split('T')[0]}'`;
  } else if (dateFilter === "year") {
    const firstDay = new Date(now.getFullYear(), 0, 1);
    dateCondition = `AND transaction_date >= '${firstDay.toISOString().split('T')[0]}'`;
  } else if (dateFilter === "custom" && startDate && endDate) {
    dateCondition = `AND transaction_date >= '${startDate}' AND transaction_date <= '${endDate}'`;
  }

  let filters = `WHERE (user_id = ? OR user_id = 'demo') ${dateCondition}`;
  const params: any[] = [user!.id];

  if (bankId && bankId !== "all") {
    filters += ` AND bank_account_id = ?`;
    params.push(parseInt(bankId));
  }

  if (categoryId && categoryId !== "all") {
    filters += ` AND category_id = ?`;
    params.push(parseInt(categoryId));
  }

  if (paymentMethod && paymentMethod !== "all") {
    filters += ` AND payment_method = ?`;
    params.push(paymentMethod);
  }

  const revenueResult = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions ${filters} AND type = 'revenue' AND is_paid = 1`
  )
    .bind(...params)
    .first();

  const expenseResult = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions ${filters} AND type = 'expense' AND is_paid = 1`
  )
    .bind(...params)
    .first();

  const totalRevenue = (revenueResult?.total as number) || 0;
  const totalExpenses = Math.abs((expenseResult?.total as number) || 0);
  const balance = totalRevenue - totalExpenses;

  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const upcomingPaymentsResult = await c.env.DB.prepare(
    `SELECT * FROM transactions WHERE (user_id = ? OR user_id = 'demo') AND type = 'expense' AND is_paid = 0 AND due_date <= ? ORDER BY due_date LIMIT 5`
  )
    .bind(user!.id, sevenDaysFromNow)
    .all();

  const upcomingReceiptsResult = await c.env.DB.prepare(
    `SELECT * FROM transactions WHERE (user_id = ? OR user_id = 'demo') AND type = 'revenue' AND is_paid = 0 AND due_date <= ? ORDER BY due_date LIMIT 5`
  )
    .bind(user!.id, sevenDaysFromNow)
    .all();

  return c.json({
    totalRevenue,
    totalExpenses,
    balance,
    upcomingPaymentsCount: upcomingPaymentsResult.results.length,
    upcomingReceiptsCount: upcomingReceiptsResult.results.length,
    upcomingPayments: upcomingPaymentsResult.results,
    upcomingReceipts: upcomingReceiptsResult.results.map((r: any) => ({
      ...r,
      receipt_date: r.due_date,
    })),
  });
});

app.get("/api/financeiro-projection", authMiddleware, async (c) => {
  const user = c.get("user");
  const days = parseInt(c.req.query("days") || "30");
  const bankId = c.req.query("bank_id");

  let bankFilter = "";
  const params: any[] = [user!.id];

  if (bankId && bankId !== "all") {
    bankFilter = " AND id = ?";
    params.push(parseInt(bankId));
  }

  const accountsResult = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(current_balance), 0) as total FROM bank_accounts WHERE (user_id = ? OR user_id = 'demo')${bankFilter}`
  )
    .bind(...params)
    .all();

  const currentBalance = (accountsResult.results[0]?.total as number) || 0;

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  const receivablesResult = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE (user_id = ? OR user_id = 'demo') AND type = 'revenue' AND is_paid = 0 AND due_date <= ?`
  )
    .bind(user!.id, endDate.toISOString().split('T')[0])
    .first();

  const payablesResult = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE (user_id = ? OR user_id = 'demo') AND type = 'expense' AND is_paid = 0 AND due_date <= ?`
  )
    .bind(user!.id, endDate.toISOString().split('T')[0])
    .first();

  const totalReceivables = (receivablesResult?.total as number) || 0;
  const totalPayables = Math.abs((payablesResult?.total as number) || 0);
  const projectedBalance = currentBalance + totalReceivables - totalPayables;

  return c.json({
    currentBalance,
    projectedBalance,
    totalReceivables,
    totalPayables,
  });
});

app.get("/api/financeiro-projection-chart", authMiddleware, async (c) => {
  const user = c.get("user");
  const days = parseInt(c.req.query("days") || "30");

  const accountsResult = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(current_balance), 0) as total FROM bank_accounts WHERE user_id = ? OR user_id = 'demo'`
  )
    .bind(user!.id)
    .first();

  const currentBalance = (accountsResult?.total as number) || 0;

  const chartData = [];
  const now = new Date();
  let runningBalance = currentBalance;

  for (let i = 0; i <= days; i++) {
    const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];

    const revenueResult = await c.env.DB.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE (user_id = ? OR user_id = 'demo') AND type = 'revenue' AND is_paid = 0 AND due_date = ?`
    )
      .bind(user!.id, dateStr)
      .first();

    const expenseResult = await c.env.DB.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE (user_id = ? OR user_id = 'demo') AND type = 'expense' AND is_paid = 0 AND due_date = ?`
    )
      .bind(user!.id, dateStr)
      .first();

    const entradas = (revenueResult?.total as number) || 0;
    const saidas = Math.abs((expenseResult?.total as number) || 0);
    runningBalance += entradas - saidas;

    chartData.push({
      date: dateStr,
      entradas,
      saidas,
      saldo: runningBalance,
    });
  }

  return c.json({ data: chartData });
});

// Logout
app.get("/api/logout", async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === "string") {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

export default app;
