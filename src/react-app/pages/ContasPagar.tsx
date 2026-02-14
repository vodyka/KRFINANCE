import { useState } from "react";
import { CurrencyInput } from "@/react-app/components/CurrencyInput";
import { useFinanceData } from "@/react-app/hooks/use-finance-data";
import { Payable, Payment, PAYMENT_METHODS, CATEGORY_GROUPS } from "@/react-app/lib/finance-types";
import { formatCurrency, formatDateBR, generateId, isOverdue, addMonths, todayStr } from "@/react-app/lib/finance-utils";
import { Card, CardContent } from "@/react-app/components/ui/card";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Switch } from "@/react-app/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/react-app/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/react-app/components/ui/table";
import { Badge } from "@/react-app/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/react-app/components/ui/tabs";
import { Checkbox } from "@/react-app/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/react-app/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/react-app/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, CheckCircle, Copy, ArrowDown, Search, DollarSign, ChevronDown, ChevronRight, SplitSquareHorizontal, Eye } from "lucide-react";

export default function ContasPagarPage() {
  const {
    banks, categories, payables, setPayables, payments, setPayments,
    getCategoryName, getPaymentMethodLabel, activeCompanyId,
    getBankBalance, suppliersClients,
  } = useFinanceData();

  const [insufficientBalanceOpen, setInsufficientBalanceOpen] = useState(false);
  const [insufficientBalanceMsg, setInsufficientBalanceMsg] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Payable | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterBank, setFilterBank] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("contas");

  // Installment state
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(2);
  const [installmentRows, setInstallmentRows] = useState<{ date: string; amount: number }[]>([]);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Payable | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Selection for grouped payment
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ date: todayStr(), bankId: "", paymentMethod: "", description: "" });

  // Expanded payment in lançamentos
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  // Partial payment state
  const [partialPayOpen, setPartialPayOpen] = useState(false);
  const [partialPayTarget, setPartialPayTarget] = useState<Payable | null>(null);
  const [partialPayForm, setPartialPayForm] = useState({ amount: "", date: todayStr(), bankId: "", paymentMethod: "" });

  // View partial details
  const [partialDetailsOpen, setPartialDetailsOpen] = useState(false);
  const [partialDetailsGroupId, setPartialDetailsGroupId] = useState("");
  const [partialDetailsPayable, setPartialDetailsPayable] = useState<Payable | null>(null);

  // Installment details state
  const [installmentDetailsOpen, setInstallmentDetailsOpen] = useState(false);
  const [installmentDetailsGroupId, setInstallmentDetailsGroupId] = useState("");

  // Mark as paid dialog state
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [markPaidTarget, setMarkPaidTarget] = useState<Payable | null>(null);
  const [markPaidForm, setMarkPaidForm] = useState({ 
    date: todayStr(), 
    bankId: "", 
    paymentMethod: "", 
    amount: "",
    discount: "",
    interest: "",
    fine: ""
  });
  const [showExtraFields, setShowExtraFields] = useState(false);

  const expenseCategories = categories.filter(c => c.type === "despesa");
  const suppliers = suppliersClients.filter(sc => sc.contactTypes.includes("fornecedor"));

  const getSupplierName = (supplierId: string): string => {
    if (!supplierId) return "—";
    const supplier = suppliersClients.find(s => s.id === supplierId);
    return supplier ? supplier.name : "—";
  };

  const [form, setForm] = useState({ description: "", amount: "", dueDate: "", bankId: "", categoryId: "", paymentMethod: "", supplierId: "" });
  const resetForm = () => {
    setForm({ description: "", amount: "", dueDate: "", bankId: "", categoryId: "", paymentMethod: "", supplierId: "" });
    setIsInstallment(false);
    setInstallmentRows([]);
    setInstallmentCount(2);
  };

  const openNew = () => { resetForm(); setEditing(null); setOpen(true); };
  const openEdit = (p: Payable) => {
    setForm({ description: p.description, amount: String(p.amount * 100), dueDate: p.dueDate, bankId: p.bankId, categoryId: p.categoryId, paymentMethod: p.paymentMethod, supplierId: p.supplierId || "" });
    setEditing(p);
    setIsInstallment(false);
    setInstallmentRows([]);
    setOpen(true);
  };

  const generateInstallments = () => {
    const total = parseFloat(form.amount) / 100 || 0;
    if (total <= 0 || !form.dueDate || installmentCount < 2) return;
    const perInstallment = Math.floor((total / installmentCount) * 100) / 100;
    const remainder = Math.round((total - perInstallment * (installmentCount - 1)) * 100) / 100;
    const rows = [];
    for (let i = 0; i < installmentCount; i++) {
      rows.push({
        date: addMonths(form.dueDate, i),
        amount: i === installmentCount - 1 ? remainder : perInstallment,
      });
    }
    setInstallmentRows(rows);
  };

  const updateInstallmentRow = (index: number, field: "date" | "amount", value: string) => {
    setInstallmentRows(prev => prev.map((row, i) => {
      if (i !== index) return row;
      return field === "date" ? { ...row, date: value } : { ...row, amount: parseFloat(value) / 100 || 0 };
    }));
  };

  const installmentTotal = installmentRows.reduce((s, r) => s + r.amount, 0);
  const formTotal = parseFloat(form.amount) / 100 || 0;
  const installmentValid = Math.abs(installmentTotal - formTotal) < 0.01;

  const handleSave = () => {
    if (!form.description || !form.amount || !form.dueDate || !form.bankId || !form.categoryId || !form.paymentMethod) return;

    if (isInstallment && installmentRows.length >= 2 && installmentValid) {
      const groupId = generateId();
      const entries: Payable[] = installmentRows.map((row, i) => ({
        id: generateId(),
        companyId: activeCompanyId,
        description: form.description,
        amount: row.amount,
        dueDate: row.date,
        bankId: form.bankId,
        categoryId: form.categoryId,
        paymentMethod: form.paymentMethod,
        supplierId: form.supplierId || undefined,
        status: "pendente" as const,
        installmentGroupId: groupId,
        installmentNumber: i + 1,
        installmentTotal: installmentRows.length,
      }));
      setPayables(prev => [...prev, ...entries]);
    } else {
      const entry: Payable = {
        id: editing?.id || generateId(),
        companyId: editing?.companyId || activeCompanyId,
        description: form.description,
        amount: parseFloat(form.amount) / 100,
        dueDate: form.dueDate,
        bankId: form.bankId,
        categoryId: form.categoryId,
        paymentMethod: form.paymentMethod,
        supplierId: form.supplierId || undefined,
        status: editing?.status === "pago" ? "pago" : "pendente",
        installmentGroupId: editing?.installmentGroupId,
        installmentNumber: editing?.installmentNumber,
        installmentTotal: editing?.installmentTotal,
      };
      if (editing) {
        setPayables(prev => prev.map(p => p.id === editing.id ? entry : p));
      } else {
        setPayables(prev => [...prev, entry]);
      }
    }
    setOpen(false);
    resetForm();
  };

  const handleDeleteClick = (p: Payable) => {
    if (p.installmentGroupId) {
      setDeleteTarget(p);
      setShowDeleteDialog(true);
    } else {
      setPayables(prev => prev.filter(x => x.id !== p.id));
    }
  };

  const deleteSingle = () => {
    if (deleteTarget) {
      setPayables(prev => prev.filter(x => x.id !== deleteTarget.id));
      setShowDeleteDialog(false);
      setDeleteTarget(null);
    }
  };

  const deleteAllInstallments = () => {
    if (deleteTarget?.installmentGroupId) {
      setPayables(prev => prev.filter(x => x.installmentGroupId !== deleteTarget.installmentGroupId));
      setShowDeleteDialog(false);
      setDeleteTarget(null);
    }
  };

  const checkBalanceAndPay = (bankId: string, amount: number, onSuccess: () => void) => {
    const balance = getBankBalance(bankId);
    const bank = banks.find(b => b.id === bankId);
    const overdraft = bank?.overdraftLimit || 0;
    const available = balance + overdraft;
    if (amount > available) {
      setInsufficientBalanceMsg(
        `Saldo insuficiente na conta "${bank?.accountName || '—'}".\n\nSaldo disponível: ${formatCurrency(balance)}\nLimite cheque especial: ${formatCurrency(overdraft)}\nTotal disponível: ${formatCurrency(available)}\nValor necessário: ${formatCurrency(amount)}`
      );
      setInsufficientBalanceOpen(true);
      return;
    }
    onSuccess();
  };

  const markPaid = (id: string) => {
    const p = payables.find(x => x.id === id);
    if (!p) return;
    setMarkPaidTarget(p);
    setMarkPaidForm({ 
      date: todayStr(), 
      bankId: p.bankId, 
      paymentMethod: p.paymentMethod,
      amount: String(p.amount * 100),
      discount: "",
      interest: "",
      fine: ""
    });
    setShowExtraFields(false);
    setMarkPaidDialogOpen(true);
  };

  const confirmMarkPaid = () => {
    if (!markPaidTarget || !markPaidForm.date || !markPaidForm.bankId || !markPaidForm.paymentMethod || !markPaidForm.amount) return;
    const paidAmount = parseFloat(markPaidForm.amount) / 100 || 0;
    const discount = parseFloat(markPaidForm.discount) / 100 || 0;
    const interest = parseFloat(markPaidForm.interest) / 100 || 0;
    const fine = parseFloat(markPaidForm.fine) / 100 || 0;
    
    if (paidAmount <= 0) return;

    const totalAmount = paidAmount - discount + interest + fine;

    checkBalanceAndPay(markPaidForm.bankId, totalAmount, () => {
      const payment: Payment = {
        id: generateId(),
        companyId: activeCompanyId,
        date: markPaidForm.date,
        bankId: markPaidForm.bankId,
        paymentMethod: markPaidForm.paymentMethod,
        amount: totalAmount,
        payableIds: [markPaidTarget.id],
        description: `Pgto: ${markPaidTarget.description}`,
        discount: discount > 0 ? discount : undefined,
        interest: interest > 0 ? interest : undefined,
        fine: fine > 0 ? fine : undefined,
      };
      setPayments(prev => [...prev, payment]);
      setPayables(prev => prev.map(x => x.id === markPaidTarget.id ? { ...x, status: "pago" as const } : x));
      setMarkPaidDialogOpen(false);
      setMarkPaidTarget(null);
    });
  };

  const handleDuplicate = (p: Payable) => {
    setForm({
      description: p.description,
      amount: String(p.amount * 100),
      dueDate: p.dueDate,
      bankId: p.bankId,
      categoryId: p.categoryId,
      paymentMethod: p.paymentMethod,
      supplierId: p.supplierId || "",
    });
    setEditing(null);
    setIsInstallment(false);
    setInstallmentRows([]);
    setOpen(true);
  };

  // --- Partial Payment ---
  const openPartialPay = (p: Payable) => {
    setPartialPayTarget(p);
    setPartialPayForm({ amount: "", date: todayStr(), bankId: p.bankId, paymentMethod: p.paymentMethod });
    setPartialPayOpen(true);
  };

  const handlePartialPay = () => {
    if (!partialPayTarget) return;
    const paidAmount = parseFloat(partialPayForm.amount) / 100 || 0;
    if (paidAmount <= 0 || paidAmount >= partialPayTarget.amount) return;
    if (!partialPayForm.date || !partialPayForm.bankId || !partialPayForm.paymentMethod) return;

    checkBalanceAndPay(partialPayForm.bankId, paidAmount, () => {
      const groupId = partialPayTarget.partialGroupId || generateId();

      // Find all existing items in this partial group
      const existingInGroup = payables.filter(p => p.partialGroupId === groupId && p.id !== partialPayTarget.id);
      const paidCount = existingInGroup.filter(p => p.status === "pago").length;
      const newTotal = paidCount + 2; // existing paid + this new paid + remaining

      // Create new paid entry
      const paidEntry: Payable = {
        ...partialPayTarget,
        id: generateId(),
        amount: paidAmount,
        status: "pago" as const,
        partialGroupId: groupId,
        partialNumber: paidCount + 1,
        partialTotal: newTotal,
      };

      // Update remaining entry
      const remainingAmount = Math.round((partialPayTarget.amount - paidAmount) * 100) / 100;

      // Create payment record
      const payment: Payment = {
        id: generateId(),
        companyId: activeCompanyId,
        date: partialPayForm.date,
        bankId: partialPayForm.bankId,
        paymentMethod: partialPayForm.paymentMethod,
        amount: paidAmount,
        payableIds: [paidEntry.id],
        description: `Pgto parcial: ${partialPayTarget.description}`,
      };

      setPayables(prev => {
        let updated = prev.map(p => {
          if (p.id === partialPayTarget.id) {
            // Update the original to be the remaining
            return {
              ...p,
              amount: remainingAmount,
              partialGroupId: groupId,
              partialNumber: paidCount + 2,
              partialTotal: newTotal,
            };
          }
          // Update existing group members' total
          if (p.partialGroupId === groupId) {
            return { ...p, partialTotal: newTotal };
          }
          return p;
        });
        // Add the paid entry
        updated.push(paidEntry);
        return updated;
      });

      setPayments(prev => [...prev, payment]);
      setPartialPayOpen(false);
      setPartialPayTarget(null);
    });
  };

  // View partial details
  const openPartialDetails = (groupId: string, payable: Payable) => {
    setPartialDetailsGroupId(groupId);
    setPartialDetailsPayable(payable);
    setPartialDetailsOpen(true);
  };

  const getPartialGroupItems = (groupId: string) => {
    return payables
      .filter(p => p.partialGroupId === groupId)
      .sort((a, b) => (a.partialNumber || 0) - (b.partialNumber || 0));
  };

  const getPartialPayments = (groupId: string) => {
    const groupItemIds = new Set(payables.filter(p => p.partialGroupId === groupId).map(p => p.id));
    return payments.filter(pm => pm.payableIds.some(id => groupItemIds.has(id)));
  };

  // View installment details
  const openInstallmentDetails = (groupId: string) => {
    setInstallmentDetailsGroupId(groupId);
    setInstallmentDetailsOpen(true);
  };

  const getInstallmentGroupItems = (groupId: string) => {
    return payables
      .filter(p => p.installmentGroupId === groupId)
      .sort((a, b) => (a.installmentNumber || 0) - (b.installmentNumber || 0));
  };

  const displayPayables = payables.map(p => {
    if (p.status === "pendente" && isOverdue(p.dueDate)) return { ...p, status: "vencido" as const };
    return p;
  });

  const filtered = displayPayables.filter(p => {
    // Na aba "contas", mostrar apenas contas pendentes/vencidas (não pagas)
    if (activeTab === "contas" && p.status === "pago") return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterBank !== "all" && p.bankId !== filterBank) return false;
    if (filterCategory !== "all" && p.categoryId !== filterCategory) return false;
    if (filterDateFrom && p.dueDate < filterDateFrom) return false;
    if (filterDateTo && p.dueDate > filterDateTo) return false;
    if (searchTerm && !p.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const statusBadge = (status: string) => {
    switch (status) {
      case "pago": return <Badge className="bg-green-600/10 text-green-600 border-green-600/20 hover:bg-green-600/20">Pago</Badge>;
      case "vencido": return <Badge variant="destructive">Vencido</Badge>;
      default: return <Badge variant="outline">Pendente</Badge>;
    }
  };

  const getGroupInfo = (p: Payable) => {
    if (!p.installmentGroupId) return null;
    const group = payables.filter(x => x.installmentGroupId === p.installmentGroupId);
    const totalValue = group.reduce((s, x) => s + x.amount, 0);
    return { total: group.length, totalValue };
  };

  // --- Selection logic ---
  const pendingFiltered = filtered.filter(p => p.status !== "pago");
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === pendingFiltered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingFiltered.map(p => p.id)));
    }
  };

  const selectedPayables = filtered.filter(p => selectedIds.has(p.id));
  const selectedTotal = selectedPayables.reduce((s, p) => s + p.amount, 0);

  // --- Payment logic ---
  const openPaymentDialog = () => {
    if (selectedIds.size === 0) return;
    const descs = [...new Set(selectedPayables.map(p => p.description))];
    setPaymentForm({
      date: todayStr(),
      bankId: selectedPayables[0]?.bankId || "",
      paymentMethod: selectedPayables[0]?.paymentMethod || "",
      description: `Pgto: ${descs.join(", ")}`,
    });
    setPaymentDialogOpen(true);
  };

  const handlePayment = () => {
    if (!paymentForm.date || !paymentForm.bankId || !paymentForm.paymentMethod) return;
    checkBalanceAndPay(paymentForm.bankId, selectedTotal, () => {
      const ids = Array.from(selectedIds);
      const payment: Payment = {
        id: generateId(),
        companyId: activeCompanyId,
        date: paymentForm.date,
        bankId: paymentForm.bankId,
        paymentMethod: paymentForm.paymentMethod,
        amount: selectedTotal,
        payableIds: ids,
        description: paymentForm.description,
      };
      setPayments(prev => [...prev, payment]);
      setPayables(prev => prev.map(p => ids.includes(p.id) ? { ...p, status: "pago" as const } : p));
      setSelectedIds(new Set());
      setPaymentDialogOpen(false);
    });
  };

  const handleDeletePayment = (payment: Payment) => {
    setPayables(prev => prev.map(p => payment.payableIds.includes(p.id) ? { ...p, status: "pendente" as const } : p));
    setPayments(prev => prev.filter(pm => pm.id !== payment.id));
  };

  const companyPayments = payments.sort((a, b) => b.date.localeCompare(a.date));

  const getDescriptionLabel = (p: Payable) => {
    let label = p.description;
    if (p.installmentNumber) {
      label += ` [Parcela ${p.installmentNumber}/${p.installmentTotal}]`;
    }
    if (p.partialNumber) {
      label += ` [Parcial ${p.partialNumber}/${p.partialTotal}]`;
    }
    return label;
  };

  return (
    <div className="p-4 lg:p-6 bg-[#fafafa] min-h-screen space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Contas a Pagar</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas despesas e pagamentos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-[#001429] hover:bg-[#001429]/90"><Plus className="h-4 w-4 mr-1" />Nova conta</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Editar Conta" : "Nova Conta a Pagar"}</DialogTitle></DialogHeader>

            {editing?.installmentGroupId && (() => {
              const info = getGroupInfo(editing);
              return info ? (
                <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                  <p className="font-medium">Parcela {editing.installmentNumber}/{editing.installmentTotal}</p>
                  <p className="text-xs text-muted-foreground">Valor total do parcelamento: {formatCurrency(info.totalValue)}</p>
                </div>
              ) : null;
            })()}

            <div className="space-y-3">
              <div><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div><Label>Valor total (R$)</Label><CurrencyInput value={form.amount} onValueChange={v => setForm(f => ({ ...f, amount: v }))} /></div>
              <div><Label>Vencimento</Label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
              <div>
                <Label>Banco</Label>
                <Select value={form.bankId} onValueChange={v => setForm(f => ({ ...f, bankId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{banks.map(b => <SelectItem key={b.id} value={b.id}>{b.accountName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_GROUPS.map(g => {
                      const groupCats = expenseCategories.filter(c => c.groupId === g.id);
                      if (groupCats.length === 0) return null;
                      return (
                        <div key={g.id}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">{g.name}</div>
                          {groupCats.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              <div className="flex items-center gap-1.5">
                                <ArrowDown className="h-3 w-3 text-red-600 shrink-0" />
                                {c.name}
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fornecedor (opcional)</Label>
                <Select value={form.supplierId || "none"} onValueChange={v => setForm(f => ({ ...f, supplierId: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {!editing && (
                <div className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Parcelar?</Label>
                    <Switch checked={isInstallment} onCheckedChange={setIsInstallment} />
                  </div>
                  {isInstallment && (
                    <>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm whitespace-nowrap">Nº de parcelas</Label>
                        <Input
                          type="number"
                          min={2}
                          max={48}
                          value={installmentCount}
                          onChange={e => setInstallmentCount(Math.max(2, parseInt(e.target.value) || 2))}
                          className="w-20"
                        />
                        <Button type="button" size="sm" variant="outline" onClick={generateInstallments}>
                          Gerar
                        </Button>
                      </div>
                      {installmentRows.length > 0 && (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {installmentRows.map((row, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground w-16 shrink-0">Parc. {i + 1}/{installmentRows.length}</span>
                              <Input type="date" value={row.date} onChange={e => updateInstallmentRow(i, "date", e.target.value)} className="flex-1" />
                              <CurrencyInput value={String(row.amount * 100)} onValueChange={v => updateInstallmentRow(i, "amount", v)} className="w-24" />
                            </div>
                          ))}
                          <div className={`text-xs text-right ${installmentValid ? "text-green-600" : "text-red-600"}`}>
                            Total parcelas: {formatCurrency(installmentTotal)} / {formatCurrency(formTotal)}
                            {!installmentValid && " ⚠️ Valores não batem"}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <Button className="w-full bg-[#001429] hover:bg-[#001429]/90" onClick={handleSave} disabled={isInstallment && installmentRows.length > 0 && !installmentValid}>
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="contas">Contas</TabsTrigger>
          <TabsTrigger value="lancamentos">
            Lançamentos
            {companyPayments.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{companyPayments.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* === CONTAS TAB === */}
        <TabsContent value="contas" className="space-y-4">
          {/* Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar por descrição..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterBank} onValueChange={setFilterBank}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Banco" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {banks.map(b => <SelectItem key={b.id} value={b.id}>{b.accountName}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {CATEGORY_GROUPS.map(g => {
                    const groupCats = expenseCategories.filter(c => c.groupId === g.id);
                    if (groupCats.length === 0) return null;
                    return (
                      <div key={g.id}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">{g.name}</div>
                        {groupCats.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center gap-1.5">
                              <ArrowDown className="h-3 w-3 text-red-600 shrink-0" />
                              {c.name}
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    );
                  })}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-[140px]" placeholder="De" />
                <span className="text-muted-foreground text-sm">até</span>
                <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-[140px]" placeholder="Até" />
              </div>
            </div>
          </div>

          {/* Selection bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
              <span className="text-sm font-medium">
                {selectedIds.size} selecionada{selectedIds.size > 1 ? "s" : ""} — Total: {formatCurrency(selectedTotal)}
              </span>
              <Button size="sm" onClick={openPaymentDialog} className="gap-1.5 bg-[#001429] hover:bg-[#001429]/90">
                <DollarSign className="h-4 w-4" />
                Pagar selecionadas
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Limpar</Button>
            </div>
          )}

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={pendingFiltered.length > 0 && selectedIds.size === pendingFiltered.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Selecionar todos"
                      />
                    </TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="hidden sm:table-cell">Vencimento</TableHead>
                    <TableHead className="hidden md:table-cell">Fornecedor</TableHead>
                    <TableHead className="hidden md:table-cell">Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma conta cadastrada</TableCell></TableRow>
                  ) : filtered.map(p => (
                    <TableRow key={p.id} className={p.status === "vencido" ? "bg-red-600/5" : ""}>
                      <TableCell>
                        {p.status !== "pago" ? (
                          <Checkbox
                            checked={selectedIds.has(p.id)}
                            onCheckedChange={() => toggleSelect(p.id)}
                            aria-label={`Selecionar ${p.description}`}
                          />
                        ) : (
                          <span className="block w-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1">
                          <span>{getDescriptionLabel(p)}</span>
                          {p.installmentGroupId && (
                            <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => openInstallmentDetails(p.installmentGroupId!)} title="Ver todas as parcelas">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {p.partialGroupId && (
                            <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => openPartialDetails(p.partialGroupId!, p)} title="Ver detalhes parciais">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(p.amount)}</TableCell>
                      <TableCell className="hidden sm:table-cell">{formatDateBR(p.dueDate)}</TableCell>
                      <TableCell className="hidden md:table-cell">{getSupplierName(p.supplierId || "")}</TableCell>
                      <TableCell className="hidden md:table-cell">{getCategoryName(p.categoryId)}</TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {p.status !== "pago" && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => markPaid(p.id)} title="Marcar como pago">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openPartialPay(p)} title="Pagamento parcial">
                                <SplitSquareHorizontal className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(p)} title="Duplicar">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteClick(p)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === LANÇAMENTOS TAB === */}
        <TabsContent value="lancamentos" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Data Pgto.</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="hidden sm:table-cell">Fornecedor</TableHead>
                    <TableHead className="hidden sm:table-cell">Forma</TableHead>
                    <TableHead className="hidden md:table-cell">Contas</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyPayments.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum pagamento registrado</TableCell></TableRow>
                  ) : companyPayments.map(pm => {
                    const isExpanded = expandedPaymentId === pm.id;
                    const linkedPayables = payables.filter(p => pm.payableIds.includes(p.id));
                    return (
                      <>
                        <TableRow key={pm.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedPaymentId(isExpanded ? null : pm.id)}>
                          <TableCell>
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </TableCell>
                          <TableCell className="font-medium">{pm.description}</TableCell>
                          <TableCell>{formatDateBR(pm.date)}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(pm.amount)}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {linkedPayables.length === 1 ? getSupplierName(linkedPayables[0]?.supplierId || "") : "Múltiplos"}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">{getPaymentMethodLabel(pm.paymentMethod)}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="secondary">{pm.payableIds.length} conta{pm.payableIds.length > 1 ? "s" : ""}</Badge>
                          </TableCell>
                          <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeletePayment(pm)} title="Estornar pagamento">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isExpanded && linkedPayables.map(lp => (
                          <TableRow key={`${pm.id}-${lp.id}`} className="bg-muted/30">
                            <TableCell />
                            <TableCell className="text-sm pl-8">
                              {getDescriptionLabel(lp)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formatDateBR(lp.dueDate)}</TableCell>
                            <TableCell className="text-sm">{formatCurrency(lp.amount)}</TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{getSupplierName(lp.supplierId || "")}</TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{getCategoryName(lp.categoryId)}</TableCell>
                            <TableCell className="hidden md:table-cell" />
                            <TableCell />
                          </TableRow>
                        ))}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium">{selectedPayables.length} conta{selectedPayables.length > 1 ? "s" : ""} selecionada{selectedPayables.length > 1 ? "s" : ""}</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedPayables.map(p => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span className="truncate">{getDescriptionLabel(p)}</span>
                    <span className="shrink-0 ml-2">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(selectedTotal)}</span>
              </div>
            </div>

            <div><Label>Descrição</Label><Input value={paymentForm.description} onChange={e => setPaymentForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><Label>Data do Pagamento</Label><Input type="date" value={paymentForm.date} onChange={e => setPaymentForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div>
              <Label>Banco</Label>
              <Select value={paymentForm.bankId} onValueChange={v => setPaymentForm(f => ({ ...f, bankId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{banks.map(b => <SelectItem key={b.id} value={b.id}>{b.accountName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={paymentForm.paymentMethod} onValueChange={v => setPaymentForm(f => ({ ...f, paymentMethod: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <Button className="w-full bg-[#001429] hover:bg-[#001429]/90" onClick={handlePayment} disabled={!paymentForm.date || !paymentForm.bankId || !paymentForm.paymentMethod}>
              <DollarSign className="h-4 w-4 mr-1" />
              Confirmar Pagamento — {formatCurrency(selectedTotal)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Partial payment dialog */}
      <Dialog open={partialPayOpen} onOpenChange={setPartialPayOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SplitSquareHorizontal className="h-5 w-5" /> Pagamento Parcial
            </DialogTitle>
            <DialogDescription>Pague parte do valor e o restante continuará como pendente.</DialogDescription>
          </DialogHeader>
          {partialPayTarget && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p className="font-medium">{partialPayTarget.description}</p>
                <p className="text-lg font-bold">{formatCurrency(partialPayTarget.amount)}</p>
                <p className="text-xs text-muted-foreground">Valor total pendente</p>
              </div>
              <div>
                <Label>Valor a pagar agora (R$)</Label>
                <CurrencyInput value={partialPayForm.amount} onValueChange={v => setPartialPayForm(f => ({ ...f, amount: v }))} />
                {(() => {
                  const val = parseFloat(partialPayForm.amount) / 100 || 0;
                  const remaining = partialPayTarget.amount - val;
                  if (val > 0 && val < partialPayTarget.amount) {
                    return <p className="text-xs text-muted-foreground mt-1">Restante: {formatCurrency(remaining)}</p>;
                  }
                  return null;
                })()}
              </div>
              <div>
                <Label>Data do Pagamento</Label>
                <Input type="date" value={partialPayForm.date} onChange={e => setPartialPayForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <Label>Banco</Label>
                <Select value={partialPayForm.bankId} onValueChange={v => setPartialPayForm(f => ({ ...f, bankId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{banks.map(b => <SelectItem key={b.id} value={b.id}>{b.accountName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={partialPayForm.paymentMethod} onValueChange={v => setPartialPayForm(f => ({ ...f, paymentMethod: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPartialPayOpen(false)}>Cancelar</Button>
            <Button
              onClick={handlePartialPay}
              disabled={!partialPayForm.amount || !partialPayForm.date || !partialPayForm.bankId || !partialPayForm.paymentMethod ||
                (parseFloat(partialPayForm.amount) / 100 || 0) <= 0 || (parseFloat(partialPayForm.amount) / 100 || 0) >= (partialPayTarget?.amount || 0)}
              className="bg-[#001429] hover:bg-[#001429]/90"
            >
              Confirmar Parcial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Partial details dialog */}
      <Dialog open={partialDetailsOpen} onOpenChange={setPartialDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" /> Detalhes do Pagamento Parcial
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">Contas vinculadas</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parcial</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getPartialGroupItems(partialDetailsGroupId).map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">{p.partialNumber}/{p.partialTotal}</TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(p.amount)}</TableCell>
                      <TableCell>{statusBadge(p.status === "pendente" && isOverdue(p.dueDate) ? "vencido" : p.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {(() => {
              const partialPmts = getPartialPayments(partialDetailsGroupId);
              if (partialPmts.length === 0) return null;
              return (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">Pagamentos efetuados</div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Forma</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partialPmts.map(pm => (
                        <TableRow key={pm.id}>
                          <TableCell className="text-sm">{formatDateBR(pm.date)}</TableCell>
                          <TableCell className="text-sm font-medium">{formatCurrency(pm.amount)}</TableCell>
                          <TableCell className="text-sm">{getSupplierName(partialDetailsPayable?.supplierId || "")}</TableCell>
                          <TableCell className="text-sm">{getPaymentMethodLabel(pm.paymentMethod)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPartialDetailsOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Installment details dialog */}
      <Dialog open={installmentDetailsOpen} onOpenChange={setInstallmentDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" /> Detalhes das Parcelas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">Todas as parcelas</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getInstallmentGroupItems(installmentDetailsGroupId).map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm font-medium">{p.installmentNumber}/{p.installmentTotal}</TableCell>
                      <TableCell className="text-sm">{formatDateBR(p.dueDate)}</TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(p.amount)}</TableCell>
                      <TableCell>{statusBadge(p.status === "pendente" && isOverdue(p.dueDate) ? "vencido" : p.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInstallmentDetailsOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as paid dialog */}
      <Dialog open={markPaidDialogOpen} onOpenChange={setMarkPaidDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" /> Marcar como Pago
            </DialogTitle>
            <DialogDescription>Informe os detalhes do pagamento realizado.</DialogDescription>
          </DialogHeader>
          {markPaidTarget && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p className="font-medium">{markPaidTarget.description}</p>
                <p className="text-xs text-muted-foreground">Vencimento: {formatDateBR(markPaidTarget.dueDate)}</p>
              </div>
              <div>
                <Label>Valor Original (R$)</Label>
                <CurrencyInput value={markPaidForm.amount} onValueChange={v => setMarkPaidForm(f => ({ ...f, amount: v }))} />
              </div>
              
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => setShowExtraFields(!showExtraFields)}
                className="w-full"
              >
                {showExtraFields ? "- Ocultar" : "+ Adicionar"} Descontos/Juros/Multas
              </Button>

              {showExtraFields && (
                <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                  <div>
                    <Label>Desconto (R$)</Label>
                    <CurrencyInput 
                      value={markPaidForm.discount} 
                      onValueChange={v => setMarkPaidForm(f => ({ ...f, discount: v }))} 
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <Label>Juros (R$)</Label>
                    <CurrencyInput 
                      value={markPaidForm.interest} 
                      onValueChange={v => setMarkPaidForm(f => ({ ...f, interest: v }))} 
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <Label>Multa (R$)</Label>
                    <CurrencyInput 
                      value={markPaidForm.fine} 
                      onValueChange={v => setMarkPaidForm(f => ({ ...f, fine: v }))} 
                      placeholder="0,00"
                    />
                  </div>
                </div>
              )}

              {(() => {
                const original = parseFloat(markPaidForm.amount) / 100 || 0;
                const discount = parseFloat(markPaidForm.discount) / 100 || 0;
                const interest = parseFloat(markPaidForm.interest) / 100 || 0;
                const fine = parseFloat(markPaidForm.fine) / 100 || 0;
                const total = original - discount + interest + fine;
                
                if (discount > 0 || interest > 0 || fine > 0) {
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Valor original:</span>
                        <span className="font-medium">{formatCurrency(original)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Desconto:</span>
                          <span className="font-medium">- {formatCurrency(discount)}</span>
                        </div>
                      )}
                      {interest > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Juros:</span>
                          <span className="font-medium">+ {formatCurrency(interest)}</span>
                        </div>
                      )}
                      {fine > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Multa:</span>
                          <span className="font-medium">+ {formatCurrency(fine)}</span>
                        </div>
                      )}
                      <div className="border-t border-blue-300 pt-1 mt-1 flex justify-between text-base font-semibold">
                        <span>Valor Total a Pagar:</span>
                        <span className="text-blue-700">{formatCurrency(total)}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div>
                <Label>Data do Pagamento</Label>
                <Input type="date" value={markPaidForm.date} onChange={e => setMarkPaidForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <Label>Banco</Label>
                <Select value={markPaidForm.bankId} onValueChange={v => setMarkPaidForm(f => ({ ...f, bankId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{banks.map(b => <SelectItem key={b.id} value={b.id}>{b.accountName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={markPaidForm.paymentMethod} onValueChange={v => setMarkPaidForm(f => ({ ...f, paymentMethod: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkPaidDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={confirmMarkPaid}
              disabled={!markPaidForm.date || !markPaidForm.bankId || !markPaidForm.paymentMethod || !markPaidForm.amount}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete installment dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar parcela</AlertDialogTitle>
            <AlertDialogDescription>
              Esta conta faz parte de um parcelamento ({deleteTarget?.installmentNumber}/{deleteTarget?.installmentTotal}).
              Deseja apagar apenas esta parcela ou todas as parcelas deste grupo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteSingle} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Apagar só esta
            </AlertDialogAction>
            <AlertDialogAction onClick={deleteAllInstallments} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Apagar todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Insufficient balance dialog */}
      <AlertDialog open={insufficientBalanceOpen} onOpenChange={setInsufficientBalanceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Saldo Insuficiente</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {insufficientBalanceMsg}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setInsufficientBalanceOpen(false)}>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
