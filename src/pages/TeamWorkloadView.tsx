import { useMemo } from "react";
import type { Event, Professional, TeamAssignment } from "@/types";
import { User, AlertTriangle, CalendarDays } from "lucide-react";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TeamWorkloadViewProps {
  events: Event[];
  professionals: Professional[];
  assignments: TeamAssignment[];
}

export function TeamWorkloadView({ events, professionals, assignments }: TeamWorkloadViewProps) {
  // Pre-calculate workloads and conflicts
  const teamWorkload = useMemo(() => {
    const workload = new Map<string, Event[]>();
    professionals.forEach(p => workload.set(p.id, []));

    const activeEvents = events.filter(e => e.operational_status !== "Finalizado");

    activeEvents.forEach(event => {
      const eventAssignments = assignments.filter(a => a.event_id === event.id);
      eventAssignments.forEach(a => {
        if (!workload.has(a.professional_id)) workload.set(a.professional_id, []);
        workload.get(a.professional_id)!.push(event);
      });
    });

    return workload;
  }, [events, professionals, assignments]);

  const conflictsMap = useMemo(() => {
    const cMap = new Map<string, Set<string>>();
    // For each professional, check if they have overlapping events on the same date
    teamWorkload.forEach((profEvents, profId) => {
        const dateMap = new Set<string>();
        profEvents.forEach(e => {
            if (dateMap.has(e.event_date)) {
                // Conflict!
                if (!cMap.has(e.id)) cMap.set(e.id, new Set());
                cMap.get(e.id)!.add(profId);
                // Also need to mark the other events on this date as conflicts
                profEvents.filter(other => other.event_date === e.event_date).forEach(o => {
                    if (!cMap.has(o.id)) cMap.set(o.id, new Set());
                    cMap.get(o.id)!.add(profId);
                });
            } else {
                dateMap.add(e.event_date);
            }
        });
    });
    return cMap;
  }, [teamWorkload]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {professionals.sort((a,b) => a.name.localeCompare(b.name)).map(pro => {
          const proEvents = teamWorkload.get(pro.id) || [];
          
          let hasActiveConflict = false;
          proEvents.forEach(e => {
              if (conflictsMap.get(e.id)?.has(pro.id)) hasActiveConflict = true;
          });

          return (
              <div key={pro.id} className={`bg-card border rounded-xl overflow-hidden shadow-sm ${hasActiveConflict ? 'border-destructive/50' : 'border-border'}`}>
                  <div className={`p-3 border-b flex items-center justify-between ${hasActiveConflict ? 'bg-destructive/10 border-destructive/20' : 'bg-muted/30 border-border'}`}>
                      <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-full ${hasActiveConflict ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'}`}>
                              <User className="w-4 h-4" />
                          </div>
                          <div>
                              <h3 className="font-semibold text-foreground text-sm flex items-center gap-1">{pro.name}</h3>
                              <p className="text-[10px] uppercase font-bold text-muted-foreground">{proEvents.length} Eventos</p>
                          </div>
                      </div>
                      {hasActiveConflict && <AlertTriangle className="w-5 h-5 text-destructive animate-pulse" />}
                  </div>
                  
                  <div className="p-2 space-y-2 max-h-[400px] overflow-y-auto bg-card">
                      {proEvents.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-6 text-muted-foreground text-center">
                              <CalendarDays className="w-8 h-8 opacity-20 mb-2" />
                              <p className="text-xs italic">Nenhum evento agendado</p>
                          </div>
                      ) : (
                          proEvents
                          .sort((a,b) => a.event_date.localeCompare(b.event_date))
                          .map(e => {
                              const isConflicting = conflictsMap.get(e.id)?.has(pro.id);
                              
                              let dateFmt = e.event_date;
                              try {
                                dateFmt = format(parse(e.event_date, 'yyyy-MM-dd', new Date()), "dd/MM/yyyy");
                              } catch(err) {}

                              return (
                                  <div key={e.id} className={`p-2.5 rounded-lg border text-sm relative ${isConflicting ? 'bg-destructive/5 border-destructive/30' : 'bg-muted/30 border-border hover:bg-muted/50'}`}>
                                      <div className="flex justify-between items-start mb-1">
                                          <span className={`text-[11px] font-bold ${isConflicting ? 'text-destructive' : 'text-primary'}`}>{dateFmt}</span>
                                          <span className={`text-[11px] font-mono ${isConflicting ? 'text-destructive' : 'text-muted-foreground'}`}>{e.coverage_start_time} - {e.coverage_end_time}</span>
                                      </div>
                                      <p className="font-medium text-xs text-foreground truncate">{e.client_name}</p>
                                      <p className="text-[10px] text-muted-foreground mt-0.5">{e.ceremony_location || e.reception_location || "Local Pendente"}</p>
                                      
                                      {isConflicting && (
                                          <div className="mt-2 text-[10px] text-destructive bg-destructive/10 p-1.5 rounded flex items-center gap-1.5 font-bold">
                                              <AlertTriangle className="w-3 h-3"/> Conflito de Data!
                                          </div>
                                      )}
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
