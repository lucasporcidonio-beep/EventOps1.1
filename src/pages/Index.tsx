import { useState } from "react";
import type {
  Event,
  ClientDataInput,
  OperationalStatus,
  EventType,
} from "@/types";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { Button } from "@/components/ui/button";
import { OperationalBadge, ConfirmationBadge } from "@/components/StatusBadge";
import { EventForm } from "@/components/EventForm";
import { TeamAssignmentDialog } from "@/components/TeamAssignmentDialog";
import { ContractDialog } from "@/components/ContractDialog";
import { ClientDataImport } from "@/components/ClientDataImport";
import { SubEventDialog } from "@/components/SubEventDialog";
import { ConcludeEventDialog } from "@/components/ConcludeEventDialog";
import { AIAssistantWizard } from "@/components/AIAssistantWizard";
import { TeamWorkloadView } from "@/pages/TeamWorkloadView";
import { CalendarView } from "@/pages/CalendarView";
import { FinancialReport } from "@/pages/FinancialReport";
import { useEvents } from "@/hooks/useEvents";
import { detectEventIcon } from "@/lib/eventTypeIcons";
import {
  Camera,
  Import,
  List,
  CalendarDays,
  DollarSign,
  HelpCircle,
  Settings,
  Plus,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EventFilters } from "@/components/dashboard/EventFilters";
import { EventCard } from "@/components/dashboard/EventCard";

export default function Dashboard() {
  const {
    events,
    sortedActiveEvents,
    contracts,
    professionals,
    assignments,
    checklists,
    subEvents,
    expenses,
    addEvent,
    updateEvent,
    deleteEvent,
    updateContract,
    addProfessional,
    removeProfessional,
    assignProfessional,
    updateAssignment,
    removeAssignment,
    updateChecklist,
    addSubEvent,
    updateSubEvent,
    deleteSubEvent,
    addExpense,
    updateExpense,
    removeExpense,
    getConflicts,
  } = useEvents();

  const [showEventForm, setShowEventForm] = useState(false);
  const [showAIWizard, setShowAIWizard] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editEvent, setEditEvent] = useState<Event | undefined>();
  const [teamEvent, setTeamEvent] = useState<Event | null>(null);
  const [confirmEvent, setConfirmEvent] = useState<Event | null>(null);
  const [contractEvent, setContractEvent] = useState<Event | null>(null);
  const [subEventParent, setSubEventParent] = useState<Event | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "financial" | "team">("list");
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [concludeEvent, setConcludeEvent] = useState<Event | null>(null);

  // São Paulo timezone current date
  const getSaoPauloToday = () => {
    const now = new Date();
    const spDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    return spDate; // "YYYY-MM-DD"
  };

  const todaySP = getSaoPauloToday();

  // Separate past events from active
  const pastEvents = events.filter(
    (e) => e.event_date < todaySP && e.operational_status !== "Finalizado"
  );

  // Filters
  const [filterProf, setFilterProf] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");

  const filteredEvents = sortedActiveEvents.filter((e) => {
    // Exclude past events from main list
    if (e.event_date < todaySP) return false;
    if (filterStatus !== "all" && e.operational_status !== filterStatus) return false;
    if (filterType !== "all" && e.event_type !== filterType) return false;
    if (filterProf !== "all") {
      const hasProf = assignments.some(
        (a) => a.event_id === e.id && a.professional_id === filterProf
      );
      if (!hasProf) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (
        !e.client_name.toLowerCase().includes(q) &&
        !e.event_type.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const handleConcludeEvent = (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return;
    setConcludeEvent(event);
  };

  // Keep this function logic even if triggered from dialog (not implemented here yet but kept for logic reference)
  const handleFinalizeConclude = () => {
    if (!concludeEvent) return;
    const contract = contracts.find((c) => c.event_id === concludeEvent.id);
    const value = concludeEvent.package_value || 0;
    const paid = contract?.total_paid || 0;
    const remaining = Math.max(0, value - paid);

    if (remaining > 0) {
      const ok = window.confirm(
        `⚠️ Este evento ainda tem R$ ${remaining.toLocaleString("pt-BR")} pendente.\n\nDeseja concluir e excluir mesmo assim?`
      );
      if (!ok) return;
    }

    deleteEvent(concludeEvent.id);
    setConcludeEvent(null);
  };

  const handleImport = (data: ClientDataInput) => {
    let eventDate = "";
    let startTime = "";
    let endTime = "";

    // Parse date from event_date_raw (supports dd/mm/yy and dd/mm/yyyy)
    const dateStr = data.event_date_raw || "";
    const dateMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (dateMatch) {
      let year = dateMatch[3];
      if (year.length === 2) year = `20${year}`;
      const month = dateMatch[2].padStart(2, "0");
      const day = dateMatch[1].padStart(2, "0");
      eventDate = `${year}-${month}-${day}`;
    }

    // Parse time
    if (data.event_time_raw) {
      startTime = data.event_time_raw;
    }

    const eventType = (data.event_type_hint as EventType) || (data.debutante_name ? "Debutante" : "Outro");

    const event: Event = {
      id: crypto.randomUUID(),
      event_type: eventType,
      client_name: data.full_name || "",
      client_phone: data.phone || "",
      client_rg: data.rg || "",
      client_birthdate: data.birthdate || "",
      client_address: data.address || "",
      event_date: eventDate,
      coverage_start_time: startTime,
      coverage_end_time: endTime,
      ceremony_location: data.event_address || "",
      reception_location: data.event_address || "",
      main_service: "Fotografia",
      additional_services: [],
      operational_status: "Planejado",
      confirmation_status: "Aguardando",
      notes: "",
      debutante_name: data.debutante_name || "",
      groom_name: data.groom_name || "",
      bride_name: data.bride_name || "",
      birthday_person_name: data.birthday_person_name || "",
      package_name: data.package_name || "",
      package_value: data.package_value || 0,
    };

    addEvent(event);

    if (data.entry_value) {
      updateContract(event.id, {
        entry_payment_value: data.entry_value,
        total_paid: data.entry_value,
        payment_history: [{
          id: crypto.randomUUID(),
          date: new Date().toISOString().split("T")[0],
          value: data.entry_value,
          method: "Entrada",
        }],
      });
    }
  };

  const nextEvent = filteredEvents[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Header - mobile optimized */}
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <h1 className="text-base font-semibold text-foreground">Gestão de Eventos</h1>
          </div>
          <div className="flex items-center gap-1.5">
            {/* View Toggle */}
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="rounded-none h-8 w-8 p-0"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "calendar" ? "default" : "ghost"}
                size="sm"
                className="rounded-none h-8 w-8 p-0"
                onClick={() => setViewMode("calendar")}
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "team" ? "default" : "ghost"}
                      size="sm"
                      className="rounded-none h-8 w-8 p-0"
                      onClick={() => setViewMode("team")}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Equipe e Conflitos</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={viewMode === "financial" ? "default" : "ghost"}
                      size="sm"
                      className="rounded-none h-8 w-8 p-0"
                      onClick={() => setViewMode("financial")}
                    >
                      <DollarSign className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Relatório Financeiro</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 sm:w-auto sm:px-3 sm:gap-2"
              onClick={() => window.location.href = "/settings"}
              title="Configurações"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 sm:w-auto sm:px-3 sm:gap-2"
              onClick={() => window.location.href = "/help"}
            >
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Ajuda</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)} className="h-8 w-8 p-0 sm:w-auto sm:px-3 sm:gap-2">
              <Import className="h-4 w-4" />
              <span className="hidden sm:inline">Importar</span>
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" onClick={() => setShowAIWizard(true)} className="h-8 w-8 p-0 sm:w-auto sm:px-3 sm:gap-2 bg-indigo-600 hover:bg-indigo-700 text-white mr-1 border-none shadow-sm shadow-indigo-500/20">
                    <Sparkles className="h-4 w-4" />
                    <span className="hidden sm:inline">EventOps AI</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Criar projeto usando a Inteligência Artificial</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" onClick={() => setShowEventForm(true)} className="h-8 w-8 p-0 sm:w-auto sm:px-3 sm:gap-2 bg-slate-800 text-slate-200">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Manual</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Criar novo evento (Adiciona R$ 50 de despesa padrão)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4">
        {/* Next Event Highlight */}
        {nextEvent && viewMode === "list" && (
          <div className="mb-4 p-3 rounded-xl border border-primary/30 bg-primary/5">
            <p className="text-xs text-primary font-medium mb-1">PRÓXIMO EVENTO</p>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {detectEventIcon(nextEvent)} {nextEvent.client_name}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {(() => {
                      try {
                        const parsed = parse(nextEvent.event_date, "yyyy-MM-dd", new Date());
                        return format(parsed, "EEE, dd-MM-yyyy", { locale: ptBR });
                      } catch { return nextEvent.event_date; }
                    })()}
                  </span>
                  <span>{nextEvent.coverage_start_time}</span>
                  <span>{nextEvent.event_type}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <OperationalBadge status={nextEvent.operational_status} />
                <ConfirmationBadge status={nextEvent.confirmation_status} />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        {viewMode === "list" && (
          <EventFilters
            search={search}
            setSearch={setSearch}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterType={filterType}
            setFilterType={setFilterType}
            filterProf={filterProf}
            setFilterProf={setFilterProf}
            professionals={professionals}
            totalFiltered={filteredEvents.length}
          />
        )}

        {/* Past Events Section */}
        {viewMode === "list" && pastEvents.length > 0 && (
          <Collapsible open={showPastEvents} onOpenChange={setShowPastEvents} className="mb-4">
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-10 text-sm border-warning/30 bg-warning/5 hover:bg-warning/10">
                <span className="flex items-center gap-2">
                  {showPastEvents ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  📋 Eventos Anteriores ({pastEvents.length})
                </span>
                <Badge variant="outline" className="text-xs text-warning border-warning/40">
                  Pendentes de conclusão
                </Badge>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              {pastEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  contracts={contracts}
                  assignments={assignments}
                  subEvents={subEvents}
                  professionals={professionals}
                  sameDayEvents={[]}
                  updateEvent={updateEvent}
                  deleteEvent={deleteEvent}
                  onEdit={(e) => {
                    setEditEvent(e);
                    setShowEventForm(true);
                  }}
                  onTeam={setTeamEvent}
                  onContract={setContractEvent}
                  onConfirm={setConfirmEvent}
                  onSubEvent={setSubEventParent}
                  isPast={true}
                  onConclude={handleConcludeEvent}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Views */}
        {viewMode === "financial" ? (
          <FinancialReport events={events} contracts={contracts} assignments={assignments} professionals={professionals} expenses={expenses} />
        ) : viewMode === "calendar" ? (
          <CalendarView
            events={filteredEvents}
            subEvents={subEvents}
            onSelectEvent={(event) => {
              setEditEvent(event);
              setShowEventForm(true);
            }}
            onSelectSubEvent={(parentEvent) => {
              setSubEventParent(parentEvent);
            }}
          />
        ) : viewMode === "team" ? (
          <TeamWorkloadView events={events} professionals={professionals} assignments={assignments} />
        ) : (
          /* Event Queue */
          filteredEvents.length === 0 ? (
            <div className="text-center py-20">
              <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-foreground mb-1">Nenhum evento na fila</h3>
              <p className="text-sm text-muted-foreground">Crie um novo evento ou importe dados do cliente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event) => {
                const sameDayEvents = events.filter(
                  (e) => e.id !== event.id && e.event_date === event.event_date && e.operational_status !== "Finalizado"
                );

                return (
                  <EventCard
                    key={event.id}
                    event={event}
                    contracts={contracts}
                    assignments={assignments}
                    subEvents={subEvents}
                    professionals={professionals}
                    sameDayEvents={sameDayEvents}
                    updateEvent={updateEvent}
                    deleteEvent={deleteEvent}
                    onEdit={(e) => {
                      setEditEvent(e);
                      setShowEventForm(true);
                    }}
                    onTeam={setTeamEvent}
                    onContract={setContractEvent}
                    onConfirm={setConfirmEvent}
                    onSubEvent={setSubEventParent}
                  />
                );
              })}
            </div>
          )
        )}
      </main>

      {/* Dialogs */}
      {showEventForm && (
        <EventForm
          open={showEventForm}
          onOpenChange={(v) => {
            setShowEventForm(v);
            if (!v) setEditEvent(undefined);
          }}
          initialData={editEvent}
          onSubmit={(data) => {
            if (editEvent) {
              updateEvent(editEvent.id, data);
            } else {
              addEvent({ ...data, id: crypto.randomUUID() } as Event);
            }
            setShowEventForm(false);
            setEditEvent(undefined);
          }}
        />
      )}

      {showAIWizard && (
        <AIAssistantWizard
          open={showAIWizard}
          onOpenChange={setShowAIWizard}
          onComplete={(event) => {
            addEvent(event as Event);
          }}
        />
      )}

      {teamEvent && (
        <TeamAssignmentDialog
          open={!!teamEvent}
          onOpenChange={(v) => !v && setTeamEvent(null)}
          event={teamEvent}
          professionals={professionals}
          assignments={assignments.filter((a) => a.event_id === teamEvent.id)}
          onAssign={assignProfessional}
          onRemoveAssignment={removeAssignment}
          onUpdateAssignment={updateAssignment}
          onAddProfessional={addProfessional}
          onRemoveProfessional={removeProfessional}
          getConflicts={(pid) => getConflicts(pid, teamEvent.id)}
        />
      )}

      {confirmEvent && (
        <ConfirmationDialog
          open={!!confirmEvent}
          onOpenChange={(v) => !v && setConfirmEvent(null)}
          event={confirmEvent}
          checklist={checklists.find((c) => c.event_id === confirmEvent.id)!}
          onUpdate={updateChecklist}
          onUpdateEvent={updateEvent}
        />
      )}

      {contractEvent && (
        <ContractDialog
          open={!!contractEvent}
          onOpenChange={(v) => !v && setContractEvent(null)}
          event={contractEvent}
          contract={contracts.find((c) => c.event_id === contractEvent.id)!}
          onUpdate={updateContract}
          expenses={expenses.filter((e) => e.event_id === contractEvent.id)}
          onAddExpense={addExpense}
          onUpdateExpense={updateExpense}
          onRemoveExpense={removeExpense}
        />
      )}

      {showImport && (
        <ClientDataImport
          open={showImport}
          onOpenChange={setShowImport}
          onImport={handleImport}
        />
      )}

      {subEventParent && (
        <SubEventDialog
          open={!!subEventParent}
          onOpenChange={(v) => !v && setSubEventParent(null)}
          parentEvent={subEventParent}
          subEvents={subEvents.filter((s) => s.parent_event_id === subEventParent.id)}
          professionals={professionals}
          allEvents={events}
          assignments={assignments}
          onAdd={addSubEvent}
          onUpdate={updateSubEvent}
          onDelete={deleteSubEvent}
        />
      )}

      {concludeEvent && (
        <ConcludeEventDialog
          open={!!concludeEvent}
          onOpenChange={(v) => !v && setConcludeEvent(null)}
          event={concludeEvent}
          assignments={assignments.filter((a) => a.event_id === concludeEvent.id)}
          professionals={professionals}
          contract={contracts.find((c) => c.event_id === concludeEvent.id)!}
          onUpdateAssignment={updateAssignment}
          onUpdateEvent={updateEvent}
          onUpdateContract={updateContract}
          onConfirm={handleFinalizeConclude}
        />
      )}
    </div>
  );
}
