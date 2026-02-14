import { useState, useMemo } from "react";
import { Plus, Search, Eye, Pencil, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/react-app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";
import { Textarea } from "@/react-app/components/ui/textarea";
import { Checkbox } from "@/react-app/components/ui/checkbox";
import { useFinanceData } from "@/react-app/hooks/use-finance-data";
import { SupplierClient } from "@/react-app/lib/finance-types";
import { formatCurrency } from "@/react-app/lib/finance-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/react-app/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function ClientesFornecedores() {
  const { 
    suppliersClients, 
    addSupplierClient, 
    updateSupplierClient, 
    deleteSupplierClient,
    activeCompanyId,
    companyPayables,
    companyReceivables,
    payments,
    receipts,
    categories
  } = useFinanceData();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedSupplierClient, setSelectedSupplierClient] = useState<SupplierClient | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    documentType: "cnpj" as "cnpj" | "cpf",
    documentNumber: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    contactTypes: [] as ("fornecedor" | "cliente" | "socio" | "funcionario")[],
    notes: "",
  });

  const companySuppliers = useMemo(() => {
    return suppliersClients.filter(sc => sc.companyId === activeCompanyId);
  }, [suppliersClients, activeCompanyId]);

  const filteredSuppliers = useMemo(() => {
    return companySuppliers.filter(sc => {
      const matchesSearch = sc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sc.documentNumber && sc.documentNumber.includes(searchTerm));
      
      const matchesType = selectedType === "todos" || sc.contactTypes.includes(selectedType as any);
      
      return matchesSearch && matchesType;
    });
  }, [companySuppliers, searchTerm, selectedType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || formData.contactTypes.length === 0) return;

    const supplierClient: SupplierClient = {
      id: editingId || `sc-${Date.now()}`,
      companyId: activeCompanyId,
      name: formData.name,
      documentType: formData.documentType,
      documentNumber: formData.documentNumber || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      address: formData.address || undefined,
      city: formData.city || undefined,
      state: formData.state || undefined,
      postalCode: formData.postalCode || undefined,
      contactTypes: formData.contactTypes,
      notes: formData.notes || undefined,
    };

    if (editingId) {
      updateSupplierClient(supplierClient);
    } else {
      addSupplierClient(supplierClient);
    }

    handleCloseDialog();
  };

  const handleEdit = (sc: SupplierClient) => {
    setEditingId(sc.id);
    setFormData({
      name: sc.name,
      documentType: sc.documentType,
      documentNumber: sc.documentNumber || "",
      email: sc.email || "",
      phone: sc.phone || "",
      address: sc.address || "",
      city: sc.city || "",
      state: sc.state || "",
      postalCode: sc.postalCode || "",
      contactTypes: sc.contactTypes,
      notes: sc.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este cadastro?")) {
      deleteSupplierClient(id);
    }
  };

  const handleViewDetails = (sc: SupplierClient) => {
    setSelectedSupplierClient(sc);
    setDetailsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setFormData({
      name: "",
      documentType: "cnpj",
      documentNumber: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      contactTypes: [],
      notes: "",
    });
  };

  const toggleContactType = (type: "fornecedor" | "cliente" | "socio" | "funcionario") => {
    setFormData(prev => ({
      ...prev,
      contactTypes: prev.contactTypes.includes(type)
        ? prev.contactTypes.filter(t => t !== type)
        : [...prev.contactTypes, type]
    }));
  };

  // Get history and stats for selected supplier/client
  const getSupplierClientStats = (sc: SupplierClient) => {
    const isSupplier = sc.contactTypes.includes("fornecedor");
    const isClient = sc.contactTypes.includes("cliente");

    // Payables for this supplier
    const supplierPayables = isSupplier 
      ? companyPayables.filter(p => p.supplierId === sc.id)
      : [];
    
    const totalPayables = supplierPayables.reduce((sum, p) => sum + p.amount, 0);
    const paidPayables = supplierPayables.filter(p => p.status === "pago");
    const totalPaid = paidPayables.reduce((sum, p) => sum + p.amount, 0);
    const pendingPayables = supplierPayables.filter(p => p.status === "pendente");
    const totalPending = pendingPayables.reduce((sum, p) => sum + p.amount, 0);

    // Receivables for this client
    const clientReceivables = isClient
      ? companyReceivables.filter(r => r.clientId === sc.id)
      : [];
    
    const totalReceivables = clientReceivables.reduce((sum, r) => sum + r.amount, 0);
    const receivedItems = clientReceivables.filter(r => r.status === "recebido");
    const totalReceived = receivedItems.reduce((sum, r) => sum + r.amount, 0);
    const pendingReceivables = clientReceivables.filter(r => r.status === "pendente");
    const totalPendingReceivables = pendingReceivables.reduce((sum, r) => sum + r.amount, 0);

    // Generate chart data (last 30 days)
    const chartData = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayPayments = payments
        .filter(pay => pay.date === dateStr)
        .filter(pay => pay.payableIds.some(pid => supplierPayables.find(p => p.id === pid)))
        .reduce((sum, pay) => sum + pay.amount, 0);

      const dayReceipts = receipts
        .filter(rec => rec.date === dateStr)
        .filter(rec => rec.receivableIds.some(rid => clientReceivables.find(r => r.id === rid)))
        .reduce((sum, rec) => sum + rec.amount, 0);

      chartData.push({
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        pagamentos: dayPayments,
        recebimentos: dayReceipts,
      });
    }

    return {
      isSupplier,
      isClient,
      supplierPayables,
      totalPayables,
      totalPaid,
      totalPending,
      clientReceivables,
      totalReceivables,
      totalReceived,
      totalPendingReceivables,
      chartData,
    };
  };

  const getContactTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      fornecedor: "Fornecedor",
      cliente: "Cliente",
      socio: "Sócio",
      funcionario: "Funcionário",
    };
    return labels[type] || type;
  };

  const getContactTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      fornecedor: "bg-red-100 text-red-700",
      cliente: "bg-green-100 text-green-700",
      socio: "bg-blue-100 text-blue-700",
      funcionario: "bg-purple-100 text-purple-700",
    };
    return colors[type] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes e Fornecedores</h1>
          <p className="text-gray-500 mt-1">Gerencie seus contatos comerciais</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cadastro
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Nome ou documento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="type">Tipo</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="fornecedor">Fornecedores</SelectItem>
                  <SelectItem value="cliente">Clientes</SelectItem>
                  <SelectItem value="socio">Sócios</SelectItem>
                  <SelectItem value="funcionario">Funcionários</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      Nenhum cadastro encontrado
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((sc) => (
                    <tr key={sc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{sc.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sc.documentNumber ? (
                          <div>
                            <div className="text-xs text-gray-400 uppercase">{sc.documentType}</div>
                            <div>{sc.documentNumber}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {sc.contactTypes.map(type => (
                            <span
                              key={type}
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getContactTypeBadgeColor(type)}`}
                            >
                              {getContactTypeLabel(type)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {sc.email || sc.phone || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(sc)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(sc)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(sc.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Cadastro" : "Novo Cadastro"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="documentType">Tipo de Documento</Label>
                <Select
                  value={formData.documentType}
                  onValueChange={(value: "cnpj" | "cpf") =>
                    setFormData({ ...formData, documentType: value })
                  }
                >
                  <SelectTrigger id="documentType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cnpj">CNPJ (Empresa)</SelectItem>
                    <SelectItem value="cpf">CPF (Pessoa Física)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="documentNumber">Número do Documento</Label>
                <Input
                  id="documentNumber"
                  value={formData.documentNumber}
                  onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                  placeholder={formData.documentType === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"}
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Tipo de Contato *</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="type-fornecedor"
                    checked={formData.contactTypes.includes("fornecedor")}
                    onCheckedChange={() => toggleContactType("fornecedor")}
                  />
                  <Label htmlFor="type-fornecedor" className="font-normal cursor-pointer">
                    Fornecedor
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="type-cliente"
                    checked={formData.contactTypes.includes("cliente")}
                    onCheckedChange={() => toggleContactType("cliente")}
                  />
                  <Label htmlFor="type-cliente" className="font-normal cursor-pointer">
                    Cliente
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="type-socio"
                    checked={formData.contactTypes.includes("socio")}
                    onCheckedChange={() => toggleContactType("socio")}
                  />
                  <Label htmlFor="type-socio" className="font-normal cursor-pointer">
                    Sócio
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="type-funcionario"
                    checked={formData.contactTypes.includes("funcionario")}
                    onCheckedChange={() => toggleContactType("funcionario")}
                  />
                  <Label htmlFor="type-funcionario" className="font-normal cursor-pointer">
                    Funcionário
                  </Label>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="SP"
                  maxLength={2}
                />
              </div>
              <div>
                <Label htmlFor="postalCode">CEP</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="00000-000"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!formData.name || formData.contactTypes.length === 0}>
                {editingId ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      {selectedSupplierClient && (
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedSupplierClient.name}</DialogTitle>
            </DialogHeader>
            
            {(() => {
              const stats = getSupplierClientStats(selectedSupplierClient);
              
              return (
                <div className="space-y-6">
                  {/* Contact Info */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <div className="text-sm text-gray-500">Documento</div>
                      <div className="font-medium">
                        {selectedSupplierClient.documentNumber || "-"}
                        {selectedSupplierClient.documentNumber && (
                          <span className="text-xs text-gray-400 ml-2 uppercase">
                            {selectedSupplierClient.documentType}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Email</div>
                      <div className="font-medium">{selectedSupplierClient.email || "-"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Telefone</div>
                      <div className="font-medium">{selectedSupplierClient.phone || "-"}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Tipo</div>
                      <div className="flex flex-wrap gap-1">
                        {selectedSupplierClient.contactTypes.map(type => (
                          <span
                            key={type}
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getContactTypeBadgeColor(type)}`}
                          >
                            {getContactTypeLabel(type)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {stats.isSupplier && (
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium">Contas a Pagar</CardTitle>
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-1">
                            <div className="text-2xl font-bold text-red-600">
                              {formatCurrency(stats.totalPending)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Pendente • {formatCurrency(stats.totalPaid)} pago
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    {stats.isClient && (
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                          <CardTitle className="text-sm font-medium">Contas a Receber</CardTitle>
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-1">
                            <div className="text-2xl font-bold text-green-600">
                              {formatCurrency(stats.totalPendingReceivables)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Pendente • {formatCurrency(stats.totalReceived)} recebido
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Chart - Last 30 days */}
                  {(stats.isSupplier || stats.isClient) && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Últimos 30 Dias</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
                              <Legend />
                              {stats.isSupplier && (
                                <Line
                                  type="monotone"
                                  dataKey="pagamentos"
                                  name="Pagamentos"
                                  stroke="#ef4444"
                                  strokeWidth={2}
                                />
                              )}
                              {stats.isClient && (
                                <Line
                                  type="monotone"
                                  dataKey="recebimentos"
                                  name="Recebimentos"
                                  stroke="#22c55e"
                                  strokeWidth={2}
                                />
                              )}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Transaction History */}
                  {stats.isSupplier && stats.supplierPayables.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Histórico de Contas a Pagar</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {stats.supplierPayables.map(p => {
                            const category = categories.find(c => c.id === p.categoryId);
                            return (
                              <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                  <div className="font-medium">{p.description}</div>
                                  <div className="text-xs text-gray-500">
                                    {category?.name} • Venc: {new Date(p.dueDate).toLocaleDateString('pt-BR')}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium text-red-600">{formatCurrency(p.amount)}</div>
                                  <div className="text-xs">
                                    {p.status === "pago" && <span className="text-green-600">✓ Pago</span>}
                                    {p.status === "pendente" && <span className="text-yellow-600">Pendente</span>}
                                    {p.status === "vencido" && <span className="text-red-600">Vencido</span>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {stats.isClient && stats.clientReceivables.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Histórico de Contas a Receber</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {stats.clientReceivables.map(r => {
                            const category = categories.find(c => c.id === r.categoryId);
                            return (
                              <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                  <div className="font-medium">{r.description}</div>
                                  <div className="text-xs text-gray-500">
                                    {category?.name} • Receb: {new Date(r.receiptDate).toLocaleDateString('pt-BR')}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium text-green-600">{formatCurrency(r.amount)}</div>
                                  <div className="text-xs">
                                    {r.status === "recebido" && <span className="text-green-600">✓ Recebido</span>}
                                    {r.status === "pendente" && <span className="text-yellow-600">Pendente</span>}
                                    {r.status === "vencido" && <span className="text-red-600">Vencido</span>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {selectedSupplierClient.notes && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Observações</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">
                          {selectedSupplierClient.notes}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
