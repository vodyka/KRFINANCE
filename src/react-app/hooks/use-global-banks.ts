import { useState, useEffect } from "react";
import { GlobalBank } from "@/react-app/lib/finance-types";

const STORAGE_KEY_GLOBAL_BANKS = "kryzer-global-banks";

const DEFAULT_BANKS: GlobalBank[] = [
  { codigo: "001", nome: "Banco do Brasil" },
  { codigo: "033", nome: "Santander" },
  { codigo: "077", nome: "Inter" },
  { codigo: "104", nome: "Caixa Econômica Federal" },
  { codigo: "237", nome: "Bradesco" },
  { codigo: "260", nome: "Nubank" },
  { codigo: "290", nome: "Pagseguro" },
  { codigo: "341", nome: "Itaú" },
  { codigo: "389", nome: "Banco Mercantil do Brasil" },
  { codigo: "422", nome: "Banco Safra" },
  { codigo: "748", nome: "Sicredi" },
  { codigo: "756", nome: "Sicoob" },
  { codigo: "197", nome: "Stone Pagamentos" },
  { codigo: "623", nome: "Banco Pan" },
  { codigo: "655", nome: "Banco Votorantim" },
  { codigo: "654", nome: "Banco Digimais" },
  { codigo: "403", nome: "Cora" },
  { codigo: "102", nome: "XP Investimentos" },
  { codigo: "336", nome: "Banco C6" },
  { codigo: "735", nome: "Neon" },
  { codigo: "136", nome: "Unicred" },
  { codigo: "003", nome: "Banco da Amazônia" },
  { codigo: "004", nome: "Banco do Nordeste" },
  { codigo: "070", nome: "BRB - Banco de Brasília" },
  { codigo: "041", nome: "Banrisul" },
  { codigo: "047", nome: "Banco do Estado de Sergipe" },
  { codigo: "021", nome: "Banestes" },
  { codigo: "085", nome: "Via Credi" },
  { codigo: "121", nome: "Banco Agibank" },
  { codigo: "323", nome: "Mercado Pago" },
  { codigo: "380", nome: "PicPay" },
  { codigo: "250", nome: "BCV" },
  { codigo: "746", nome: "Modal" },
  { codigo: "739", nome: "Banco Cetelem" },
  { codigo: "743", nome: "Banco Semear" },
  { codigo: "100", nome: "Pluxee" },
  { codigo: "133", nome: "Cresol" },
  { codigo: "097", nome: "Credisis" },
  { codigo: "016", nome: "CCM Desp Trans SC e RS" },
  { codigo: "084", nome: "Uniprime Norte do Paraná" },
  { codigo: "091", nome: "Unicred Central RS" },
  { codigo: "099", nome: "Uniprime Central" },
  { codigo: "087", nome: "Unicred Brasil Central" },
  { codigo: "088", nome: "Unicred Central SC" },
  { codigo: "089", nome: "Unicred Central SP" },
  { codigo: "014", nome: "Natixis Brasil" },
  { codigo: "130", nome: "Caruana" },
  { codigo: "000", nome: "Outros" },
];

export function useGlobalBanks() {
  const [globalBanks, setGlobalBanks] = useState<GlobalBank[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_GLOBAL_BANKS);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_BANKS;
      }
    }
    return DEFAULT_BANKS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_GLOBAL_BANKS, JSON.stringify(globalBanks));
  }, [globalBanks]);

  const getBankByCode = (codigo: string): GlobalBank | undefined => {
    return globalBanks.find(b => b.codigo === codigo);
  };

  const addGlobalBank = (bank: GlobalBank) => {
    setGlobalBanks(prev => [...prev, bank]);
  };

  const updateGlobalBank = (bank: GlobalBank) => {
    setGlobalBanks(prev => prev.map(b => b.codigo === bank.codigo ? bank : b));
  };

  const deleteGlobalBank = (codigo: string) => {
    setGlobalBanks(prev => prev.filter(b => b.codigo !== codigo));
  };

  return {
    globalBanks,
    getBankByCode,
    addGlobalBank,
    updateGlobalBank,
    deleteGlobalBank,
  };
}
