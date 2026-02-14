import { useState, useEffect } from "react";
import { Category, DEFAULT_CATEGORIES, BankAccount, Company, Payable, Payment, Receivable, Receipt, SupplierClient, PAYMENT_METHODS } from "@/react-app/lib/finance-types";
import { todayStr } from "@/react-app/lib/finance-utils";
import { useGlobalBanks } from "@/react-app/hooks/use-global-banks";
import { startAutoBackup, detectDataLoss, restoreFromBackup } from "@/react-app/lib/storage-backup";

const STORAGE_KEY_CATEGORIES = "kryzer-categories";
const STORAGE_KEY_BANKS = "kryzer-banks";
const STORAGE_KEY_COMPANIES = "kryzer-companies";
const STORAGE_KEY_ACTIVE_COMPANY = "kryzer-active-company";
const STORAGE_KEY_PAYABLES = "kryzer-payables";
const STORAGE_KEY_PAYMENTS = "kryzer-payments";
const STORAGE_KEY_RECEIVABLES = "kryzer-receivables";
const STORAGE_KEY_RECEIPTS = "kryzer-receipts";
const STORAGE_KEY_SUPPLIERS_CLIENTS = "kryzer-suppliers-clients";

export function useFinanceData() {
  const { getBankByCode } = useGlobalBanks();

  // Iniciar sistema de backup automático
  useEffect(() => {
    startAutoBackup();
    
    // Detectar perda de dados e restaurar se necessário
    if (detectDataLoss()) {
      console.warn("[Sistema] Perda de dados detectada! Restaurando do backup...");
      if (restoreFromBackup()) {
        console.log("[Sistema] Dados restaurados com sucesso do backup!");
        // Recarregar a página para aplicar os dados restaurados
        window.location.reload();
      }
    }
  }, []);
  
  const [categories, setCategories] = useState<Category[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_CATEGORIES;
      }
    }
    return DEFAULT_CATEGORIES;
  });

  const [banks, setBanks] = useState<BankAccount[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_BANKS);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Migrate old bankName to bankCode if needed
        return parsed.map((b: BankAccount) => {
          if (b.bankName && !b.bankCode) {
            // Try to find matching bank by name, default to "000" (Outros)
            return { ...b, bankCode: "000" };
          }
          return b;
        });
      } catch {
        return [];
      }
    }
    return [];
  });

  const [companies, setCompanies] = useState<Company[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_COMPANIES);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.length > 0) return parsed;
      } catch {
        // fall through to create default
      }
    }
    // Create default company
    const defaultCompany: Company = {
      id: "company-default",
      name: "Minha Empresa",
    };
    return [defaultCompany];
  });

  const [activeCompanyId, setActiveCompanyId] = useState<string>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_ACTIVE_COMPANY);
    if (stored) return stored;
    // Set to default company
    return "company-default";
  });

  const [payables, setPayables] = useState<Payable[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_PAYABLES);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_PAYMENTS);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [receivables, setReceivables] = useState<Receivable[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_RECEIVABLES);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [receipts, setReceipts] = useState<Receipt[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_RECEIPTS);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [suppliersClients, setSuppliersClients] = useState<SupplierClient[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_SUPPLIERS_CLIENTS);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Persist to localStorage with safety checks
  useEffect(() => {
    if (categories && categories.length > 0) {
      localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
    }
  }, [categories]);

  useEffect(() => {
    if (banks && Array.isArray(banks)) {
      localStorage.setItem(STORAGE_KEY_BANKS, JSON.stringify(banks));
    }
  }, [banks]);

  useEffect(() => {
    if (companies && companies.length > 0) {
      localStorage.setItem(STORAGE_KEY_COMPANIES, JSON.stringify(companies));
    }
  }, [companies]);

  // Migrate banks without companyId to default company and ensure default banks
  useEffect(() => {
    let needsUpdate = false;
    const updatedBanks = [...banks];

    // First, migrate any banks without a companyId to the default company
    updatedBanks.forEach((bank, index) => {
      if (!bank.companyId) {
        updatedBanks[index] = { ...bank, companyId: "company-default" };
        needsUpdate = true;
      }
    });

    companies.forEach(company => {
      const companyBanks = updatedBanks.filter(b => b.companyId === company.id);
      
      // If company has no banks, create a default one
      if (companyBanks.length === 0) {
        const defaultBank: BankAccount = {
          id: `bank-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          companyId: company.id,
          bankCode: "000", // Outros
          accountName: "Caixa Geral",
          initialBalance: 0,
          balanceStartDate: todayStr(),
          isDefault: true,
        };
        updatedBanks.push(defaultBank);
        needsUpdate = true;
      } else {
        // If company has banks but none is default, make the first one default
        const hasDefault = companyBanks.some(b => b.isDefault);
        if (!hasDefault) {
          const firstBankIndex = updatedBanks.findIndex(b => b.id === companyBanks[0].id);
          if (firstBankIndex !== -1) {
            updatedBanks[firstBankIndex] = { ...updatedBanks[firstBankIndex], isDefault: true };
            needsUpdate = true;
          }
        }
      }
    });

    if (needsUpdate) {
      setBanks(updatedBanks);
    }
  }, [companies.length]);

  useEffect(() => {
    if (activeCompanyId) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_COMPANY, activeCompanyId);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    if (payables && Array.isArray(payables)) {
      localStorage.setItem(STORAGE_KEY_PAYABLES, JSON.stringify(payables));
    }
  }, [payables]);

  useEffect(() => {
    if (payments && Array.isArray(payments)) {
      localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(payments));
    }
  }, [payments]);

  useEffect(() => {
    if (receivables && Array.isArray(receivables)) {
      localStorage.setItem(STORAGE_KEY_RECEIVABLES, JSON.stringify(receivables));
    }
  }, [receivables]);

  useEffect(() => {
    if (receipts && Array.isArray(receipts)) {
      localStorage.setItem(STORAGE_KEY_RECEIPTS, JSON.stringify(receipts));
    }
  }, [receipts]);

  useEffect(() => {
    if (suppliersClients && Array.isArray(suppliersClients)) {
      localStorage.setItem(STORAGE_KEY_SUPPLIERS_CLIENTS, JSON.stringify(suppliersClients));
    }
  }, [suppliersClients]);

  const getBankBalance = (bankId: string): number => {
    const bank = banks.find(b => b.id === bankId);
    if (!bank) return 0;
    
    // Calculate balance: initial balance - payments + receipts
    const bankPayments = payments.filter(p => p.bankId === bankId);
    const totalPaid = bankPayments.reduce((sum, p) => sum + p.amount, 0);
    
    const bankReceipts = receipts.filter(r => r.bankId === bankId);
    const totalReceived = bankReceipts.reduce((sum, r) => sum + r.amount, 0);
    
    return bank.initialBalance - totalPaid + totalReceived;
  };

  const getBankName = (bankId: string): string => {
    const bank = banks.find(b => b.id === bankId);
    if (!bank) return "—";
    
    const globalBank = getBankByCode(bank.bankCode);
    return globalBank ? globalBank.nome : bank.accountName;
  };

  const getBankLogo = (bankId: string): string | undefined => {
    const bank = banks.find(b => b.id === bankId);
    if (!bank) return undefined;
    
    const globalBank = getBankByCode(bank.bankCode);
    return globalBank?.logoUrl;
  };

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : "—";
  };

  const getPaymentMethodLabel = (value: string): string => {
    const method = PAYMENT_METHODS.find(m => m.value === value);
    return method ? method.label : value;
  };

  // Filter data by active company
  const companyBanks = banks.filter(b => b.companyId === activeCompanyId);
  const companyPayables = payables.filter(p => p.companyId === activeCompanyId);
  const companyPayments = payments.filter(p => p.companyId === activeCompanyId);
  const companyReceivables = receivables.filter(r => r.companyId === activeCompanyId);
  const companyReceipts = receipts.filter(r => r.companyId === activeCompanyId);
  const companySuppliersClients = suppliersClients.filter(s => s.companyId === activeCompanyId);

  const addSupplierClient = (sc: SupplierClient) => {
    setSuppliersClients([...suppliersClients, sc]);
  };

  const updateSupplierClient = (sc: SupplierClient) => {
    setSuppliersClients(suppliersClients.map(s => s.id === sc.id ? sc : s));
  };

  const deleteSupplierClient = (id: string) => {
    setSuppliersClients(suppliersClients.filter(s => s.id !== id));
  };

  return {
    categories,
    setCategories,
    banks: companyBanks,
    setBanks,
    companies,
    setCompanies,
    activeCompanyId,
    setActiveCompanyId,
    payables: companyPayables,
    setPayables,
    payments: companyPayments,
    setPayments,
    receivables: companyReceivables,
    setReceivables,
    receipts: companyReceipts,
    setReceipts,
    suppliersClients: companySuppliersClients,
    addSupplierClient,
    updateSupplierClient,
    deleteSupplierClient,
    getBankBalance,
    getBankName,
    getBankLogo,
    getCategoryName,
    getPaymentMethodLabel,
    companyPayables,
    companyReceivables,
  };
}
