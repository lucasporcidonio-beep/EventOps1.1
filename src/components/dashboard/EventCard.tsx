import React from "react";
import {
    Event,
    Contract,
    Professional,
    TeamAssignment,
    SubEvent,
    OperationalStatus,
} from "@/types";
import {
    format,
    parse
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Calendar,
    Clock,
    MapPin,
    Users,
    FileText,
    CheckCircle,
    MessageCircle,
    AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { detectEventIcon } from "@/lib/eventTypeIcons";
import { OperationalBadge, ConfirmationBadge } from "@/components/StatusBadge";
import { WhatsAppActionMenu } from "@/components/WhatsAppActionMenu";

interface EventCardProps {
    event: Event;
    contracts: Contract[];
    assignments: TeamAssignment[];
    subEvents: SubEvent[];
    professionals: Professional[];
    sameDayEvents: Event[];
    updateEvent: (id: string, data: Partial<Event>) => void;
    deleteEvent: (id: string) => void;
    onEdit: (event: Event) => void;
    onTeam: (event: Event) => void;
    onContract: (event: Event) => void;
    onConfirm: (event: Event) => void;
    onSubEvent: (event: Event) => void;
    onConclude?: (eventId: string) => void;
    isPast?: boolean;
}

const OP_STATUSES: OperationalStatus[] = [
    "Planejado",
    "Próximo",
    "Hoje",
    "Em Execução",
    "Entregue",
    "Finalizado",
];

export function EventCard({
    event,
    contracts,
    assignments,
    subEvents,
    professionals,
    sameDayEvents,
    updateEvent,
    deleteEvent,
    onEdit,
    onTeam,
    onContract,
    onConfirm,
    onSubEvent,
    onConclude,
    isPast = false,
}: EventCardProps) {
    const contract = contracts.find((c) => c.event_id === event.id);
    const eventAssignments = assignments.filter((a) => a.event_id === event.id);
    const eventSubEvents = subEvents.filter((s) => s.parent_event_id === event.id);

    const value = event.package_value || 0;
    const entryPaid = contract?.entry_payment_confirmed ? (contract.entry_payment_value || 0) : 0;
    const totalPaidWithEntry = (contract?.total_paid || 0) + entryPaid;
    const remaining = Math.max(0, value - totalPaidWithEntry);
    const isPaid = value > 0 && remaining <= 0;
    const hasPendingPayment = value > 0 && remaining > 0;
    const hasSameDayConflict = sameDayEvents.length > 0;

    const profConflicts = eventAssignments.filter(a => 
        sameDayEvents.some(sde => 
            assignments.some(otherA => otherA.event_id === sde.id && otherA.professional_id === a.professional_id)
        )
    );
    const hasProfConflict = profConflicts.length > 0;

    const whatsappLink = event.client_phone
        ? `https://wa.me/55${event.client_phone.replace(/\D/g, "")}`
        : null;

    const handleStatusChange = (status: OperationalStatus) => {
        if (status === "Em Execução" && event.confirmation_status !== "Confirmado") {
            alert("Evento não pode avançar para 'Em Execução' sem confirmação final.");
            return;
        }
        updateEvent(event.id, { operational_status: status });
    };

    return (
        <div
            className={cn(
                "rounded-xl p-[3px] transition-colors",
                isPaid ? (isPast ? "bg-success/20" : "border-2 border-success/60") : (isPast ? "bg-warning/20" : "border-2 border-transparent"),
                !isPast && hasPendingPayment && "border-2 border-warning/60"
            )}
        >
            <div
                className={cn(
                    "rounded-[10px] border p-3 sm:p-4 transition-colors",
                    isPast ? "bg-card/80 border-border" : (
                        event.confirmation_status === "Aguardando"
                            ? "border-warning/30 bg-warning/[0.03]"
                            : event.confirmation_status === "Divergência"
                                ? "border-destructive/30 bg-destructive/[0.03]"
                                : "border-border bg-card"
                    )
                )}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-lg shrink-0">{detectEventIcon(event)}</span>
                        <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">
                            {event.client_name}
                        </h3>
                        <WhatsAppActionMenu event={event} contract={contract} />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {isPast ? (
                            isPaid ? (
                                <Badge className="bg-success/20 text-success border-success/30 text-xs gap-1">
                                    Quitado
                                </Badge>
                            ) : (
                                <Badge className="bg-warning/20 text-warning border-warning/30 text-xs gap-1">
                                    <AlertTriangle className="h-3 w-3" /> R$ {remaining.toLocaleString("pt-BR")} pendente
                                </Badge>
                            )
                        ) : (
                            <>
                                <OperationalBadge status={event.operational_status} />
                                <ConfirmationBadge status={event.confirmation_status} />
                            </>
                        )}
                    </div>
                </div>

                {/* Info Row */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground mb-2">
                    <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">
                        {event.event_type}
                    </Badge>
                    <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span className={hasSameDayConflict ? "text-warning font-medium" : ""}>
                            {(() => {
                                try {
                                    const parsed = parse(event.event_date, "yyyy-MM-dd", new Date());
                                    return format(parsed, "EEE, dd-MM-yyyy", { locale: ptBR });
                                } catch {
                                    return event.event_date;
                                }
                            })()}
                        </span>
                        {hasSameDayConflict && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-warning" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{sameDayEvents.length} eventos no mesmo dia</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        {event.coverage_start_time}
                        {event.coverage_end_time && ` — ${event.coverage_end_time}`}
                    </span>
                    {(event.ceremony_location || event.reception_location) && (
                        <span className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                            <span className="truncate">
                                {event.ceremony_location || event.reception_location}
                            </span>
                        </span>
                    )}
                </div>

                {/* Financial & Package */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                    <span>{event.main_service}</span>
                    {/* For past events show amount paid/total */}
                    {isPast && value > 0 && (
                        <span>
                            R$ {totalPaidWithEntry.toLocaleString("pt-BR")} / R$ {value.toLocaleString("pt-BR")}
                        </span>
                    )}

                    {!isPast && event.package_name && (
                        <Badge variant="secondary" className="text-[10px] sm:text-xs">
                            {event.package_name}
                        </Badge>
                    )}

                    {!isPast && event.package_value && event.package_value > 0 && (
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-[10px] sm:text-xs gap-1 font-medium",
                                remaining > 0
                                    ? "border-warning/40 bg-warning/10 text-warning"
                                    : "border-success/40 bg-success/10 text-success"
                            )}
                        >
                            {remaining > 0
                                ? `💳 R$ ${remaining.toLocaleString("pt-BR")} restante`
                                : "✅ Quitado"}
                        </Badge>
                    )}
                </div>

                {/* SubEvents */}
                {eventSubEvents.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        {eventSubEvents.map((sub) => (
                            <Badge
                                key={sub.id}
                                variant="outline"
                                className={cn(
                                    "text-[10px] sm:text-xs gap-1 cursor-pointer",
                                    sub.completed
                                        ? "border-success/30 bg-success/10 text-success"
                                        : "border-primary/30 bg-primary/10 text-primary"
                                )}
                                onClick={() => onSubEvent(event)}
                            >
                                📸 {sub.type} —{" "}
                                {(() => {
                                    try {
                                        const parsed = parse(sub.date, "yyyy-MM-dd", new Date());
                                        return format(parsed, "dd/MM", { locale: ptBR });
                                    } catch {
                                        return sub.date;
                                    }
                                })()}
                                {sub.completed && " ✓"}
                            </Badge>
                        ))}
                    </div>
                )}

                {/* Team */}
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    {eventAssignments.length === 0 ? (
                        <span className="text-xs text-destructive flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Sem equipe
                        </span>
                    ) : (
                        eventAssignments.map((a) => {
                            const prof = professionals.find((p) => p.id === a.professional_id);
                            const isConflicted = profConflicts.some(pc => pc.professional_id === a.professional_id);
                            return (
                                <Badge
                                    key={a.professional_id}
                                    variant="secondary"
                                    className={cn(
                                        "text-[10px] sm:text-xs gap-1", 
                                        isConflicted && "border-destructive text-destructive bg-destructive/10"
                                    )}
                                >
                                    {a.primary && "★ "}
                                    {prof?.name} · {a.role}
                                    {isPast && a.cache_paid && " 💰"}
                                    {isConflicted && <AlertTriangle className="h-3 w-3 ml-0.5" />}
                                </Badge>
                            );
                        })
                    )}
                </div>

                {/* Actions */}
                {isPast && (
                    <label className="flex items-center gap-2 mb-2 cursor-pointer border-t border-border/50 pt-2">
                        <Checkbox
                            checked={event.materials_delivered || false}
                            onCheckedChange={(v) => updateEvent(event.id, { materials_delivered: !!v })}
                        />
                        <span className="text-xs font-medium flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Materiais entregues
                        </span>
                    </label>
                )}

                <div className="flex items-center gap-1 flex-wrap border-t border-border/50 pt-2 -mb-1">
                    {!isPast && (
                        <Select
                            value={event.operational_status}
                            onValueChange={(v) => handleStatusChange(v as OperationalStatus)}
                        >
                            <SelectTrigger className="h-7 w-[110px] text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {OP_STATUSES.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {s}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <div className="flex items-center gap-0.5 ml-auto">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => onSubEvent(event)}
                            title="Ensaios/Sub-eventos"
                        >
                            📸
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => onTeam(event)}
                            title="Equipe"
                        >
                            <Users className="h-3.5 w-3.5" />
                        </Button>
                        {!isPast && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => onConfirm(event)}
                                title="Confirmação"
                            >
                                <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => onContract(event)}
                            title="Contrato/Financeiro"
                        >
                            <FileText className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => onEdit(event)}
                            title="Editar"
                        >
                            ✎
                        </Button>
                        {isPast ? (
                            <Button
                                size="sm"
                                className={cn(
                                    "h-7 text-xs ml-1 gap-1",
                                    isPaid
                                        ? "bg-success hover:bg-success/90 text-success-foreground"
                                        : "bg-warning hover:bg-warning/90 text-warning-foreground"
                                )}
                                onClick={() => onConclude && onConclude(event.id)}
                            >
                                Concluir
                            </Button>
                        ) : (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={() => {
                                    if (window.confirm("Excluir este evento?")) deleteEvent(event.id);
                                }}
                                title="Excluir"
                            >
                                <AlertTriangle className="h-3.5 w-3.5" />
                            </Button>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}
