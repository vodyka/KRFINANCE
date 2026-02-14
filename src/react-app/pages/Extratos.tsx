import { useState, useMemo } from "react";
import { useFinanceData } from "@/react-app/hooks/use-finance-data";
import { formatCurrency, getBrazilToday, parseDateBrazil } from "@/react-app/lib/finance-utils";
import { Card, CardContent } from "@/react-app/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/react-app/components/ui/select";
import { ChevronRight, TrendingUp, TrendingDown, Scale, Wallet, CircleArrowUp, CircleArrowDown } from "lucide-react";
import { Badge } from "@/react-app/components/ui/badge";

interface DailyTransaction {
  id: string;
  description: string;
  amount: number;
  type: "entrada" | "saida";
  categoryId: string;
  status: string;
}

interface DayGroup {
  date: string;
  dayName: string;
  transactions: DailyTransaction[];
  totalEntradas: number;
  totalSaidas: number;
  saldoDia: number;
  saldoAcumulado: number;
}

export default function ExtratosPage() {
  const { companyPayables, companyReceivables, banks, categories } = useFinanceData();
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [selectedPeriod, setSelectedPeriod] = useState("este-mes");
  const [selectedBank, setSelectedBank] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const toggleDay = (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

  const getDayName = (dateStr: string): string => {
    const date = parseDateBrazil(dateStr);
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return days[date.getDay()];
  };

  const formatDateDisplay = (dateStr: string): string => {
    const [, month, day] = dateStr.split('-');
    return `${day}/${month}`;
  };

  // Filter and group transactions by date
  const dayGroups = useMemo(() => {
    const today = getBrazilToday();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Combine receivables and payables
    const allTransactions: Array<{
      date: string;
      amount: number;
      type: "entrada" | "saida";
      description: string;
      categoryId: string;
      bankId: string;
      status: string;
      id: string;
    }> = [
      ...companyReceivables.map(r => ({
        date: r.receiptDate,
        amount: r.amount,
        type: "entrada" as const,
        description: r.description,
        categoryId: r.categoryId,
        bankId: r.bankId,
        status: r.status,
        id: r.id,
      })),
      ...companyPayables.map(p => ({
        date: p.dueDate,
        amount: p.amount,
        type: "saida" as const,
        description: p.description,
        categoryId: p.categoryId,
        bankId: p.bankId,
        status: p.status,
        id: p.id,
      })),
    ];

    // Filter by period
    const filtered = allTransactions.filter(t => {
      const tDate = parseDateBrazil(t.date);
      
      if (selectedPeriod === "este-mes") {
        return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
      }
      return true;
    }).filter(t => {
      if (selectedBank !== "all" && t.bankId !== selectedBank) return false;
      if (selectedCategory !== "all" && t.categoryId !== selectedCategory) return false;
      if (selectedStatus !== "all" && t.status !== selectedStatus) return false;
      return true;
    });

    // Group by date
    const grouped = new Map<string, DailyTransaction[]>();
    filtered.forEach(t => {
      if (!grouped.has(t.date)) {
        grouped.set(t.date, []);
      }
      grouped.get(t.date)!.push({
        id: t.id,
        description: t.description,
        amount: t.amount,
        type: t.type,
        categoryId: t.categoryId,
        status: t.status,
      });
    });

    // Sort dates descending
    const sortedDates = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));

    // Calculate daily and accumulated balances
    let saldoAcumulado = 0;
    const groups: DayGroup[] = [];

    for (const date of sortedDates) {
      const transactions = grouped.get(date)!;
      const totalEntradas = transactions.filter(t => t.type === "entrada").reduce((sum, t) => sum + t.amount, 0);
      const totalSaidas = transactions.filter(t => t.type === "saida").reduce((sum, t) => sum + t.amount, 0);
      const saldoDia = totalEntradas - totalSaidas;
      saldoAcumulado += saldoDia;

      groups.push({
        date,
        dayName: getDayName(date),
        transactions,
        totalEntradas,
        totalSaidas,
        saldoDia,
        saldoAcumulado,
      });
    }

    return groups;
  }, [companyPayables, companyReceivables, selectedPeriod, selectedBank, selectedCategory, selectedStatus]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalEntradas = dayGroups.reduce((sum, g) => sum + g.totalEntradas, 0);
    const totalSaidas = dayGroups.reduce((sum, g) => sum + g.totalSaidas, 0);
    const saldoPeriodo = totalEntradas - totalSaidas;
    const saldoFinal = dayGroups.length > 0 ? dayGroups[dayGroups.length - 1].saldoAcumulado : 0;

    return { totalEntradas, totalSaidas, saldoPeriodo, saldoFinal };
  }, [dayGroups]);

  const totalTransactions = dayGroups.reduce((sum, g) => sum + g.transactions.length, 0);

  return (
    <div className="p-4 pb-24 md:pb-6 md:p-6 lg:p-8">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Extrato</h1>
            <p className="text-muted-foreground text-sm">Confira seus lançamentos dia a dia com saldo acumulado</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="este-mes">Este mês</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedBank} onValueChange={setSelectedBank}>
            <SelectTrigger className="min-w-[140px]">
              <Wallet className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Todas as contas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas</SelectItem>
              {banks.map(bank => (
                <SelectItem key={bank.id} value={bank.id}>{bank.accountName}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="min-w-[120px]">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="recebido">Recebido</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <TrendingUp className="h-4 w-4 text-success" />
                Entradas
              </div>
              <p className="text-xl sm:text-2xl font-bold text-success">{formatCurrency(totals.totalEntradas)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Saídas
              </div>
              <p className="text-xl sm:text-2xl font-bold text-destructive">{formatCurrency(totals.totalSaidas)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Scale className="h-4 w-4" />
                Saldo do Período
              </div>
              <p className={`text-xl sm:text-2xl font-bold ${totals.saldoPeriodo >= 0 ? 'text-success' : 'text-destructive'}`}>
                {totals.saldoPeriodo >= 0 ? '' : '-'}{formatCurrency(Math.abs(totals.saldoPeriodo))}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Wallet className="h-4 w-4" />
                Saldo Final
              </div>
              <p className={`text-xl sm:text-2xl font-bold ${totals.saldoFinal >= 0 ? 'text-success' : 'text-destructive'}`}>
                {totals.saldoFinal >= 0 ? '' : '-'}{formatCurrency(Math.abs(totals.saldoFinal))}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Statement Table */}
        <Card>
          <CardContent className="p-0">
            <div>
              {/* Header */}
              <div className="px-4 py-2 border-b bg-muted/30 flex items-center gap-4 text-xs font-medium text-muted-foreground">
                <div className="w-4"></div>
                <div className="min-w-[140px]">Data</div>
                <div className="hidden sm:block text-center">Qtd.</div>
                <div className="flex-1"></div>
                <div className="text-right w-[90px] hidden sm:block">Entradas</div>
                <div className="text-right w-[90px] hidden sm:block">Saídas</div>
                <div className="text-right w-[100px]">Saldo dia</div>
                <div className="text-right w-[110px]">Saldo</div>
              </div>

              {/* Rows */}
              <div className="divide-y">
                {dayGroups.length === 0 ? (
                  <div className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum lançamento encontrado
                  </div>
                ) : (
                  dayGroups.map((group) => {
                    const isExpanded = expandedDays.has(group.date);
                    return (
                      <div key={group.date}>
                        {/* Day Summary Row */}
                        <button
                          onClick={() => toggleDay(group.date)}
                          className="w-full px-4 py-2.5 flex items-center gap-4 hover:bg-muted/50 transition-colors text-left"
                        >
                          <ChevronRight
                            className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                          />
                          <div className="flex items-center gap-2 min-w-[140px]">
                            <span className="font-semibold text-sm">{formatDateDisplay(group.date)}</span>
                            <span className="text-muted-foreground text-sm capitalize truncate">{group.dayName}</span>
                          </div>
                          <span className="text-muted-foreground text-xs hidden sm:block text-center w-[40px]">
                            {group.transactions.length}
                          </span>
                          <div className="flex-1"></div>
                          <div className="text-right w-[90px] hidden sm:block">
                            <span className="text-sm tabular-nums text-success">
                              {group.totalEntradas > 0 ? formatCurrency(group.totalEntradas) : '-'}
                            </span>
                          </div>
                          <div className="text-right w-[90px] hidden sm:block">
                            <span className="text-sm tabular-nums text-destructive">
                              {group.totalSaidas > 0 ? formatCurrency(group.totalSaidas) : '-'}
                            </span>
                          </div>
                          <div className="text-right w-[100px]">
                            <span className={`font-medium text-sm tabular-nums ${group.saldoDia >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {group.saldoDia >= 0 ? '+' : ''}{formatCurrency(group.saldoDia)}
                            </span>
                          </div>
                          <div className="text-right w-[110px]">
                            <span className={`font-bold text-sm tabular-nums ${group.saldoAcumulado >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {group.saldoAcumulado >= 0 ? '' : '-'}{formatCurrency(Math.abs(group.saldoAcumulado))}
                            </span>
                          </div>
                        </button>

                        {/* Expanded Transactions */}
                        {isExpanded && (
                          <div className="bg-muted/20 border-t">
                            {group.transactions.map((transaction) => (
                              <div
                                key={transaction.id}
                                className="px-4 py-2 flex items-center gap-4 border-b border-border/30 last:border-b-0"
                              >
                                <div className="w-4"></div>
                                <div className="flex items-center gap-2 min-w-[140px] flex-1">
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${transaction.type === 'entrada' ? 'bg-success/10' : 'bg-destructive/10'}`}>
                                    {transaction.type === 'entrada' ? (
                                      <CircleArrowUp className="h-2.5 w-2.5 text-success" />
                                    ) : (
                                      <CircleArrowDown className="h-2.5 w-2.5 text-destructive" />
                                    )}
                                  </div>
                                  <span className="text-sm truncate">{transaction.description}</span>
                                </div>
                                <div className="hidden sm:flex justify-center w-[40px]">
                                  <Badge
                                    variant={transaction.status === 'recebido' || transaction.status === 'pago' ? 'secondary' : 'default'}
                                    className="text-[9px] h-4 px-1.5 shrink-0"
                                  >
                                    {transaction.status === 'recebido' ? 'Recebido' : transaction.status === 'pago' ? 'Pago' : 'Pendente'}
                                  </Badge>
                                </div>
                                <div className="flex-1"></div>
                                <div className="text-right w-[90px] hidden sm:block">
                                  <span className="text-sm tabular-nums text-success">
                                    {transaction.type === 'entrada' ? formatCurrency(transaction.amount) : '-'}
                                  </span>
                                </div>
                                <div className="text-right w-[90px] hidden sm:block">
                                  <span className="text-sm tabular-nums text-destructive">
                                    {transaction.type === 'saida' ? formatCurrency(transaction.amount) : '-'}
                                  </span>
                                </div>
                                <div className="text-right w-[100px]">
                                  <span className={`text-sm tabular-nums sm:text-transparent ${transaction.type === 'entrada' ? 'text-success' : 'text-destructive'}`}>
                                    {transaction.type === 'entrada' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                  </span>
                                </div>
                                <div className="text-right w-[110px]">
                                  <span className={`text-sm tabular-nums ${group.saldoAcumulado >= 0 ? 'text-success' : 'text-destructive'}`}>
                                    {group.saldoAcumulado >= 0 ? '' : '-'}{formatCurrency(Math.abs(group.saldoAcumulado))}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {totalTransactions > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            {totalTransactions} lançamentos em {dayGroups.length} dias
          </p>
        )}
      </div>
    </div>
  );
}
