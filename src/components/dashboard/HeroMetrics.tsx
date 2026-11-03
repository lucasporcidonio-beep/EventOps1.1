import { Calendar, Clock, DollarSign, AlertCircle } from "lucide-react";
import type { Event, Contract, TeamAssignment } from "@/types";
import { Card, CardContent } from "@/components/ui/card";

interface HeroMetricsProps {
  events: Event[];
  contracts: Contract[];
  assignments: TeamAssignment[];
}

export function HeroMetrics({ events, contracts, assignments }: HeroMetricsProps) {
  const now = new Date();
  const currentMonthStr = now.toISOString().slice(0, 7); // "YYYY-MM"
  const todayStr = now.toISOString().split("T")[0]; // "YYYY-MM-DD"

  // 1. Eventos deste mês
  const currentMonthEvents = events.filter(
    (e) => e.event_date && e.event_date.startsWith(currentMonthStr)
  );

  // 2. Próximo Evento
  const futureEvents = events
    .filter((e) => e.event_date && e.event_date >= todayStr && e.operational_status !== "Finalizado")
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  const nextEvent = futureEvents[0];
  let daysUntilNext = 0;
  if (nextEvent) {
    const nextDate = new Date(nextEvent.event_date + "T00:00:00");
    const diffTime = nextDate.getTime() - new Date(todayStr + "T00:00:00").getTime();
    daysUntilNext = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // 3. Faturamento e Previsão
  const totalMonthRevenue = currentMonthEvents.reduce((acc, ev) => {
    const c = contracts.find((ctr) => ctr.event_id === ev.id);
    return acc + (c?.total_value || ev.package_value || 0);
  }, 0);

  const totalMonthReceived = currentMonthEvents.reduce((acc, ev) => {
    const c = contracts.find((ctr) => ctr.event_id === ev.id);
    return acc + (c?.total_paid || 0);
  }, 0);

  const pendingMonthBalance = totalMonthRevenue - totalMonthReceived;

  // 4. Alertas nos próximos 7 dias (sem equipe escalada ou com pendências)
  const next7DaysStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const urgentEvents = events.filter(
    (e) =>
      e.event_date &&
      e.event_date >= todayStr &&
      e.event_date <= next7DaysStr &&
      e.operational_status !== "Finalizado"
  );

  const eventsWithoutTeam = urgentEvents.filter((e) => {
    const hasAssigned = assignments.some((a) => a.event_id === e.id);
    return !hasAssigned;
  });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* Card 1: Eventos no Mês */}
      <Card className="bg-zinc-950/60 border-white/[0.08] backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Eventos do Mês</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-white">{currentMonthEvents.length}</div>
            <p className="text-xs text-zinc-500 mt-1">
              {events.length} no total da carteira
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Próximo Evento */}
      <Card className="bg-zinc-950/60 border-white/[0.08] backdrop-blur-xl relative overflow-hidden group hover:border-blue-500/40 transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all pointer-events-none" />
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Próximo Evento</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            {nextEvent ? (
              <>
                <div className="text-base sm:text-lg font-bold text-white truncate" title={nextEvent.client_name}>
                  {nextEvent.client_name}
                </div>
                <p className="text-xs text-blue-400 font-medium mt-0.5">
                  {daysUntilNext === 0 ? "Hoje!" : daysUntilNext === 1 ? "Amanhã" : `Em ${daysUntilNext} dias`} ({nextEvent.event_date.split("-").reverse().slice(0, 2).join("/")})
                </p>
              </>
            ) : (
              <div className="text-sm text-zinc-500 mt-2">Nenhum evento agendado</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Previsão a Receber */}
      <Card className="bg-zinc-950/60 border-white/[0.08] backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">A Receber no Mês</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-400">
              R$ {pendingMonthBalance.toLocaleString("pt-BR")}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              R$ {totalMonthReceived.toLocaleString("pt-BR")} já quitado
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Alertas Operacionais */}
      <Card className={`bg-zinc-950/60 border-white/[0.08] backdrop-blur-xl relative overflow-hidden group transition-all ${eventsWithoutTeam.length > 0 ? "hover:border-amber-500/50" : "hover:border-emerald-500/40"}`}>
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all pointer-events-none" />
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Alertas Operacionais</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${eventsWithoutTeam.length > 0 ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            {eventsWithoutTeam.length > 0 ? (
              <>
                <div className="text-xl sm:text-2xl font-bold text-amber-400">
                  {eventsWithoutTeam.length} {eventsWithoutTeam.length === 1 ? "evento" : "eventos"}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Sem equipe nos próximos 7 dias
                </p>
              </>
            ) : (
              <>
                <div className="text-base sm:text-lg font-bold text-emerald-400">Tudo em dia!</div>
                <p className="text-xs text-zinc-500 mt-1">
                  Sem pendências urgentes
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
