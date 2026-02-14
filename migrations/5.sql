
-- Companies (empresas)
CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  cnpj TEXT,
  address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_companies_user_id ON companies(user_id);
CREATE INDEX idx_companies_cnpj ON companies(cnpj);

-- Bank Accounts (contas bancárias)
CREATE TABLE banks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  bank_code TEXT,
  account_name TEXT NOT NULL,
  initial_balance REAL DEFAULT 0,
  balance_start_date DATE NOT NULL,
  overdraft_limit REAL DEFAULT 0,
  is_default BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_banks_user_id ON banks(user_id);
CREATE INDEX idx_banks_company_id ON banks(company_id);

-- Categories (categorias)
CREATE TABLE category_data (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  group_id TEXT NOT NULL,
  is_default BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_category_data_user_id ON category_data(user_id);
CREATE INDEX idx_category_data_company_id ON category_data(company_id);

-- Payables (contas a pagar)
CREATE TABLE payables (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  due_date DATE NOT NULL,
  bank_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL,
  supplier_id TEXT,
  installment_group_id TEXT,
  installment_number INTEGER,
  installment_total INTEGER,
  partial_group_id TEXT,
  partial_number INTEGER,
  partial_total INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payables_user_id ON payables(user_id);
CREATE INDEX idx_payables_company_id ON payables(company_id);
CREATE INDEX idx_payables_status ON payables(status);
CREATE INDEX idx_payables_installment_group ON payables(installment_group_id);

-- Payments (pagamentos)
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  date DATE NOT NULL,
  bank_id TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  discount REAL,
  interest REAL,
  fine REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_company_id ON payments(company_id);

-- Payment-Payable relationship (N:N)
CREATE TABLE payment_payables (
  payment_id TEXT NOT NULL,
  payable_id TEXT NOT NULL,
  PRIMARY KEY (payment_id, payable_id)
);

CREATE INDEX idx_payment_payables_payment ON payment_payables(payment_id);
CREATE INDEX idx_payment_payables_payable ON payment_payables(payable_id);

-- Receivables (contas a receber)
CREATE TABLE receivables (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  receipt_date DATE NOT NULL,
  bank_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  status TEXT NOT NULL,
  client_id TEXT,
  installment_group_id TEXT,
  installment_number INTEGER,
  installment_total INTEGER,
  partial_group_id TEXT,
  partial_number INTEGER,
  partial_total INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_receivables_user_id ON receivables(user_id);
CREATE INDEX idx_receivables_company_id ON receivables(company_id);
CREATE INDEX idx_receivables_status ON receivables(status);

-- Receipts (recebimentos)
CREATE TABLE receipts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  date DATE NOT NULL,
  bank_id TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_receipts_user_id ON receipts(user_id);
CREATE INDEX idx_receipts_company_id ON receipts(company_id);

-- Receipt-Receivable relationship (N:N)
CREATE TABLE receipt_receivables (
  receipt_id TEXT NOT NULL,
  receivable_id TEXT NOT NULL,
  PRIMARY KEY (receipt_id, receivable_id)
);

CREATE INDEX idx_receipt_receivables_receipt ON receipt_receivables(receipt_id);
CREATE INDEX idx_receipt_receivables_receivable ON receipt_receivables(receivable_id);

-- Suppliers/Clients (fornecedores e clientes)
CREATE TABLE suppliers_clients_data (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  document_type TEXT,
  document_number TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_suppliers_clients_data_user_id ON suppliers_clients_data(user_id);
CREATE INDEX idx_suppliers_clients_data_company_id ON suppliers_clients_data(company_id);

-- Contact types (many-to-many: supplier, client, or both)
CREATE TABLE supplier_client_types (
  supplier_client_id TEXT NOT NULL,
  contact_type TEXT NOT NULL,
  PRIMARY KEY (supplier_client_id, contact_type)
);

CREATE INDEX idx_supplier_client_types_id ON supplier_client_types(supplier_client_id);

-- User settings
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY,
  active_company_id TEXT,
  count_overdue_in_balance BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
