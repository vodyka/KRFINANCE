
-- Add fields to support system categories and groups
ALTER TABLE categories ADD COLUMN is_system BOOLEAN DEFAULT 0;
ALTER TABLE categories ADD COLUMN parent_id INTEGER;
ALTER TABLE categories ADD COLUMN icon TEXT;

-- Insert system category groups
INSERT INTO categories (user_id, name, type, is_system, parent_id, icon) VALUES
('system', 'RECEITAS OPERACIONAIS', 'income', 1, NULL, '📊'),
('system', 'CUSTOS OPERACIONAIS', 'expense', 1, NULL, '📊'),
('system', 'DESPESAS OPERACIONAIS E OUTRAS RECEITAS', 'mixed', 1, NULL, '📊'),
('system', 'ATIVIDADES DE INVESTIMENTO', 'mixed', 1, NULL, '📊'),
('system', 'ATIVIDADES DE FINANCIAMENTO', 'mixed', 1, NULL, '📊');

-- Get group IDs for subcategories
-- RECEITAS OPERACIONAIS subcategories
INSERT INTO categories (user_id, name, type, is_system, parent_id, icon) VALUES
('system', 'Descontos Concedidos', 'expense', 1, 1, '🔽'),
('system', 'Juros Recebidos', 'income', 1, 1, '🔼'),
('system', 'Multas Recebidas', 'income', 1, 1, '🔼'),
('system', 'Outras receitas', 'income', 1, 1, '🔼');

-- CUSTOS OPERACIONAIS subcategories
INSERT INTO categories (user_id, name, type, is_system, parent_id, icon) VALUES
('system', 'Compras de fornecedores', 'expense', 1, 2, '🔽'),
('system', 'Custo serviço prestado', 'expense', 1, 2, '🔽'),
('system', 'Custos produto vendido', 'expense', 1, 2, '🔽'),
('system', 'Impostos sobre receita', 'expense', 1, 2, '🔽'),
('system', 'INSS Retido sobre a Receita', 'expense', 1, 2, '🔽'),
('system', 'Outras Retenções sobre a Receita', 'expense', 1, 2, '🔽'),
('system', 'CSLL Retido sobre a Receita', 'expense', 1, 2, '🔽'),
('system', 'ISS Retido sobre a Receita', 'expense', 1, 2, '🔽'),
('system', 'PIS Retido sobre a Receita', 'expense', 1, 2, '🔽'),
('system', 'IRPJ Retido sobre a Receita', 'expense', 1, 2, '🔽'),
('system', 'COFINS Retido sobre a Receita', 'expense', 1, 2, '🔽'),
('system', 'Compras - Embalagens', 'expense', 1, 2, '🔽'),
('system', 'Frete sobre Compras', 'expense', 1, 2, '🔽');

-- DESPESAS OPERACIONAIS E OUTRAS RECEITAS subcategories
INSERT INTO categories (user_id, name, type, is_system, parent_id, icon) VALUES
('system', 'Aluguel e condomínio', 'expense', 1, 3, '🔽'),
('system', 'Descontos Recebidos', 'income', 1, 3, '🔼'),
('system', 'Juros Pagos', 'expense', 1, 3, '🔽'),
('system', 'Luz, água e outros', 'expense', 1, 3, '🔽'),
('system', 'Material de escritório', 'expense', 1, 3, '🔽'),
('system', 'Multas Pagas', 'expense', 1, 3, '🔽'),
('system', 'Outras despesas', 'expense', 1, 3, '🔽'),
('system', 'Salários, encargos e benefícios', 'expense', 1, 3, '🔽'),
('system', 'Serviços contratados', 'expense', 1, 3, '🔽'),
('system', 'Taxas e contribuições', 'expense', 1, 3, '🔽'),
('system', 'Pagamento de CSLL Retido', 'expense', 1, 3, '🔽'),
('system', 'Pagamento de Cofins Retido', 'expense', 1, 3, '🔽'),
('system', 'Pagamento de INSS Retido', 'expense', 1, 3, '🔽'),
('system', 'Pagamento de IRPJ Retido', 'expense', 1, 3, '🔽'),
('system', 'Pagamento de Outras retenções', 'expense', 1, 3, '🔽'),
('system', 'Pagamento de ISS Retido', 'expense', 1, 3, '🔽'),
('system', 'Pagamento de PIS Retido', 'expense', 1, 3, '🔽'),
('system', 'CSLL Retido sobre Pagamentos', 'income', 1, 3, '🔼'),
('system', 'INSS Retido sobre Pagamentos', 'income', 1, 3, '🔼'),
('system', 'IRPJ Retido sobre Pagamentos', 'income', 1, 3, '🔼'),
('system', 'COFINS Retido sobre Pagamentos', 'income', 1, 3, '🔼'),
('system', 'PIS Retido sobre Pagamentos', 'income', 1, 3, '🔼'),
('system', 'ISS Retido sobre Pagamentos', 'income', 1, 3, '🔼'),
('system', 'Outras Retenções sobre Pagamentos', 'income', 1, 3, '🔼');

-- ATIVIDADES DE INVESTIMENTO subcategories
INSERT INTO categories (user_id, name, type, is_system, parent_id, icon) VALUES
('system', 'Compra de ativo fixo', 'expense', 1, 4, '🔽'),
('system', 'Venda de ativo fixo', 'income', 1, 4, '🔼');

-- ATIVIDADES DE FINANCIAMENTO subcategories
INSERT INTO categories (user_id, name, type, is_system, parent_id, icon) VALUES
('system', 'Aporte de capital', 'income', 1, 5, '🔼'),
('system', 'Obtenção de empréstimo', 'income', 1, 5, '🔼'),
('system', 'Pagamento de empréstimo', 'expense', 1, 5, '🔽'),
('system', 'Retirada de capital', 'expense', 1, 5, '🔽');
