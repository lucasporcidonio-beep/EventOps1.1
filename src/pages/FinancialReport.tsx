import { useMemo } from "react";
import type { Event, Contract, TeamAssignment, Professional, EventExpense } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { detectEventIcon } from "@/lib/eventTypeIcons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface FinancialReportProps {
  events: Event[];
  contracts: Contract[];
  assignments: TeamAssignment[];
  professionals: Professional[];
  expenses: EventExpense[];
}

const COLORS = [
  "hsl(213, 80%, 55%)",
  "hsl(152, 60%, 42%)",
  "hsl(45, 90%, 55%)",
  "hsl(0, 72%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(180, 60%, 45%)",
];

export function FinancialReport({ events, contracts, assignments, professionals, expenses }: FinancialReportProps) {
  // --- Client revenue stats ---
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let fullyPaid = 0;
    let partial = 0;
    let noPay = 0;

    const monthlyMap: Record<string, { revenue: number; paid: number }> = {};
    const typeMap: Record<string, number> = {};

    events.forEach((event) => {
      const contract = contracts.find((c) => c.event_id === event.id);
      const value = event.package_value || 0;
      const paid = contract?.total_paid || 0;
      const remaining = Math.max(0, value - paid);

      totalRevenue += value;
      totalPaid += paid;
      totalPending += remaining;

      if (value > 0 && remaining <= 0) fullyPaid++;
      else if (paid > 0) partial++;
      else noPay++;

      if (event.event_date) {
        const month = event.event_date.substring(0, 7);
        if (!monthlyMap[month]) monthlyMap[month] = { revenue: 0, paid: 0 };
        monthlyMap[month].revenue += value;
        monthlyMap[month].paid += paid;
      }

      const type = event.event_type;
      typeMap[type] = (typeMap[type] || 0) + value;
    });

    const monthlyData = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: formatMonth(month),
        Faturamento: data.revenue,
        Recebido: data.paid,
      }));

    const typeData = Object.entries(typeMap)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));

    return { totalRevenue, totalPaid, totalPending, fullyPaid, partial, noPay, monthlyData, typeData };
  }, [events, contracts]);

  // --- Cachê stats ---
  const cacheStats = useMemo(() => {
    let totalCache = 0;
    let totalCachePaid = 0;

    assignments.forEach((a) => {
      totalCache += a.cache_value || 0;
      if (a.cache_paid) totalCachePaid += a.cache_value || 0;
    });

    return { totalCache, totalCachePaid, totalCachePending: totalCache - totalCachePaid };
  }, [assignments]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.value, 0);
  }, [expenses]);

  const paymentPercent =
    stats.totalRevenue > 0
      ? Math.round((stats.totalPaid / stats.totalRevenue) * 100)
      : 0;

  const eventBreakdown = useMemo(() => {
    return events
      .filter((e) => (e.package_value || 0) > 0)
      .map((e) => {
        const contract = contracts.find((c) => c.event_id === e.id);
        const value = e.package_value || 0;
        const paid = contract?.total_paid || 0;
        const remaining = Math.max(0, value - paid);
        const percent = value > 0 ? Math.round((paid / value) * 100) : 0;
        return { event: e, paid, remaining, percent };
      })
      .sort((a, b) => b.remaining - a.remaining);
  }, [events, contracts]);

  // Pending cachê per professional
  const cachePendingList = useMemo(() => {
    const profMap: Record<string, { name: string; total: number; paid: number; pending: number; events: string[] }> = {};
    assignments.forEach((a) => {
      if (!a.cache_value || a.cache_value <= 0) return;
      const prof = professionals.find(p => p.id === a.professional_id);
      if (!prof) return;
      if (!profMap[a.professional_id]) {
        profMap[a.professional_id] = { name: prof.name, total: 0, paid: 0, pending: 0, events: [] };
      }
      profMap[a.professional_id].total += a.cache_value;
      if (a.cache_paid) {
        profMap[a.professional_id].paid += a.cache_value;
      } else {
        profMap[a.professional_id].pending += a.cache_value;
        const ev = events.find(e => e.id === a.event_id);
        if (ev) profMap[a.professional_id].events.push(ev.client_name);
      }
    });
    return Object.values(profMap).filter(p => p.total > 0).sort((a, b) => b.pending - a.pending);
  }, [assignments, professionals, events]);

  return (
    <div className="space-y-6">
      {/* Caixa Principal */}
      <Card className="bg-primary/5 border-primary/30">
        <CardHeader>
          <CardTitle className="text-sm text-foreground">💰 Caixa Principal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Receita Total (Clientes)</p>
              <p className="text-xl font-bold text-foreground">R$ {stats.totalRevenue.toLocaleString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recebido (Clientes)</p>
              <p className="text-xl font-bold text-success">R$ {stats.totalPaid.toLocaleString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">A Receber (Clientes)</p>
              <p className="text-xl font-bold text-warning">R$ {stats.totalPending.toLocaleString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Progresso</p>
              <p className="text-xl font-bold text-foreground">{paymentPercent}%</p>
              <Progress value={paymentPercent} className="mt-1 h-2" />
            </div>
          </div>
          {/* Cachê totals */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Total Cachê (Profissionais)</p>
              <p className="text-lg font-bold text-foreground">R$ {cacheStats.totalCache.toLocaleString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cachê Pago</p>
              <p className="text-lg font-bold text-success">R$ {cacheStats.totalCachePaid.toLocaleString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cachê Pendente</p>
              <p className="text-lg font-bold text-warning">R$ {cacheStats.totalCachePending.toLocaleString("pt-BR")}</p>
            </div>
          </div>
          {/* Expenses */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Despesas Adicionais</p>
              <p className="text-lg font-bold text-destructive">R$ {totalExpenses.toLocaleString("pt-BR")}</p>
            </div>
          </div>
          {/* Net */}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">Lucro Líquido (Recebido - Cachê Pago - Despesas)</p>
            <p className="text-2xl font-bold text-foreground">
              R$ {(stats.totalPaid - cacheStats.totalCachePaid - totalExpenses).toLocaleString("pt-BR")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Status badges */}
      <div className="flex gap-3">
        <Badge className="status-success gap-1">✓ Quitados: {stats.fullyPaid}</Badge>
        <Badge className="status-warning gap-1">◐ Parciais: {stats.partial}</Badge>
        <Badge className="status-neutral gap-1">○ Sem pgto: {stats.noPay}</Badge>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm text-foreground">Faturamento Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.monthlyData}>
                  <XAxis dataKey="month" tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(215, 12%, 50%)", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(225, 14%, 13%)",
                      border: "1px solid hsl(225, 12%, 18%)",
                      borderRadius: 8,
                      color: "hsl(210, 20%, 92%)",
                    }}
                    formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`}
                  />
                  <Bar dataKey="Faturamento" fill="hsl(213, 80%, 55%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Recebido" fill="hsl(152, 60%, 42%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">Sem dados de faturamento</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm text-foreground">Receita por Tipo de Evento</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats.typeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {stats.typeData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(225, 14%, 13%)",
                      border: "1px solid hsl(225, 12%, 18%)",
                      borderRadius: 8,
                      color: "hsl(210, 20%, 92%)",
                    }}
                    formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">Sem dados por tipo</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cachê per professional */}
      {cachePendingList.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm text-foreground">💸 Cachê por Profissional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cachePendingList.map((p) => (
              <div key={p.name} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                    <span className="text-xs text-muted-foreground">
                      R$ {p.paid.toLocaleString("pt-BR")} / R$ {p.total.toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <Progress value={p.total > 0 ? Math.round((p.paid / p.total) * 100) : 0} className="h-1.5" />
                  {p.pending > 0 && p.events.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Pendente em: {p.events.join(", ")}
                    </p>
                  )}
                </div>
                <span className={`text-xs font-medium shrink-0 ${p.pending > 0 ? "text-warning" : "text-success"}`}>
                  {p.pending > 0 ? `R$ ${p.pending.toLocaleString("pt-BR")}` : "✓ Pago"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Per-event breakdown */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm text-foreground">Detalhamento por Evento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {eventBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento com valor definido</p>
          ) : (
            eventBreakdown.map(({ event, paid, remaining, percent }) => {
              const eventExpenses = expenses.filter((e) => e.event_id === event.id);
              const eventExpenseTotal = eventExpenses.reduce((sum, e) => sum + e.value, 0);
              const eventAssignments = assignments.filter((a) => a.event_id === event.id);
              const eventCachePaid = eventAssignments.reduce((sum, a) => (a.cache_paid ? sum + (a.cache_value || 0) : sum), 0);
              const eventNetProfit = paid - eventCachePaid - eventExpenseTotal;

              return (
                <div key={event.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{detectEventIcon(event)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground truncate">
                          {event.client_name}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          R$ {paid.toLocaleString("pt-BR")} / R$ {(event.package_value || 0).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <Progress value={percent} className="h-1.5" />
                    </div>
                    <span className={`text-xs font-medium shrink-0 ${remaining > 0 ? "text-warning" : "text-success"}`}>
                      {remaining > 0 ? `R$ ${remaining.toLocaleString("pt-BR")}` : "✓ Quitado"}
                    </span>
                  </div>

                  {/* Expense + cache detail */}
                  <div className="grid grid-cols-3 gap-2 text-xs pl-8">
                    <div>
                      <span className="text-muted-foreground">Cachês pagos:</span>{" "}
                      <span className="font-medium text-foreground">R$ {eventCachePaid.toLocaleString("pt-BR")}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Despesas:</span>{" "}
                      <span className="font-medium text-destructive">R$ {eventExpenseTotal.toLocaleString("pt-BR")}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Lucro:</span>{" "}
                      <span className={`font-medium ${eventNetProfit >= 0 ? "text-success" : "text-destructive"}`}>
                        R$ {eventNetProfit.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>

                  {/* Expense items */}
                  {eventExpenses.length > 0 && (
                    <div className="pl-8 space-y-1">
                      {eventExpenses.map((exp) => (
                        <div key={exp.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] py-0">{exp.category}</Badge>
                          <span>{exp.description}</span>
                          <span className="font-medium text-destructive">R$ {exp.value.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatMonth(yyyymm: string) {
  const [y, m] = yyyymm.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[parseInt(m) - 1]}/${y.slice(2)}`;
}
