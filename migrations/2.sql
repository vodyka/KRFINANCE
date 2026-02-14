
CREATE TABLE bank_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  bank_name TEXT,
  account_type TEXT,
  initial_balance REAL DEFAULT 0,
  current_balance REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  color TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  bank_account_id INTEGER,
  category_id INTEGER,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  payment_method TEXT,
  transaction_date DATE NOT NULL,
  due_date DATE,
  is_paid BOOLEAN DEFAULT 0,
  customer_name TEXT,
  company_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bank_accounts_user_id ON bank_accounts(user_id);
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_bank_account_id ON transactions(bank_account_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);

INSERT INTO categories (user_id, name, type, color) VALUES
  ('demo', 'Vendas', 'revenue', '#16a34a'),
  ('demo', 'Serviços', 'revenue', '#22c55e'),
  ('demo', 'Salários', 'expense', '#dc2626'),
  ('demo', 'Fornecedores', 'expense', '#ef4444'),
  ('demo', 'Aluguel', 'expense', '#f97316'),
  ('demo', 'Energia', 'expense', '#f59e0b');

INSERT INTO bank_accounts (user_id, account_name, bank_name, account_type, initial_balance, current_balance) VALUES
  ('demo', 'Conta Corrente Principal', 'Banco do Brasil', 'corrente', 50000, 50000),
  ('demo', 'Conta Poupança', 'Caixa Econômica', 'poupanca', 25000, 25000);
