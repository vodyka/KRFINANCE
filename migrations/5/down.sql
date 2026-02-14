
DROP INDEX idx_supplier_client_types_id;
DROP TABLE supplier_client_types;

DROP INDEX idx_suppliers_clients_data_company_id;
DROP INDEX idx_suppliers_clients_data_user_id;
DROP TABLE suppliers_clients_data;

DROP INDEX idx_receipt_receivables_receivable;
DROP INDEX idx_receipt_receivables_receipt;
DROP TABLE receipt_receivables;

DROP INDEX idx_receipts_company_id;
DROP INDEX idx_receipts_user_id;
DROP TABLE receipts;

DROP INDEX idx_receivables_status;
DROP INDEX idx_receivables_company_id;
DROP INDEX idx_receivables_user_id;
DROP TABLE receivables;

DROP INDEX idx_payment_payables_payable;
DROP INDEX idx_payment_payables_payment;
DROP TABLE payment_payables;

DROP INDEX idx_payments_company_id;
DROP INDEX idx_payments_user_id;
DROP TABLE payments;

DROP INDEX idx_payables_installment_group;
DROP INDEX idx_payables_status;
DROP INDEX idx_payables_company_id;
DROP INDEX idx_payables_user_id;
DROP TABLE payables;

DROP INDEX idx_category_data_company_id;
DROP INDEX idx_category_data_user_id;
DROP TABLE category_data;

DROP INDEX idx_banks_company_id;
DROP INDEX idx_banks_user_id;
DROP TABLE banks;

DROP INDEX idx_companies_cnpj;
DROP INDEX idx_companies_user_id;
DROP TABLE companies;

DROP TABLE user_settings;
