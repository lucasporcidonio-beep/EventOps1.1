import { useState, useMemo } from "react";
import type { Event, SubEvent, SubEventType, Professional, TeamAssignment } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, MapPin, Trash2, CheckCircle2, Users, AlertTriangle } from "lucide-react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const SUB_EVENT_TYPES: SubEventType[] = ["Ensaio", "Pré-Wedding", "Making Of", "Outro"];

const SUB_EVENT_ICONS: Record<SubEventType, string> = {
  "Ensaio": "📸",
  "Pré-Wedding": "💑",
  "Making Of": "🎬",
  "Outro": "📋",
};

interface SubEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentEvent: Event;
  subEvents: SubEvent[];
  professionals: Professional[];
  allEvents?: Event[];
  assignments: TeamAssignment[];
  onAdd: (subEvent: SubEvent) => void;
  onUpdate: (id: string, data: Partial<SubEvent>) => void;
  onDelete: (id: string) => void;
}

export function SubEventDialog({
  open,
  onOpenChange,
  parentEvent,
  subEvents,
  professionals,
  allEvents = [],
  assignments,
  onAdd,
  onUpdate,
  onDelete,
}: SubEventDialogProps) {
  const event = parentEvent; // Alias to keep internal logic simple
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<SubEventType>("Ensaio");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedProfs, setSelectedProfs] = useState<string[]>([]);

  const getDefaultType = (): SubEventType => {
    if (event.event_type === "Casamento") return "Pré-Wedding";
    if (event.event_type === "Debutante" || event.event_type === "Aniversário") return "Ensaio";
    return "Ensaio";
  };

  const handleOpenForm = () => {
    setType(getDefaultType());
    setDate("");
    setStartTime("");
    setEndTime("");
    setLocation("");
    setNotes("");
    setSelectedProfs([]);
    setShowForm(true);
  };

  const toggleProf = (profId: string) => {
    setSelectedProfs((prev) =>
      prev.includes(profId) ? prev.filter((id) => id !== profId) : [...prev, profId]
    );
  };

  const handleSubmit = () => {
    if (!date || !startTime) return;

    const subEvent: SubEvent = {
      id: crypto.randomUUID(),
      parent_event_id: event.id,
      type,
      date,
      start_time: startTime,
      end_time: endTime || undefined,
      location,
      notes: notes || undefined,
      completed: false,
      assigned_professionals: selectedProfs.length > 0 ? selectedProfs : undefined,
    };

    onAdd(subEvent);
    setShowForm(false);
  };

  // Conflict detection: find what a professional has on a given date
  const getConflictsForProf = (profId: string, targetDate: string, excludeSubId?: string) => {
    const conflicts: string[] = [];

    // Check main events via assignments
    assignments
      .filter((a) => a.professional_id === profId)
      .forEach((a) => {
        const ev = allEvents.find((e) => e.id === a.event_id);
        if (ev && ev.event_date === targetDate) {
          conflicts.push(`${ev.event_type} - ${ev.client_name} (${ev.coverage_start_time})`);
        }
      });

    // Check other sub-events
    subEvents
      .filter((s) => s.id !== excludeSubId && s.date === targetDate && !s.completed)
      .forEach((s) => {
        if (s.assigned_professionals?.includes(profId)) {
          const parent = allEvents.find((e) => e.id === s.parent_event_id);
          conflicts.push(`${s.type} - ${parent?.client_name || "?"} (${s.start_time})`);
        }
      });

    return conflicts;
  };

  const eventSubEvents = subEvents
    .filter((s) => s.parent_event_id === event.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  const formatDate = (dateStr: string) => {
    try {
      const parsed = parse(dateStr, "yyyy-MM-dd", new Date());
      return format(parsed, "EEE, dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const toggleSubProf = (subId: string, profId: string, currentProfs: string[]) => {
    const updated = currentProfs.includes(profId)
      ? currentProfs.filter((id) => id !== profId)
      : [...currentProfs, profId];
    onUpdate(subId, { assigned_professionals: updated.length > 0 ? updated : undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            📸 Ensaios & Sub-eventos
            <Badge variant="outline" className="text-xs font-normal">
              {event.client_name}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Existing sub-events */}
        {eventSubEvents.length > 0 && (
          <div className="space-y-2">
            {eventSubEvents.map((sub) => {
              const assignedProfs = sub.assigned_professionals || [];
              return (
                <div
                  key={sub.id}
                  className={cn(
                    "rounded-lg border p-3 transition-colors",
                    sub.completed
                      ? "border-success/30 bg-success/5"
                      : "border-border bg-card"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{SUB_EVENT_ICONS[sub.type]}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {sub.type}
                          {sub.completed && (
                            <span className="text-success ml-1 text-xs">✓ Realizado</span>
                          )}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(sub.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {sub.start_time}
                            {sub.end_time && ` — ${sub.end_time}`}
                          </span>
                        </div>
                        {sub.location && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {sub.location}
                          </p>
                        )}
                        {sub.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">{sub.notes}</p>
                        )}
                        {/* Assigned professionals */}
                        {assignedProfs.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap mt-1">
                            <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                            {assignedProfs.map((pId) => {
                              const prof = professionals.find((p) => p.id === pId);
                              return prof ? (
                                <Badge key={pId} variant="secondary" className="text-[10px] gap-0.5">
                                  {prof.name}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!sub.completed && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-success hover:text-success"
                          onClick={() => onUpdate(sub.id, { completed: true })}
                          title="Marcar como realizado"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (window.confirm("Excluir este sub-evento?")) onDelete(sub.id);
                        }}
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Quick professional toggle for existing sub-events */}
                  {!sub.completed && professionals.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                        <Users className="h-3 w-3" /> Equipe:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {professionals.map((prof) => {
                          const isAssigned = assignedProfs.includes(prof.id);
                          const conflicts = getConflictsForProf(prof.id, sub.date, sub.id);
                          const hasConflict = conflicts.length > 0;
                          return (
                            <div key={prof.id} className="flex flex-col">
                              <button
                                onClick={() => toggleSubProf(sub.id, prof.id, assignedProfs)}
                                className={cn(
                                  "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                                  isAssigned && hasConflict
                                    ? "bg-warning/15 border-warning/40 text-warning font-medium"
                                    : isAssigned
                                      ? "bg-primary/15 border-primary/40 text-primary font-medium"
                                      : hasConflict
                                        ? "bg-muted/50 border-warning/30 text-muted-foreground hover:border-warning/50"
                                        : "bg-muted/50 border-border text-muted-foreground hover:border-primary/30"
                                )}
                                title={hasConflict ? `⚠️ Conflito: ${conflicts.join(", ")}` : ""}
                              >
                                {isAssigned ? "✓ " : ""}{hasConflict ? "⚠ " : ""}{prof.name}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* New sub-event form */}
        {showForm ? (
          <div className="space-y-3 border-t border-border pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={type} onValueChange={(v) => setType(v as SubEventType)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUB_EVENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {SUB_EVENT_ICONS[t]} {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Data *</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Hora início *</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Hora fim</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Local</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Local do ensaio..."
                className="h-8 text-sm"
              />
            </div>

            {/* Professional selection */}
            {professionals.length > 0 && (
              <div>
                <Label className="text-xs flex items-center gap-1">
                  <Users className="h-3 w-3" /> Profissionais
                </Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {professionals.map((prof) => {
                    const conflicts = date ? getConflictsForProf(prof.id, date) : [];
                    const hasConflict = conflicts.length > 0;
                    const isSelected = selectedProfs.includes(prof.id);
                    return (
                      <label
                        key={prof.id}
                        className={cn(
                          "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors",
                          isSelected && hasConflict
                            ? "bg-warning/15 border-warning/40 text-warning font-medium"
                            : isSelected
                              ? "bg-primary/15 border-primary/40 text-primary font-medium"
                              : hasConflict
                                ? "bg-muted/50 border-warning/30 text-muted-foreground"
                                : "bg-muted/50 border-border text-muted-foreground hover:border-primary/30"
                        )}
                        title={hasConflict ? `⚠️ Conflito: ${conflicts.join(", ")}` : ""}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleProf(prof.id)}
                          className="h-3.5 w-3.5"
                        />
                        {hasConflict && <AlertTriangle className="h-3 w-3 text-warning" />}
                        {prof.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalhes, referências..."
                className="text-sm min-h-[60px]"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmit} disabled={!date || !startTime} className="flex-1">
                Agendar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2 gap-2"
            onClick={handleOpenForm}
          >
            <Calendar className="h-4 w-4" />
            Agendar {event.event_type === "Casamento" ? "Pré-Wedding / Ensaio" : "Ensaio"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
