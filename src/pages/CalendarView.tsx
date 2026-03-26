import { useState, useMemo } from "react";
import type { Event, SubEvent } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { detectEventIcon } from "@/lib/eventTypeIcons";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const SUB_EVENT_ICONS: Record<string, string> = {
  "Ensaio": "📸",
  "Pré-Wedding": "💑",
  "Making Of": "🎬",
  "Outro": "📋",
};

interface CalendarViewProps {
  events: Event[];
  subEvents?: SubEvent[];
  onSelectEvent?: (event: Event) => void;
  onSelectSubEvent?: (parentEvent: Event) => void;
}

interface CalendarEntry {
  id: string;
  label: string;
  time?: string;
  icon: string;
  type: "event" | "sub";
  status?: string;
  completed?: boolean;
  onClick?: () => void;
}

export function CalendarView({ events, subEvents = [], onSelectEvent, onSelectSubEvent }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // Build a merged map of events + sub-events by date
  const entriesByDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();

    // Main events
    events.forEach((e) => {
      if (!e.event_date) return;
      const key = e.event_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({
        id: e.id,
        label: e.client_name,
        time: e.coverage_start_time,
        icon: detectEventIcon(e),
        type: "event",
        status: e.confirmation_status,
        onClick: () => onSelectEvent?.(e),
      });
    });

    // Sub-events
    subEvents.forEach((s) => {
      if (!s.date) return;
      const key = s.date;
      if (!map.has(key)) map.set(key, []);
      // Find parent event for label
      const parent = events.find((e) => e.id === s.parent_event_id);
      map.get(key)!.push({
        id: s.id,
        label: parent ? `${s.type} · ${parent.client_name}` : s.type,
        time: s.start_time,
        icon: SUB_EVENT_ICONS[s.type] || "📋",
        type: "sub",
        completed: s.completed,
        onClick: parent ? () => onSelectSubEvent?.(parent) : undefined,
      });
    });

    // Sort each day's entries by time
    map.forEach((entries) => {
      entries.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    });

    return map;
  }, [events, subEvents, onSelectEvent, onSelectSubEvent]);

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div>
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold text-foreground capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h2>
        <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week Headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {calendarDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayEntries = entriesByDate.get(dateStr) || [];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);

          return (
            <div
              key={dateStr}
              className={cn(
                "min-h-[100px] p-1.5 bg-card transition-colors",
                !inMonth && "bg-muted/50 opacity-40",
                today && "ring-1 ring-primary ring-inset"
              )}
            >
              <div className={cn(
                "text-xs font-medium mb-1",
                today ? "text-primary" : "text-muted-foreground"
              )}>
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {dayEntries.slice(0, 4).map((entry) => (
                  <button
                    key={entry.id}
                    onClick={entry.onClick}
                    className={cn(
                      "w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded truncate transition-colors",
                      entry.type === "event" ? (
                        entry.status === "Confirmado"
                          ? "bg-success/10 text-success hover:bg-success/20"
                          : entry.status === "Divergência"
                          ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                          : "bg-primary/10 text-primary hover:bg-primary/20"
                      ) : (
                        entry.completed
                          ? "bg-muted/50 text-muted-foreground line-through"
                          : "bg-accent/60 text-accent-foreground border border-dashed border-accent-foreground/20 hover:bg-accent"
                      )
                    )}
                  >
                    {entry.icon} {entry.time ? entry.time + " " : ""}
                    {entry.label}
                  </button>
                ))}
                {dayEntries.length > 4 && (
                  <p className="text-[10px] text-muted-foreground px-1">
                    +{dayEntries.length - 4} mais
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
