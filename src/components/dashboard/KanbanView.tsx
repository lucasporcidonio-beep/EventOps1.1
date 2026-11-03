import type { Event, Contract, OperationalStatus, Professional, TeamAssignment } from "@/types";
import { Badge } from "@/components/ui/badge";
import { detectEventIcon } from "@/lib/eventTypeIcons";
import { WhatsAppActionMenu } from "@/components/WhatsAppActionMenu";
import { Calendar, Clock, MapPin, DollarSign, AlertTriangle, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KanbanViewProps {
  events: Event[];
  contracts: Contract[];
  professionals: Professional[];
  assignments: TeamAssignment[];
  onUpdateStatus: (eventId: string, newStatus: OperationalStatus) => void;
  onSelectEvent: (event: Event) => void;
}

const COLUMNS: { status: OperationalStatus; label: string; color: string; dotColor: string }[] = [
  { status: "Planejado", label: "Planejado", color: "border-blue-500/30", dotColor: "bg-blue-400" },
  { status: "Próximo", label: "Próximo", color: "border-purple-500/30", dotColor: "bg-purple-400" },
  { status: "Hoje", label: "Hoje", color: "border-emerald-500/50", dotColor: "bg-emerald-400" },
  { status: "Em Execução", label: "Pós-Produção", color: "border-amber-500/30", dotColor: "bg-amber-400" },
  { status: "Entregue", label: "Entregue", color: "border-teal-500/30", dotColor: "bg-teal-400" },
  { status: "Finalizado", label: "Finalizado", color: "border-zinc-700/50", dotColor: "bg-zinc-500" },
];

export function KanbanView({
  events,
  contracts,
  onUpdateStatus,
  onSelectEvent,
}: KanbanViewProps) {
  const getNextStatus = (current: OperationalStatus): OperationalStatus | null => {
    const order: OperationalStatus[] = ["Planejado", "Próximo", "Hoje", "Em Execução", "Entregue", "Finalizado"];
    const idx = order.indexOf(current);
    return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
  };

  const getPrevStatus = (current: OperationalStatus): OperationalStatus | null => {
    const order: OperationalStatus[] = ["Planejado", "Próximo", "Hoje", "Em Execução", "Entregue", "Finalizado"];
    const idx = order.indexOf(current);
    return idx > 0 ? order[idx - 1] : null;
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-2 snap-x select-none">
      {COLUMNS.map((col) => {
        const columnEvents = events.filter((e) => e.operational_status === col.status);

        return (
          <div
            key={col.status}
            className="flex-shrink-0 w-80 bg-zinc-950/40 border border-white/[0.06] rounded-2xl flex flex-col max-h-[calc(100vh-250px)] backdrop-blur-xl"
          >
            {/* Cabeçalho da Coluna */}
            <div className="p-3.5 border-b border-white/[0.06] flex items-center justify-between sticky top-0 bg-zinc-950/80 backdrop-blur-md rounded-t-2xl z-10">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                <span className="font-semibold text-sm text-zinc-200">{col.label}</span>
              </div>
              <Badge variant="secondary" className="bg-white/5 text-zinc-400 text-xs px-2 py-0.5">
                {columnEvents.length}
              </Badge>
            </div>

            {/* Lista de Cards da Coluna */}
            <div className="p-2.5 space-y-3 overflow-y-auto flex-1">
              {columnEvents.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-600 border border-dashed border-white/5 rounded-xl">
                  Nenhum evento nesta fase
                </div>
              ) : (
                columnEvents.map((event) => {
                  const contract = contracts.find((c) => c.event_id === event.id);
                  const total = contract?.total_value || event.package_value || 0;
                  const paid = contract?.total_paid || 0;
                  const pendingBalance = total - paid;
                  const hasDebt = pendingBalance > 0 && total > 0;
                  const nextStatus = getNextStatus(event.operational_status);
                  const prevStatus = getPrevStatus(event.operational_status);

                  return (
                    <div
                      key={event.id}
                      onClick={() => onSelectEvent(event)}
                      className="group bg-zinc-900/60 hover:bg-zinc-900/90 border border-white/[0.08] hover:border-emerald-500/40 rounded-xl p-3.5 shadow-sm transition-all duration-200 cursor-pointer relative"
                    >
                      {/* Topo do Card: Tipo & WhatsApp */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Badge variant="outline" className="text-xs bg-white/5 border-white/10 text-zinc-300 font-normal flex items-center gap-1.5">
                          <span>{detectEventIcon(event.event_type)}</span>
                          <span>{event.event_type}</span>
                        </Badge>
                        <div onClick={(e) => e.stopPropagation()}>
                          <WhatsAppActionMenu event={event} contract={contract} />
                        </div>
                      </div>

                      {/* Nome do Cliente */}
                      <h4 className="font-semibold text-sm text-white group-hover:text-emerald-400 transition-colors line-clamp-1 mb-1">
                        {event.client_name}
                      </h4>

                      {/* Data e Horário */}
                      <div className="flex items-center gap-3 text-xs text-zinc-400 mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-zinc-500" />
                          {event.event_date.split("-").reverse().join("/")}
                        </span>
                        {event.coverage_start_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-zinc-500" />
                            {event.coverage_start_time}
                          </span>
                        )}
                      </div>

                      {/* Local */}
                      {(event.ceremony_location || event.reception_location) && (
                        <div className="flex items-center gap-1 text-xs text-zinc-500 truncate mb-2.5">
                          <MapPin className="h-3 w-3 flex-shrink-0 text-zinc-600" />
                          <span className="truncate">{event.ceremony_location || event.reception_location}</span>
                        </div>
                      )}

                      {/* Alerta de Trava Financeira na Entrega */}
                      {hasDebt && (event.operational_status === "Em Execução" || event.operational_status === "Entregue") && (
                        <div className="mb-2.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md flex items-center gap-1.5 text-[11px] text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate font-medium">Saldo: R$ {pendingBalance.toLocaleString("pt-BR")} pendente</span>
                        </div>
                      )}

                      {/* Rodapé: Valor e Mudança de Fase */}
                      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-300 flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-emerald-400" />
                          R$ {total.toLocaleString("pt-BR")}
                        </span>

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {prevStatus && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-zinc-500 hover:text-white hover:bg-white/10"
                              title={`Voltar para ${prevStatus}`}
                              onClick={() => onUpdateStatus(event.id, prevStatus)}
                            >
                              <ArrowLeft className="h-3 w-3" />
                            </Button>
                          )}
                          {nextStatus && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                              title={`Avançar para ${nextStatus}`}
                              onClick={() => onUpdateStatus(event.id, nextStatus)}
                            >
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
