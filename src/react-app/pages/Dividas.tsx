import { useState } from "react";
import { useFinanceData } from "@/react-app/hooks/use-finance-data";
import { Payable, Receivable, Payment, Receipt, PAYMENT_METHODS, NegotiationOrigin } from "@/react-app/lib/finance-types";
import { formatCurrency, formatDateBR, generateId, isOverdue, todayStr, addMonths } from "@/react-app/lib/finance-utils";
import { Card, CardContent } from "@/react-app/components/ui/card";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Badge } from "@/react-app/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/react-app/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/react-app/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/react-app/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/react-app/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/react-app/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/react-app/components/ui/radio-group";
import { Checkbox } from "@/react-app/components/ui/checkbox";
import { Pencil, DollarSign, AlertTriangle, Handshake, Eye } from "lucide-react";

export default function DividasPage() {
  const {
    banks, payables, setPayables, receivables, setReceivables,
    setPayments, setReceipts,
    getBankName, getBankBalance,
    activeCompanyId,
  } = useFinanceData();

  const [activeTab, setActiveTab] = useState("pagar");

  // Selection
  const [selectedPayableIds, setSelectedPayableIds] = useState<Set<string>>(new Set());
  const [selectedReceivableIds, setSelectedReceivableIds] = useState<Set<string>>(new Set());

  // Edit date dialog
  const [editDateOpen, setEditDateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{ id: string; type: "pagar" | "receber" } | null>(null);
  const [newDueDate, setNewDueDate] = useState("");

  // Pay dialog
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<Payable | null>(null);
  const [payForm, setPayForm] = useState({ date: todayStr(), bankId: "", paymentMethod: "" });

  // Receive dialog
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState<Receivable | null>(null);
  const [receiveForm, setReceiveForm] = useState({ date: todayStr(), bankId: "" });

  // Insufficient balance
  const [insufficientOpen, setInsufficientOpen] = useState(false);
  const [insufficientMsg, setInsufficientMsg] = useState("");

  // Negotiation dialog
  const [negotiateOpen, setNegotiateOpen] = useState(false);
  const [negotiateType, setNegotiateType] = useState<"pagar" | "receber">("pagar");
  const [negoMode, setNegoMode] = useState<"avista" | "parcelado">("avista");
  const [negoAdjustType, setNegoAdjustType] = useState<"desconto" | "juros" | "nenhum">("nenhum");
  const [negoAdjustPercent, setNegoAdjustPercent] = useState(0);
  const [negoInstallments, setNegoInstallments] = useState(2);
  const [negoDueDate, setNegoDueDate] = useState(todayStr());
  const [negoBankId, setNegoBankId] = useState("");
  const [negoPaymentMethod, setNegoPaymentMethod] = useState("");
  const [negoCategoryId, setNegoCategoryId] = useState("");

  // View origins dialog
  const [viewOriginsOpen, setViewOriginsOpen] = useState(false);
  const [viewOriginsData, setViewOriginsData] = useState<NegotiationOrigin[]>([]);
  const [viewOriginsTitle, setViewOriginsTitle] = useState("");

  // Overdue items
  const overduePayables = payables
    .filter(p => p.status === "pendente" && isOverdue(p.dueDate))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const overdueReceivables = receivables
    .filter(r => r.status === "pendente" && isOverdue(r.receiptDate))
    .sort((a, b) => a.receiptDate.localeCompare(b.receiptDate));

  const totalOverduePayables = overduePayables.reduce((s, p) => s + p.amount, 0);
  const totalOverdueReceivables = overdueReceivables.reduce((s, r) => s + r.amount, 0);

  // --- Selection helpers ---
  const togglePayableSelection = (id: string) => {
    setSelectedPayableIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllPayables = () => {
    if (selectedPayableIds.size === overduePayables.length) {
      setSelectedPayableIds(new Set());
    } else {
      setSelectedPayableIds(new Set(overduePayables.map(p => p.id)));
    }
  };

  const toggleReceivableSelection = (id: string) => {
    setSelectedReceivableIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllReceivables = () => {
    if (selectedReceivableIds.size === overdueReceivables.length) {
      setSelectedReceivableIds(new Set());
    } else {
      setSelectedReceivableIds(new Set(overdueReceivables.map(r => r.id)));
    }
  };

  // --- Edit due date ---
  const openEditDate = (id: string, type: "pagar" | "receber", currentDate: string) => {
    setEditTarget({ id, type });
    setNewDueDate(currentDate);
    setEditDateOpen(true);
  };

  const saveNewDate = () => {
    if (!editTarget || !newDueDate) return;
    if (editTarget.type === "pagar") {
      setPayables(prev => prev.map(p => p.id === editTarget.id ? { ...p, dueDate: newDueDate } : p));
    } else {
      setReceivables(prev => prev.map(r => r.id === editTarget.id ? { ...r, receiptDate: newDueDate } : r));
    }
    setEditDateOpen(false);
    setEditTarget(null);
  };

  // --- Pay overdue payable ---
  const openPayDialog = (p: Payable) => {
    setPayTarget(p);
    setPayForm({ date: todayStr(), bankId: p.bankId, paymentMethod: p.paymentMethod });
    setPayDialogOpen(true);
  };

  const handlePay = () => {
    if (!payTarget || !payForm.date || !payForm.bankId || !payForm.paymentMethod) return;

    const balance = getBankBalance(payForm.bankId);
    const bank = banks.find(b => b.id === payForm.bankId);
    const overdraft = bank?.overdraftLimit || 0;
    const available = balance + overdraft;

    if (payTarget.amount > available) {
      setInsufficientMsg(
        `Saldo insuficiente na conta "${bank?.accountName || "—"}".\n\nSaldo disponível: ${formatCurrency(balance)}\nLimite cheque especial: ${formatCurrency(overdraft)}\nTotal disponível: ${formatCurrency(available)}\nValor necessário: ${formatCurrency(payTarget.amount)}`
      );
      setInsufficientOpen(true);
      return;
    }

    const payment: Payment = {
      id: generateId(),
      companyId: activeCompanyId,
      date: payForm.date,
      bankId: payForm.bankId,
      paymentMethod: payForm.paymentMethod,
      amount: payTarget.amount,
      payableIds: [payTarget.id],
      description: `Pgto dívida: ${payTarget.description}`,
    };
    setPayments(prev => [...prev, payment]);
    setPayables(prev => prev.map(p => p.id === payTarget.id ? { ...p, status: "pago" as const } : p));
    setPayDialogOpen(false);
    setPayTarget(null);
  };

  // --- Receive overdue receivable ---
  const openReceiveDialog = (r: Receivable) => {
    setReceiveTarget(r);
    setReceiveForm({ date: todayStr(), bankId: r.bankId });
    setReceiveDialogOpen(true);
  };

  const handleReceive = () => {
    if (!receiveTarget || !receiveForm.date || !receiveForm.bankId) return;

    const receipt: Receipt = {
      id: generateId(),
      companyId: activeCompanyId,
      date: receiveForm.date,
      bankId: receiveForm.bankId,
      amount: receiveTarget.amount,
      receivableIds: [receiveTarget.id],
      description: `Recebimento dívida: ${receiveTarget.description}`,
    };
    setReceipts(prev => [...prev, receipt]);
    setReceivables(prev => prev.map(r => r.id === receiveTarget.id ? { ...r, status: "recebido" as const } : r));
    setReceiveDialogOpen(false);
    setReceiveTarget(null);
  };

  const daysOverdue = (dateStr: string) => {
    const today = new Date(todayStr() + "T12:00:00");
    const due = new Date(dateStr + "T12:00:00");
    return Math.max(0, Math.round((today.getTime() - due.getTime()) / 86400000));
  };

  // --- Negotiation ---
  const openNegotiation = (type: "pagar" | "receber") => {
    setNegotiateType(type);
    setNegoMode("avista");
    setNegoAdjustType("nenhum");
    setNegoAdjustPercent(0);
    setNegoInstallments(2);
    setNegoDueDate(todayStr());
    setNegoBankId(banks.length > 0 ? banks[0].id : "");
    setNegoPaymentMethod("pix");
    setNegoCategoryId("");
    setNegotiateOpen(true);
  };

  const getSelectedPayables = () => overduePayables.filter(p => selectedPayableIds.has(p.id));
  const getSelectedReceivables = () => overdueReceivables.filter(r => selectedReceivableIds.has(r.id));

  const getNegoTotal = () => {
    const items = negotiateType === "pagar" ? getSelectedPayables() : getSelectedReceivables();
    const rawTotal = items.reduce((s, i) => s + i.amount, 0);
    if (negoAdjustType === "desconto") return rawTotal * (1 - negoAdjustPercent / 100);
    if (negoAdjustType === "juros") return rawTotal * (1 + negoAdjustPercent / 100);
    return rawTotal;
  };

  const handleNegotiate = () => {
    const finalTotal = getNegoTotal();
    if (finalTotal <= 0) return;

    if (negotiateType === "pagar") {
      const selected = getSelectedPayables();
      if (selected.length === 0) return;

      const origins: NegotiationOrigin[] = selected.map(p => ({
        description: p.description,
        amount: p.amount,
        dueDate: p.dueDate,
      }));

      const firstCategoryId = negoCategoryId || selected[0].categoryId;

      // Remove old payables
      const selectedIds = new Set(selected.map(p => p.id));

      if (negoMode === "avista") {
        const newPayable: Payable = {
          id: generateId(),
          companyId: activeCompanyId,
          description: `Negociação: ${selected.length} dívidas`,
          amount: finalTotal,
          dueDate: negoDueDate,
          bankId: negoBankId,
          categoryId: firstCategoryId,
          paymentMethod: negoPaymentMethod,
          status: "pendente",
          negotiationOrigins: origins,
        };
        setPayables(prev => [...prev.filter(p => !selectedIds.has(p.id)), newPayable]);
      } else {
        const installmentAmount = Math.round((finalTotal / negoInstallments) * 100) / 100;
        const groupId = generateId();
        const newPayables: Payable[] = [];
        for (let i = 0; i < negoInstallments; i++) {
          const isLast = i === negoInstallments - 1;
          const amount = isLast ? Math.round((finalTotal - installmentAmount * (negoInstallments - 1)) * 100) / 100 : installmentAmount;
          newPayables.push({
            id: generateId(),
            companyId: activeCompanyId,
            description: `Negociação: ${selected.length} dívidas`,
            amount,
            dueDate: addMonths(negoDueDate, i),
            bankId: negoBankId,
            categoryId: firstCategoryId,
            paymentMethod: negoPaymentMethod,
            status: "pendente",
            installmentGroupId: groupId,
            installmentNumber: i + 1,
            installmentTotal: negoInstallments,
            negotiationOrigins: i === 0 ? origins : undefined,
          });
        }
        setPayables(prev => [...prev.filter(p => !selectedIds.has(p.id)), ...newPayables]);
      }

      setSelectedPayableIds(new Set());
    } else {
      const selected = getSelectedReceivables();
      if (selected.length === 0) return;

      const selectedIds = new Set(selected.map(r => r.id));

      // For receivables, create a single new receivable (no negotiationOrigins on Receivable type, but we reuse description)
      if (negoMode === "avista") {
        const newReceivable: Receivable = {
          id: generateId(),
          companyId: activeCompanyId,
          description: `Negociação: ${selected.length} dívidas`,
          amount: finalTotal,
          receiptDate: negoDueDate,
          bankId: negoBankId,
          categoryId: negoCategoryId || selected[0].categoryId,
          status: "pendente",
        };
        setReceivables(prev => [...prev.filter(r => !selectedIds.has(r.id)), newReceivable]);
      } else {
        const installmentAmount = Math.round((finalTotal / negoInstallments) * 100) / 100;
        const groupId = generateId();
        const newReceivables: Receivable[] = [];
        for (let i = 0; i < negoInstallments; i++) {
          const isLast = i === negoInstallments - 1;
          const amount = isLast ? Math.round((finalTotal - installmentAmount * (negoInstallments - 1)) * 100) / 100 : installmentAmount;
          newReceivables.push({
            id: generateId(),
            companyId: activeCompanyId,
            description: `Negociação: ${selected.length} dívidas`,
            amount,
            receiptDate: addMonths(negoDueDate, i),
            bankId: negoBankId,
            categoryId: negoCategoryId || selected[0].categoryId,
            status: "pendente",
            installmentGroupId: groupId,
            installmentNumber: i + 1,
            installmentTotal: negoInstallments,
          });
        }
        setReceivables(prev => [...prev.filter(r => !selectedIds.has(r.id)), ...newReceivables]);
      }

      setSelectedReceivableIds(new Set());
    }

    setNegotiateOpen(false);
  };

  // View origins
  const openViewOrigins = (p: Payable) => {
    setViewOriginsData(p.negotiationOrigins || []);
    setViewOriginsTitle(p.description);
    setViewOriginsOpen(true);
  };

  const negoSelectedItems = negotiateType === "pagar" ? getSelectedPayables() : getSelectedReceivables();
  const negoRawTotal = negoSelectedItems.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="p-4 lg:p-6 bg-[#fafafa] min-h-screen space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          Dívidas
        </h1>
        <p className="text-sm text-muted-foreground">Contas vencidas a pagar e a receber</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-red-600/30 bg-red-600/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Total Vencido a Pagar</p>
            <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(totalOverduePayables)}</p>
            <p className="text-xs text-muted-foreground">{overduePayables.length} conta(s) vencida(s)</p>
          </CardContent>
        </Card>
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Total Vencido a Receber</p>
            <p className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1">{formatCurrency(totalOverdueReceivables)}</p>
            <p className="text-xs text-muted-foreground">{overdueReceivables.length} conta(s) vencida(s)</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pagar">A Pagar Vencidas ({overduePayables.length})</TabsTrigger>
          <TabsTrigger value="receber">A Receber Vencidas ({overdueReceivables.length})</TabsTrigger>
        </TabsList>

        {/* --- PAYABLES TAB --- */}
        <TabsContent value="pagar">
          {selectedPayableIds.size >= 2 && (
            <div className="mb-3 flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <Handshake className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{selectedPayableIds.size} contas selecionadas — Total: {formatCurrency(getSelectedPayables().reduce((s, p) => s + p.amount, 0))}</span>
              <Button size="sm" onClick={() => openNegotiation("pagar")} className="bg-[#001429] hover:bg-[#001429]/90">
                <Handshake className="h-3.5 w-3.5 mr-1" /> Negociar
              </Button>
            </div>
          )}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={overduePayables.length > 0 && selectedPayableIds.size === overduePayables.length}
                        onCheckedChange={toggleAllPayables}
                      />
                    </TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Dias Atraso</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overduePayables.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma conta a pagar vencida 🎉
                      </TableCell>
                    </TableRow>
                  ) : overduePayables.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPayableIds.has(p.id)}
                          onCheckedChange={() => togglePayableSelection(p.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1">
                          {p.description}
                          {p.installmentNumber && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({p.installmentNumber}/{p.installmentTotal})
                            </span>
                          )}
                          {p.negotiationOrigins && p.negotiationOrigins.length > 0 && (
                            <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => openViewOrigins(p)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDateBR(p.dueDate)}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{daysOverdue(p.dueDate)} dias</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(p.amount)}</TableCell>
                      <TableCell>{getBankName(p.bankId)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => openEditDate(p.id, "pagar", p.dueDate)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" />Nova Data
                          </Button>
                          <Button size="sm" onClick={() => openPayDialog(p)} className="bg-[#001429] hover:bg-[#001429]/90">
                            <DollarSign className="h-3.5 w-3.5 mr-1" />Pagar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {overduePayables.length > 0 && (
                <div className="p-3 border-t flex justify-end">
                  <span className="text-sm font-semibold">Total: {formatCurrency(totalOverduePayables)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- RECEIVABLES TAB --- */}
        <TabsContent value="receber">
          {selectedReceivableIds.size >= 2 && (
            <div className="mb-3 flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <Handshake className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{selectedReceivableIds.size} contas selecionadas — Total: {formatCurrency(getSelectedReceivables().reduce((s, r) => s + r.amount, 0))}</span>
              <Button size="sm" onClick={() => openNegotiation("receber")} className="bg-[#001429] hover:bg-[#001429]/90">
                <Handshake className="h-3.5 w-3.5 mr-1" /> Negociar
              </Button>
            </div>
          )}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={overdueReceivables.length > 0 && selectedReceivableIds.size === overdueReceivables.length}
                        onCheckedChange={toggleAllReceivables}
                      />
                    </TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Dias Atraso</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueReceivables.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhuma conta a receber vencida 🎉
                      </TableCell>
                    </TableRow>
                  ) : overdueReceivables.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedReceivableIds.has(r.id)}
                          onCheckedChange={() => toggleReceivableSelection(r.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {r.description}
                        {r.installmentNumber && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({r.installmentNumber}/{r.installmentTotal})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{formatDateBR(r.receiptDate)}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{daysOverdue(r.receiptDate)} dias</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(r.amount)}</TableCell>
                      <TableCell>{getBankName(r.bankId)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => openEditDate(r.id, "receber", r.receiptDate)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" />Nova Data
                          </Button>
                          <Button size="sm" onClick={() => openReceiveDialog(r)} className="bg-[#001429] hover:bg-[#001429]/90">
                            <DollarSign className="h-3.5 w-3.5 mr-1" />Receber
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {overdueReceivables.length > 0 && (
                <div className="p-3 border-t flex justify-end">
                  <span className="text-sm font-semibold">Total: {formatCurrency(totalOverdueReceivables)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit date dialog */}
      <Dialog open={editDateOpen} onOpenChange={setEditDateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Alterar Data de Vencimento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nova data de vencimento</Label>
              <Input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDateOpen(false)}>Cancelar</Button>
            <Button onClick={saveNewDate} className="bg-[#001429] hover:bg-[#001429]/90">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Pagar Conta Vencida</DialogTitle></DialogHeader>
          {payTarget && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p className="font-medium">{payTarget.description}</p>
                <p className="text-lg font-bold">{formatCurrency(payTarget.amount)}</p>
                <p className="text-xs text-muted-foreground">Vencida em {formatDateBR(payTarget.dueDate)}</p>
              </div>
              <div>
                <Label>Data do Pagamento</Label>
                <Input type="date" value={payForm.date} onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <Label>Banco</Label>
                <Select value={payForm.bankId} onValueChange={v => setPayForm(f => ({ ...f, bankId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{banks.map(b => <SelectItem key={b.id} value={b.id}>{b.accountName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={payForm.paymentMethod} onValueChange={v => setPayForm(f => ({ ...f, paymentMethod: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handlePay} className="bg-[#001429] hover:bg-[#001429]/90">Confirmar Pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive dialog */}
      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Receber Conta Vencida</DialogTitle></DialogHeader>
          {receiveTarget && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p className="font-medium">{receiveTarget.description}</p>
                <p className="text-lg font-bold">{formatCurrency(receiveTarget.amount)}</p>
                <p className="text-xs text-muted-foreground">Vencida em {formatDateBR(receiveTarget.receiptDate)}</p>
              </div>
              <div>
                <Label>Data do Recebimento</Label>
                <Input type="date" value={receiveForm.date} onChange={e => setReceiveForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <Label>Banco</Label>
                <Select value={receiveForm.bankId} onValueChange={v => setReceiveForm(f => ({ ...f, bankId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{banks.map(b => <SelectItem key={b.id} value={b.id}>{b.accountName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleReceive} className="bg-[#001429] hover:bg-[#001429]/90">Confirmar Recebimento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insufficient balance */}
      <AlertDialog open={insufficientOpen} onOpenChange={setInsufficientOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Saldo Insuficiente</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {insufficientMsg}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setInsufficientOpen(false)}>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Negotiation dialog */}
      <Dialog open={negotiateOpen} onOpenChange={setNegotiateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Handshake className="h-5 w-5" /> Negociação de Dívidas
            </DialogTitle>
            <DialogDescription>
              Agrupe {negoSelectedItems.length} contas vencidas em uma nova conta {negotiateType === "pagar" ? "a pagar" : "a receber"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* List of selected items */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">
                Contas selecionadas ({negoSelectedItems.length})
              </div>
              <div className="max-h-40 overflow-y-auto divide-y">
                {negoSelectedItems.map((item: any) => (
                  <div key={item.id} className="px-3 py-2 flex justify-between text-sm">
                    <span>{item.description}</span>
                    <div className="flex gap-3 text-muted-foreground">
                      <span>{formatDateBR(item.dueDate || item.receiptDate)}</span>
                      <span className="font-medium text-foreground">{formatCurrency(item.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-muted/50 px-3 py-2 flex justify-between text-sm font-semibold">
                <span>Subtotal</span>
                <span>{formatCurrency(negoRawTotal)}</span>
              </div>
            </div>

            {/* Mode */}
            <div>
              <Label className="mb-2 block">Modalidade</Label>
              <RadioGroup value={negoMode} onValueChange={(v: any) => setNegoMode(v)} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="avista" id="nego-avista" />
                  <Label htmlFor="nego-avista">À Vista</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="parcelado" id="nego-parcelado" />
                  <Label htmlFor="nego-parcelado">Parcelado</Label>
                </div>
              </RadioGroup>
            </div>

            {negoMode === "parcelado" && (
              <div>
                <Label>Quantidade de Parcelas</Label>
                <Input type="number" min={2} max={120} value={negoInstallments} onChange={e => setNegoInstallments(Math.max(2, parseInt(e.target.value) || 2))} />
              </div>
            )}

            {/* Adjustment */}
            <div>
              <Label className="mb-2 block">Ajuste</Label>
              <RadioGroup value={negoAdjustType} onValueChange={(v: any) => setNegoAdjustType(v)} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="nenhum" id="nego-nenhum" />
                  <Label htmlFor="nego-nenhum">Nenhum</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="desconto" id="nego-desconto" />
                  <Label htmlFor="nego-desconto">Desconto</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="juros" id="nego-juros" />
                  <Label htmlFor="nego-juros">Juros</Label>
                </div>
              </RadioGroup>
            </div>

            {negoAdjustType !== "nenhum" && (
              <div>
                <Label>{negoAdjustType === "desconto" ? "Desconto (%)" : "Juros (%)"}</Label>
                <Input type="number" min={0} max={100} step={0.1} value={negoAdjustPercent} onChange={e => setNegoAdjustPercent(parseFloat(e.target.value) || 0)} />
              </div>
            )}

            {/* Final total */}
            <div className="bg-primary/10 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Valor Final</span>
                <span className="text-lg font-bold">{formatCurrency(getNegoTotal())}</span>
              </div>
              {negoMode === "parcelado" && (
                <p className="text-xs text-muted-foreground mt-1">
                  {negoInstallments}x de {formatCurrency(getNegoTotal() / negoInstallments)}
                </p>
              )}
            </div>

            {/* Date, Bank, Payment Method */}
            <div>
              <Label>{negoMode === "avista" ? "Data de Vencimento" : "Data da 1ª Parcela"}</Label>
              <Input type="date" value={negoDueDate} onChange={e => setNegoDueDate(e.target.value)} />
            </div>
            <div>
              <Label>Banco</Label>
              <Select value={negoBankId} onValueChange={setNegoBankId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{banks.map(b => <SelectItem key={b.id} value={b.id}>{b.accountName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {negotiateType === "pagar" && (
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={negoPaymentMethod} onValueChange={setNegoPaymentMethod}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNegotiateOpen(false)}>Cancelar</Button>
            <Button onClick={handleNegotiate} className="bg-[#001429] hover:bg-[#001429]/90">
              <Handshake className="h-4 w-4 mr-1" /> Confirmar Negociação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View origins dialog */}
      <Dialog open={viewOriginsOpen} onOpenChange={setViewOriginsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" /> Contas Vinculadas
            </DialogTitle>
            <DialogDescription>{viewOriginsTitle}</DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewOriginsData.map((o, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{o.description}</TableCell>
                    <TableCell className="text-sm">{formatDateBR(o.dueDate)}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(o.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="bg-muted/50 px-3 py-2 flex justify-between text-sm font-semibold border-t">
              <span>Total Original</span>
              <span>{formatCurrency(viewOriginsData.reduce((s, o) => s + o.amount, 0))}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOriginsOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
