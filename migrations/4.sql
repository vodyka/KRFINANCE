
CREATE TABLE suppliers_clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  document_number TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  contact_type TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_suppliers_clients_user ON suppliers_clients(user_id);
CREATE INDEX idx_suppliers_clients_company ON suppliers_clients(company_id);
CREATE INDEX idx_suppliers_clients_document ON suppliers_clients(document_number);
