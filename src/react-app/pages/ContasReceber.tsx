import { useState } from "react";
import { CurrencyInput } from "@/react-app/components/CurrencyInput";
import { useFinanceData } from "@/react-app/hooks/use-finance-data";
import { Receivable, Receipt, CATEGORY_GROUPS } from "@/react-app/lib/finance-types";
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
import { Plus, Pencil, Trash2, CheckCircle, Copy, ArrowUp, Search, DollarSign, ChevronDown, ChevronRight, SplitSquareHorizontal, Eye } from "lucide-react";

export default function ContasReceberPage() {
  const {
    banks, categories, receivables, setReceivables, receipts, setReceipts,
    getBankName, getCategoryName, activeCompanyId, suppliersClients,
  } = useFinanceData();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Receivable | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterBank, setFilterBank] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("contas");

  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(2);
  const [installmentRows, setInstallmentRows] = useState<{ date: string; amount: number }[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<Receivable | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Selection for grouped receipt
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptForm, setReceiptForm] = useState({ date: todayStr(), bankId: "", description: "" });

  // Expanded receipt in lançamentos
  const [expandedReceiptId, setExpandedReceiptId] = useState<string | null>(null);

  // Partial receipt state
  const [partialRecOpen, setPartialRecOpen] = useState(false);
  const [partialRecTarget, setPartialRecTarget] = useState<Receivable | null>(null);
  const [partialRecForm, setPartialRecForm] = useState({ amount: "", date: todayStr(), bankId: "" });

  // View partial details
  const [partialDetailsOpen, setPartialDetailsOpen] = useState(false);
  const [partialDetailsGroupId, setPartialDetailsGroupId] = useState("");

  const revenueCategories = categories.filter(c => c.type === "receita");
  const clients = suppliersClients.filter(sc => sc.contactTypes.includes("cliente"));

  const getClientName = (clientId: string): string => {
    if (!clientId) return "—";
    const client = suppliersClients.find(s => s.id === clientId);
    return client ? client.name : "—";
  };

  const [form, setForm] = useState({ description: "", amount: "", receiptDate: "", bankId: "", categoryId: "", clientId: "" });
  const resetForm = () => {
    setForm({ description: "", amount: "", receiptDate: "", bankId: "", categoryId: "", clientId: "" });
    setIsInstallment(false);
    setInstallmentRows([]);
    setInstallmentCount(2);
  };

  const openNew = () => { resetForm(); setEditing(null); setOpen(true); };
  const openEdit = (r: Receivable) => {
    setForm({ description: r.description, amount: String(r.amount * 100), receiptDate: r.receiptDate, bankId: r.bankId, categoryId: r.categoryId, clientId: r.clientId || "" });
    setEditing(r);
    setIsInstallment(false);
    setInstallmentRows([]);
    setOpen(true);
  };

  const generateInstallments = () => {
    const total = parseFloat(form.amount) / 100 || 0;
    if (total <= 0 || !form.receiptDate || installmentCount < 2) return;
    const perInstallment = Math.floor((total / installmentCount) * 100) / 100;
    const remainder = Math.round((total - perInstallment * (installmentCount - 1)) * 100) / 100;
    const rows = [];
    for (let i = 0; i < installmentCount; i++) {
      rows.push({
        date: addMonths(form.receiptDate, i),
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
    if (!form.description || !form.amount || !form.receiptDate || !form.bankId || !form.categoryId) return;

    if (isInstallment && installmentRows.length >= 2 && installmentValid) {
      const groupId = generateId();
      const entries: Receivable[] = installmentRows.map((row, i) => ({
        id: generateId(),
        companyId: activeCompanyId,
        description: form.description,
        amount: row.amount,
        receiptDate: row.date,
        bankId: form.bankId,
        categoryId: form.categoryId,
        clientId: form.clientId || undefined,
        status: "pendente" as const,
        installmentGroupId: groupId,
        installmentNumber: i + 1,
        installmentTotal: installmentRows.length,
      }));
      setReceivables(prev => [...prev, ...entries]);
    } else {
      const entry: Receivable = {
        id: editing?.id || generateId(),
        companyId: editing?.companyId || activeCompanyId,
        description: form.description,
        amount: parseFloat(form.amount) / 100,
        receiptDate: form.receiptDate,
        bankId: form.bankId,
        categoryId: form.categoryId,
        clientId: form.clientId || undefined,
        status: editing?.status || "pendente",
        installmentGroupId: editing?.installmentGroupId,
        installmentNumber: editing?.installmentNumber,
        installmentTotal: editing?.installmentTotal,
      };
      if (editing) {
        setReceivables(prev => prev.map(r => r.id === editing.id ? entry : r));
      } else {
        setReceivables(prev => [...prev, entry]);
      }
    }
    setOpen(false);
    resetForm();
  };

  const handleDeleteClick = (r: Receivable) => {
    if (r.installmentGroupId) {
      setDeleteTarget(r);
      setShowDeleteDialog(true);
    } else {
      setReceivables(prev => prev.filter(x => x.id !== r.id));
    }
  };

  const deleteSingle = () => {
    if (deleteTarget) {
      setReceivables(prev => prev.filter(x => x.id !== deleteTarget.id));
      setShowDeleteDialog(false);
      setDeleteTarget(null);
    }
  };

  const deleteAllInstallments = () => {
    if (deleteTarget?.installmentGroupId) {
      setReceivables(prev => prev.filter(x => x.installmentGroupId !== deleteTarget.installmentGroupId));
      setShowDeleteDialog(false);
      setDeleteTarget(null);
    }
  };

  const markReceived = (id: string) => {
    const r = receivables.find(x => x.id === id);
    if (!r) return;
    const receipt: Receipt = {
      id: generateId(),
      companyId: activeCompanyId,
      date: todayStr(),
      bankId: r.bankId,
      amount: r.amount,
      receivableIds: [id],
      description: `Recebimento: ${r.description}`,
    };
    setReceipts(prev => [...prev, receipt]);
    setReceivables(prev => prev.map(x => x.id === id ? { ...x, status: "recebido" as const } : x));
  };

  const handleDuplicate = (r: Receivable) => {
    setForm({
      description: r.description,
      amount: String(r.amount * 100),
      receiptDate: r.receiptDate,
      bankId: r.bankId,
      categoryId: r.categoryId,
      clientId: r.clientId || "",
    });
    setEditing(null);
    setIsInstallment(false);
    setInstallmentRows([]);
    setOpen(true);
  };

  // --- Partial Receipt ---
  const openPartialRec = (r: Receivable) => {
    setPartialRecTarget(r);
    setPartialRecForm({ amount: "", date: todayStr(), bankId: r.bankId });
    setPartialRecOpen(true);
  };

  const handlePartialRec = () => {
    if (!partialRecTarget) return;
    const recAmount = parseFloat(partialRecForm.amount) / 100 || 0;
    if (recAmount <= 0 || recAmount >= partialRecTarget.amount) return;
    if (!partialRecForm.date || !partialRecForm.bankId) return;

    const groupId = partialRecTarget.partialGroupId || generateId();

    // Find existing items in this partial group
    const existingInGroup = receivables.filter(r => r.partialGroupId === groupId && r.id !== partialRecTarget.id);
    const receivedCount = existingInGroup.filter(r => r.status === "recebido").length;
    const newTotal = receivedCount + 2;

    // Create received entry
    const receivedEntry: Receivable = {
      ...partialRecTarget,
      id: generateId(),
      amount: recAmount,
      status: "recebido" as const,
      partialGroupId: groupId,
      partialNumber: receivedCount + 1,
      partialTotal: newTotal,
    };

    const remainingAmount = Math.round((partialRecTarget.amount - recAmount) * 100) / 100;

    // Create receipt record
    const receipt: Receipt = {
      id: generateId(),
      companyId: activeCompanyId,
      date: partialRecForm.date,
      bankId: partialRecForm.bankId,
      amount: recAmount,
      receivableIds: [receivedEntry.id],
      description: `Recebimento parcial: ${partialRecTarget.description}`,
    };

    setReceivables(prev => {
      let updated = prev.map(r => {
        if (r.id === partialRecTarget.id) {
          return {
            ...r,
            amount: remainingAmount,
            partialGroupId: groupId,
            partialNumber: receivedCount + 2,
            partialTotal: newTotal,
          };
        }
        if (r.partialGroupId === groupId) {
          return { ...r, partialTotal: newTotal };
        }
        return r;
      });
      updated.push(receivedEntry);
      return updated;
    });

    setReceipts(prev => [...prev, receipt]);
    setPartialRecOpen(false);
    setPartialRecTarget(null);
  };

  // View partial details
  const openPartialDetails = (groupId: string) => {
    setPartialDetailsGroupId(groupId);
    setPartialDetailsOpen(true);
  };

  const getPartialGroupItems = (groupId: string) => {
    return receivables
      .filter(r => r.partialGroupId === groupId)
      .sort((a, b) => (a.partialNumber || 0) - (b.partialNumber || 0));
  };

  const getPartialReceipts = (groupId: string) => {
    const groupItemIds = new Set(receivables.filter(r => r.partialGroupId === groupId).map(r => r.id));
    return receipts.filter(rc => rc.receivableIds.some(id => groupItemIds.has(id)));
  };

  const displayReceivables = receivables.map(r => {
    if (r.status === "pendente" && isOverdue(r.receiptDate)) return { ...r, status: "vencido" as const };
    return r;
  });

  const filtered = displayReceivables.filter(r => {
    // Na aba "contas", mostrar apenas contas pendentes/vencidas (não recebidas)
    if (activeTab === "contas" && r.status === "recebido") return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (filterBank !== "all" && r.bankId !== filterBank) return false;
    if (filterCategory !== "all" && r.categoryId !== filterCategory) return false;
    if (filterDateFrom && r.receiptDate < filterDateFrom) return false;
    if (filterDateTo && r.receiptDate > filterDateTo) return false;
    if (searchTerm && !r.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  }).sort((a, b) => a.receiptDate.localeCompare(b.receiptDate));

  const statusBadge = (status: string) => {
    switch (status) {
      case "recebido": return <Badge className="bg-green-600/10 text-green-600 border-green-600/20 hover:bg-green-600/20">Recebido</Badge>;
      case "vencido": return <Badge variant="destructive">Vencido</Badge>;
      default: return <Badge variant="outline">Pendente</Badge>;
    }
  };

  const getGroupInfo = (r: Receivable) => {
    if (!r.installmentGroupId) return null;
    const group = receivables.filter(x => x.installmentGroupId === r.installmentGroupId);
    return { total: group.length, totalValue: group.reduce((s, x) => s + x.amount, 0) };
  };

  // --- Selection logic ---
  const pendingFiltered = filtered.filter(r => r.status !== "recebido");
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
      setSelectedIds(new Set(pendingFiltered.map(r => r.id)));
    }
  };

  const selectedReceivables = filtered.filter(r => selectedIds.has(r.id));
  const selectedTotal = selectedReceivables.reduce((s, r) => s + r.amount, 0);

  // --- Receipt logic ---
  const openReceiptDialog = () => {
    if (selectedIds.size === 0) return;
    const descs = [...new Set(selectedReceivables.map(r => r.description))];
    setReceiptForm({
      date: todayStr(),
      bankId: selectedReceivables[0]?.bankId || "",
      description: `Recebimento: ${descs.join(", ")}`,
    });
    setReceiptDialogOpen(true);
  };

  const handleReceipt = () => {
    if (!receiptForm.date || !receiptForm.bankId) return;
    const ids = Array.from(selectedIds);
    const receipt: Receipt = {
      id: generateId(),
      companyId: activeCompanyId,
      date: receiptForm.date,
      bankId: receiptForm.bankId,
      amount: selectedTotal,
      receivableIds: ids,
      description: receiptForm.description,
    };
    setReceipts(prev => [...prev, receipt]);
    setReceivables(prev => prev.map(r => ids.includes(r.id) ? { ...r, status: "recebido" as const } : r));
    setSelectedIds(new Set());
    setReceiptDialogOpen(false);
  };

  const handleDeleteReceipt = (receipt: Receipt) => {
    setReceivables(prev => prev.map(r => receipt.receivableIds.includes(r.id) ? { ...r, status: "pendente" as const } : r));
    setReceipts(prev => prev.filter(rc => rc.id !== receipt.id));
  };

  const companyReceipts = receipts.sort((a, b) => b.date.localeCompare(a.date));

  const getDescriptionLabel = (r: Receivable) => {
    let label = r.description;
    if (r.installmentNumber) {
      label += ` (${r.installmentNumber}/${r.installmentTotal})`;
    }
    if (r.partialNumber) {
      label += ` [Parcial ${r.partialNumber}/${r.partialTotal}]`;
    }
    return label;
  };

  return (
    <div className="p-4 lg:p-6 bg-[#fafafa] min-h-screen space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Contas a Receber</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus recebimentos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-[#001429] hover:bg-[#001429]/90"><Plus className="h-4 w-4 mr-1" />Novo recebimento</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Editar Recebimento" : "Novo Recebimento"}</DialogTitle></DialogHeader>

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
              <div><Label>Descrição / Cliente</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div><Label>Valor total (R$)</Label><CurrencyInput value={form.amount} onValueChange={v => setForm(f => ({ ...f, amount: v }))} /></div>
              <div><Label>Data prevista</Label><Input type="date" value={form.receiptDate} onChange={e => setForm(f => ({ ...f, receiptDate: e.target.value }))} /></div>
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
                      const groupCats = revenueCategories.filter(c => c.groupId === g.id);
                      if (groupCats.length === 0) return null;
                      return (
                        <div key={g.id}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">{g.name}</div>
                          {groupCats.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              <div className="flex items-center gap-1.5">
                                <ArrowUp className="h-3 w-3 text-green-600 shrink-0" />
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
                <Label>Cliente (opcional)</Label>
                <Select value={form.clientId || "none"} onValueChange={v => setForm(f => ({ ...f, clientId: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
                          type="number" min={2} max={48}
                          value={installmentCount}
                          onChange={e => setInstallmentCount(Math.max(2, parseInt(e.target.value) || 2))}
                          className="w-20"
                        />
                        <Button type="button" size="sm" variant="outline" onClick={generateInstallments}>Gerar</Button>
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
            {companyReceipts.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{companyReceipts.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* === CONTAS TAB === */}
        <TabsContent value="contas" className="space-y-4">
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
                  <SelectItem value="recebido">Recebido</SelectItem>
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
                    const groupCats = revenueCategories.filter(c => c.groupId === g.id);
                    if (groupCats.length === 0) return null;
                    return (
                      <div key={g.id}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">{g.name}</div>
                        {groupCats.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            <div className="flex items-center gap-1.5">
                              <ArrowUp className="h-3 w-3 text-green-600 shrink-0" />
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
                <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-[140px]" />
                <span className="text-muted-foreground text-sm">até</span>
                <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-[140px]" />
              </div>
            </div>
          </div>

          {/* Selection bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
              <span className="text-sm font-medium">
                {selectedIds.size} selecionada{selectedIds.size > 1 ? "s" : ""} — Total: {formatCurrency(selectedTotal)}
              </span>
              <Button size="sm" onClick={openReceiptDialog} className="gap-1.5 bg-[#001429] hover:bg-[#001429]/90">
                <DollarSign className="h-4 w-4" />
                Receber selecionadas
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Limpar</Button>
            </div>
          )}

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
                    <TableHead className="hidden sm:table-cell">Data prevista</TableHead>
                    <TableHead className="hidden md:table-cell">Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum recebimento cadastrado</TableCell></TableRow>
                  ) : filtered.map(r => (
                    <TableRow key={r.id} className={r.status === "vencido" ? "bg-red-600/5" : ""}>
                      <TableCell>
                        {r.status !== "recebido" ? (
                          <Checkbox
                            checked={selectedIds.has(r.id)}
                            onCheckedChange={() => toggleSelect(r.id)}
                            aria-label={`Selecionar ${r.description}`}
                          />
                        ) : (
                          <span className="block w-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1">
                          <span>{getDescriptionLabel(r)}</span>
                          {r.partialGroupId && (
                            <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => openPartialDetails(r.partialGroupId!)} title="Ver detalhes parciais">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(r.amount)}</TableCell>
                      <TableCell className="hidden sm:table-cell">{formatDateBR(r.receiptDate)}</TableCell>
                      <TableCell className="hidden md:table-cell">{getClientName(r.clientId || "")}</TableCell>
                      <TableCell className="hidden md:table-cell">{getCategoryName(r.categoryId)}</TableCell>
                      <TableCell>{statusBadge(r.status === "pendente" && isOverdue(r.receiptDate) ? "vencido" : r.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {r.status !== "recebido" && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={() => markReceived(r.id)} title="Marcar como recebido">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openPartialRec(r)} title="Recebimento parcial">
                                <SplitSquareHorizontal className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(r)} title="Duplicar">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteClick(r)}><Trash2 className="h-4 w-4" /></Button>
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
                    <TableHead>Data Receb.</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="hidden sm:table-cell">Conta Bancária</TableHead>
                    <TableHead className="hidden md:table-cell">Recebimentos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyReceipts.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum recebimento registrado</TableCell></TableRow>
                  ) : companyReceipts.map(rc => {
                    const isExpanded = expandedReceiptId === rc.id;
                    const linkedReceivables = receivables.filter(r => rc.receivableIds.includes(r.id));
                    return (
                      <>
                        <TableRow key={rc.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedReceiptId(isExpanded ? null : rc.id)}>
                          <TableCell>
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </TableCell>
                          <TableCell className="font-medium">{rc.description}</TableCell>
                          <TableCell>{formatDateBR(rc.date)}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(rc.amount)}</TableCell>
                          <TableCell className="hidden sm:table-cell">{getBankName(rc.bankId)}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="secondary">{rc.receivableIds.length} conta{rc.receivableIds.length > 1 ? "s" : ""}</Badge>
                          </TableCell>
                          <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteReceipt(rc)} title="Estornar recebimento">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isExpanded && linkedReceivables.map(lr => (
                          <TableRow key={`${rc.id}-${lr.id}`} className="bg-muted/30">
                            <TableCell />
                            <TableCell className="text-sm pl-8">
                              {getDescriptionLabel(lr)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{formatDateBR(lr.receiptDate)}</TableCell>
                            <TableCell className="text-sm">{formatCurrency(lr.amount)}</TableCell>
                            <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{getClientName(lr.clientId || "")}</TableCell>
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

      {/* Receipt dialog */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar Recebimento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium">{selectedReceivables.length} conta{selectedReceivables.length > 1 ? "s" : ""} selecionada{selectedReceivables.length > 1 ? "s" : ""}</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedReceivables.map(r => (
                  <div key={r.id} className="flex justify-between text-sm">
                    <span className="truncate">{getDescriptionLabel(r)}</span>
                    <span className="shrink-0 ml-2">{formatCurrency(r.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(selectedTotal)}</span>
              </div>
            </div>

            <div><Label>Descrição</Label><Input value={receiptForm.description} onChange={e => setReceiptForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><Label>Data do Recebimento</Label><Input type="date" value={receiptForm.date} onChange={e => setReceiptForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div>
              <Label>Banco</Label>
              <Select value={receiptForm.bankId} onValueChange={v => setReceiptForm(f => ({ ...f, bankId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{banks.map(b => <SelectItem key={b.id} value={b.id}>{b.accountName}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <Button className="w-full bg-[#001429] hover:bg-[#001429]/90" onClick={handleReceipt} disabled={!receiptForm.date || !receiptForm.bankId}>
              <DollarSign className="h-4 w-4 mr-1" />
              Confirmar Recebimento — {formatCurrency(selectedTotal)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Partial receipt dialog */}
      <Dialog open={partialRecOpen} onOpenChange={setPartialRecOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SplitSquareHorizontal className="h-5 w-5" /> Recebimento Parcial
            </DialogTitle>
            <DialogDescription>Receba parte do valor e o restante continuará como pendente.</DialogDescription>
          </DialogHeader>
          {partialRecTarget && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p className="font-medium">{partialRecTarget.description}</p>
                <p className="text-lg font-bold">{formatCurrency(partialRecTarget.amount)}</p>
                <p className="text-xs text-muted-foreground">Valor total pendente</p>
              </div>
              <div>
                <Label>Valor a receber agora (R$)</Label>
                <CurrencyInput value={partialRecForm.amount} onValueChange={v => setPartialRecForm(f => ({ ...f, amount: v }))} />
                {(() => {
                  const val = parseFloat(partialRecForm.amount) / 100 || 0;
                  const remaining = partialRecTarget.amount - val;
                  if (val > 0 && val < partialRecTarget.amount) {
                    return <p className="text-xs text-muted-foreground mt-1">Restante: {formatCurrency(remaining)}</p>;
                  }
                  return null;
                })()}
              </div>
              <div>
                <Label>Data do Recebimento</Label>
                <Input type="date" value={partialRecForm.date} onChange={e => setPartialRecForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <Label>Banco</Label>
                <Select value={partialRecForm.bankId} onValueChange={v => setPartialRecForm(f => ({ ...f, bankId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{banks.map(b => <SelectItem key={b.id} value={b.id}>{b.accountName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPartialRecOpen(false)}>Cancelar</Button>
            <Button
              onClick={handlePartialRec}
              disabled={!partialRecForm.amount || !partialRecForm.date || !partialRecForm.bankId ||
                (parseFloat(partialRecForm.amount) / 100 || 0) <= 0 || (parseFloat(partialRecForm.amount) / 100 || 0) >= (partialRecTarget?.amount || 0)}
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
              <Eye className="h-5 w-5" /> Detalhes do Recebimento Parcial
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
                  {getPartialGroupItems(partialDetailsGroupId).map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm">{r.partialNumber}/{r.partialTotal}</TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(r.amount)}</TableCell>
                      <TableCell>{statusBadge(r.status === "pendente" && isOverdue(r.receiptDate) ? "vencido" : r.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {(() => {
              const partialRecs = getPartialReceipts(partialDetailsGroupId);
              if (partialRecs.length === 0) return null;
              return (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">Recebimentos efetuados</div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Banco</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {partialRecs.map(rc => (
                        <TableRow key={rc.id}>
                          <TableCell className="text-sm">{formatDateBR(rc.date)}</TableCell>
                          <TableCell className="text-sm font-medium">{formatCurrency(rc.amount)}</TableCell>
                          <TableCell className="text-sm">{getBankName(rc.bankId)}</TableCell>
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
    </div>
  );
}
