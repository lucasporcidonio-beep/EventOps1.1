import { useState, useCallback, useEffect } from "react";
import type {
  Event,
  Contract,
  Professional,
  TeamAssignment,
  ConfirmationChecklist,
  SubEvent,
  EventExpense,
} from "@/types";
import { isFirebaseConfigured } from "@/lib/firebase";
import * as firebaseService from "@/services/firebaseService";
import { generateSeedEvents } from "@/data/seedEvents";
import { toast } from "sonner";

// Chaves para fallback local no localStorage quando o Firebase não estiver configurado
const STORAGE_KEYS = {
  EVENTS: "eventops_events",
  CONTRACTS: "eventops_contracts",
  PROFESSIONALS: "eventops_professionals",
  ASSIGNMENTS: "eventops_assignments",
  CHECKLISTS: "eventops_checklists",
  SUB_EVENTS: "eventops_sub_events",
  EXPENSES: "eventops_expenses",
};

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [checklists, setChecklists] = useState<ConfirmationChecklist[]>([]);
  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);
  const [expenses, setExpenses] = useState<EventExpense[]>([]);
  const [loading, setLoading] = useState(true);

  // Inicializa dados (Firebase em tempo real ou fallback local)
  useEffect(() => {
    if (isFirebaseConfigured) {
      setLoading(true);

      // Subscreve a todas as coleções do Firestore em tempo real (onSnapshot)
      const unsubEvents = firebaseService.subscribeToEvents((data) => {
        setEvents(data);
        setLoading(false);
      });

      const unsubContracts = firebaseService.subscribeToContracts(setContracts);
      const unsubProfessionals = firebaseService.subscribeToProfessionals(setProfessionals);
      const unsubAssignments = firebaseService.subscribeToAssignments(setAssignments);
      const unsubChecklists = firebaseService.subscribeToChecklists(setChecklists);
      const unsubSubEvents = firebaseService.subscribeToSubEvents(setSubEvents);
      const unsubExpenses = firebaseService.subscribeToExpenses(setExpenses);

      return () => {
        unsubEvents();
        unsubContracts();
        unsubProfessionals();
        unsubAssignments();
        unsubChecklists();
        unsubSubEvents();
        unsubExpenses();
      };
    } else {
      // Modo Local / Demo via localStorage
      try {
        const storedEvents = localStorage.getItem(STORAGE_KEYS.EVENTS);
        if (storedEvents) {
          setEvents(JSON.parse(storedEvents));
          setContracts(JSON.parse(localStorage.getItem(STORAGE_KEYS.CONTRACTS) || "[]"));
          setProfessionals(JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFESSIONALS) || "[]"));
          setAssignments(JSON.parse(localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS) || "[]"));
          setChecklists(JSON.parse(localStorage.getItem(STORAGE_KEYS.CHECKLISTS) || "[]"));
          setSubEvents(JSON.parse(localStorage.getItem(STORAGE_KEYS.SUB_EVENTS) || "[]"));
          setExpenses(JSON.parse(localStorage.getItem(STORAGE_KEYS.EXPENSES) || "[]"));
        } else {
          // Inicializa com dados de seed
          const seed = generateSeedEvents();
          setEvents(seed.events);
          setContracts(seed.contracts);
          setProfessionals(seed.professionals);
          setChecklists(seed.checklists);

          localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(seed.events));
          localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(seed.contracts));
          localStorage.setItem(STORAGE_KEYS.PROFESSIONALS, JSON.stringify(seed.professionals));
          localStorage.setItem(STORAGE_KEYS.CHECKLISTS, JSON.stringify(seed.checklists));
        }
      } catch (err) {
        console.error("Erro ao carregar dados locais:", err);
      } finally {
        setLoading(false);
      }
    }
  }, []);

  // Helper para persistir alterações no localStorage quando em modo demo
  const saveToLocal = (key: string, data: any) => {
    if (!isFirebaseConfigured) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  };

  // --- CRUD: EVENTOS ---
  const addEvent = useCallback(
    async (event: Event) => {
      const contract: Contract = {
        id: crypto.randomUUID(),
        event_id: event.id,
        total_value: event.package_value || 0,
        total_paid: 0,
        entry_payment_value: 0,
        entry_payment_confirmed: false,
        payment_history: [],
        signed: false,
      };

      const checklist: ConfirmationChecklist = {
        id: crypto.randomUUID(),
        event_id: event.id,
        event_date_confirmed: false,
        coverage_time_confirmed: false,
        locations_confirmed: false,
        contact_name: event.client_name || "",
        contact_phone: event.client_phone || "",
        authorized: false,
      };

      const expense: EventExpense = {
        id: crypto.randomUUID(),
        event_id: event.id,
        category: "Deslocamento",
        description: "Deslocamento padrão",
        value: 50,
        date: new Date().toISOString().split("T")[0],
      };

      try {
        if (isFirebaseConfigured) {
          await firebaseService.createEventWithDefaults(event, contract, checklist, expense);
        } else {
          setEvents((prev) => {
            const next = [...prev, event];
            saveToLocal(STORAGE_KEYS.EVENTS, next);
            return next;
          });
          setContracts((prev) => {
            const next = [...prev, contract];
            saveToLocal(STORAGE_KEYS.CONTRACTS, next);
            return next;
          });
          setChecklists((prev) => {
            const next = [...prev, checklist];
            saveToLocal(STORAGE_KEYS.CHECKLISTS, next);
            return next;
          });
          setExpenses((prev) => {
            const next = [...prev, expense];
            saveToLocal(STORAGE_KEYS.EXPENSES, next);
            return next;
          });
        }
        toast.success("Evento criado com sucesso!");
      } catch (err) {
        console.error("Erro ao criar evento:", err);
        toast.error("Erro ao criar evento.");
      }
    },
    []
  );

  const updateEvent = useCallback(
    async (id: string, data: Partial<Event>) => {
      try {
        if (isFirebaseConfigured) {
          await firebaseService.updateEventDoc(id, data);
        } else {
          setEvents((prev) => {
            const next = prev.map((e) => (e.id === id ? { ...e, ...data } : e));
            saveToLocal(STORAGE_KEYS.EVENTS, next);
            return next;
          });
        }
        toast.success("Evento atualizado!");
      } catch (err) {
        console.error("Erro ao atualizar evento:", err);
        toast.error("Erro ao atualizar evento.");
      }
    },
    []
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      try {
        if (isFirebaseConfigured) {
          await firebaseService.deleteEventDoc(id);
        } else {
          setEvents((p) => {
            const next = p.filter((e) => e.id !== id);
            saveToLocal(STORAGE_KEYS.EVENTS, next);
            return next;
          });
          setContracts((p) => {
            const next = p.filter((c) => c.event_id !== id);
            saveToLocal(STORAGE_KEYS.CONTRACTS, next);
            return next;
          });
          setAssignments((p) => {
            const next = p.filter((a) => a.event_id !== id);
            saveToLocal(STORAGE_KEYS.ASSIGNMENTS, next);
            return next;
          });
          setSubEvents((p) => {
            const next = p.filter((s) => s.parent_event_id !== id);
            saveToLocal(STORAGE_KEYS.SUB_EVENTS, next);
            return next;
          });
          setExpenses((p) => {
            const next = p.filter((e) => e.event_id !== id);
            saveToLocal(STORAGE_KEYS.EXPENSES, next);
            return next;
          });
          setChecklists((p) => {
            const next = p.filter((c) => c.event_id !== id);
            saveToLocal(STORAGE_KEYS.CHECKLISTS, next);
            return next;
          });
        }
        toast.success("Evento excluído.");
      } catch (err) {
        console.error("Erro ao excluir evento:", err);
        toast.error("Erro ao excluir evento.");
      }
    },
    []
  );

  // --- CRUD: CONTRATOS ---
  const updateContract = useCallback(
    async (eventId: string, data: Partial<Contract & { generated_contract_text?: string }>) => {
      try {
        if (isFirebaseConfigured) {
          await firebaseService.upsertContractDoc(eventId, data);
        } else {
          setContracts((prev) => {
            const exists = prev.find((c) => c.event_id === eventId);
            let next: Contract[];
            if (exists) {
              next = prev.map((c) => (c.event_id === eventId ? { ...c, ...data } : c));
            } else {
              const newContract = {
                id: crypto.randomUUID(),
                event_id: eventId,
                total_value: data.total_value || 0,
                total_paid: data.total_paid || 0,
                entry_payment_value: data.entry_payment_value || 0,
                entry_payment_confirmed: data.entry_payment_confirmed || false,
                payment_history: data.payment_history || [],
                signed: data.signed || false,
                ...data,
              } as Contract;
              next = [...prev, newContract];
            }
            saveToLocal(STORAGE_KEYS.CONTRACTS, next);
            return next;
          });
        }
        toast.success("Contrato salvo com sucesso!");
      } catch (err) {
        console.error("Erro ao atualizar contrato:", err);
        toast.error("Erro ao salvar contrato.");
      }
    },
    []
  );

  // --- CRUD: PROFISSIONAIS ---
  const addProfessional = useCallback(
    async (prof: Professional) => {
      try {
        if (isFirebaseConfigured) {
          await firebaseService.addProfessionalDoc(prof);
        } else {
          setProfessionals((p) => {
            const next = [...p, prof];
            saveToLocal(STORAGE_KEYS.PROFESSIONALS, next);
            return next;
          });
        }
        toast.success("Profissional adicionado.");
      } catch (err) {
        console.error("Erro ao adicionar profissional:", err);
        toast.error("Erro ao adicionar profissional.");
      }
    },
    []
  );

  const removeProfessional = useCallback(
    async (id: string) => {
      try {
        if (isFirebaseConfigured) {
          await firebaseService.deleteProfessionalDoc(id);
        } else {
          setProfessionals((p) => {
            const next = p.filter((prof) => prof.id !== id);
            saveToLocal(STORAGE_KEYS.PROFESSIONALS, next);
            return next;
          });
          setAssignments((p) => {
            const next = p.filter((a) => a.professional_id !== id);
            saveToLocal(STORAGE_KEYS.ASSIGNMENTS, next);
            return next;
          });
        }
        toast.success("Profissional removido.");
      } catch (err) {
        console.error("Erro ao remover profissional:", err);
        toast.error("Erro ao remover profissional.");
      }
    },
    []
  );

  // --- CRUD: ATRIBUIÇÕES (ASSIGNMENTS) ---
  const assignProfessional = useCallback(
    async (assignment: TeamAssignment) => {
      try {
        if (assignment.role === "Assistente" && assignment.primary) return false;

        if (isFirebaseConfigured) {
          await firebaseService.saveAssignmentDoc(assignment);
        } else {
          setAssignments((p) => {
            const existingIndex = p.findIndex(
              (a) => a.event_id === assignment.event_id && a.professional_id === assignment.professional_id
            );
            let next: TeamAssignment[];
            if (existingIndex >= 0) {
              next = p.map((a, i) => (i === existingIndex ? assignment : a));
            } else {
              next = [...p, assignment];
            }
            saveToLocal(STORAGE_KEYS.ASSIGNMENTS, next);
            return next;
          });
        }
        return true;
      } catch (err) {
        console.error("Erro ao atribuir profissional:", err);
        toast.error("Erro ao atribuir profissional.");
        return false;
      }
    },
    []
  );

  const updateAssignment = useCallback(
    async (eventId: string, profId: string, data: Partial<TeamAssignment>) => {
      const assignment = assignments.find((a) => a.event_id === eventId && a.professional_id === profId);
      if (!assignment) return;
      try {
        if (isFirebaseConfigured) {
          await firebaseService.updateAssignmentDoc(assignment.id, data);
        } else {
          setAssignments((p) => {
            const next = p.map((a) => (a.id === assignment.id ? { ...a, ...data } : a));
            saveToLocal(STORAGE_KEYS.ASSIGNMENTS, next);
            return next;
          });
        }
      } catch (err) {
        console.error("Erro ao atualizar atribuição:", err);
        toast.error("Erro ao atualizar atribuição.");
      }
    },
    [assignments]
  );

  const removeAssignment = useCallback(
    async (eventId: string, profId: string) => {
      const assignment = assignments.find((a) => a.event_id === eventId && a.professional_id === profId);
      if (!assignment) return;
      try {
        if (isFirebaseConfigured) {
          await firebaseService.removeAssignmentDoc(assignment.id);
        } else {
          setAssignments((p) => {
            const next = p.filter((a) => a.id !== assignment.id);
            saveToLocal(STORAGE_KEYS.ASSIGNMENTS, next);
            return next;
          });
        }
      } catch (err) {
        console.error("Erro ao remover atribuição:", err);
        toast.error("Erro ao remover atribuição.");
      }
    },
    [assignments]
  );

  // --- CRUD: CHECKLISTS ---
  const updateChecklist = useCallback(
    async (eventId: string, data: Partial<ConfirmationChecklist>) => {
      const checklist = checklists.find((c) => c.event_id === eventId);
      if (!checklist) return;
      try {
        if (isFirebaseConfigured) {
          await firebaseService.updateChecklistDoc(checklist.id, data);
        } else {
          setChecklists((p) => {
            const next = p.map((c) => (c.id === checklist.id ? { ...c, ...data } : c));
            saveToLocal(STORAGE_KEYS.CHECKLISTS, next);
            return next;
          });
        }
      } catch (err) {
        console.error("Erro ao atualizar checklist:", err);
        toast.error("Erro ao atualizar checklist.");
      }
    },
    [checklists]
  );

  // --- CRUD: SUB-EVENTOS ---
  const addSubEvent = useCallback(
    async (subEvent: SubEvent) => {
      try {
        if (isFirebaseConfigured) {
          await firebaseService.addSubEventDoc(subEvent);
        } else {
          setSubEvents((p) => {
            const next = [...p, subEvent];
            saveToLocal(STORAGE_KEYS.SUB_EVENTS, next);
            return next;
          });
        }
        toast.success("Sub-evento criado.");
      } catch (err) {
        console.error("Erro ao criar sub-evento:", err);
        toast.error("Erro ao criar sub-evento.");
      }
    },
    []
  );

  const updateSubEvent = useCallback(
    async (id: string, data: Partial<SubEvent>) => {
      try {
        if (isFirebaseConfigured) {
          await firebaseService.updateSubEventDoc(id, data);
        } else {
          setSubEvents((p) => {
            const next = p.map((s) => (s.id === id ? { ...s, ...data } : s));
            saveToLocal(STORAGE_KEYS.SUB_EVENTS, next);
            return next;
          });
        }
      } catch (err) {
        console.error("Erro ao atualizar sub-evento:", err);
        toast.error("Erro ao atualizar sub-evento.");
      }
    },
    []
  );

  const deleteSubEvent = useCallback(
    async (id: string) => {
      try {
        if (isFirebaseConfigured) {
          await firebaseService.deleteSubEventDoc(id);
        } else {
          setSubEvents((p) => {
            const next = p.filter((s) => s.id !== id);
            saveToLocal(STORAGE_KEYS.SUB_EVENTS, next);
            return next;
          });
        }
        toast.success("Sub-evento excluído.");
      } catch (err) {
        console.error("Erro ao excluir sub-evento:", err);
        toast.error("Erro ao excluir sub-evento.");
      }
    },
    []
  );

  // --- CRUD: DESPESAS ---
  const addExpense = useCallback(
    async (expense: EventExpense) => {
      try {
        if (isFirebaseConfigured) {
          await firebaseService.addExpenseDoc(expense);
        } else {
          setExpenses((p) => {
            const next = [...p, expense];
            saveToLocal(STORAGE_KEYS.EXPENSES, next);
            return next;
          });
        }
        toast.success("Despesa adicionada.");
      } catch (err) {
        console.error("Erro ao adicionar despesa:", err);
        toast.error("Erro ao adicionar despesa.");
      }
    },
    []
  );

  const updateExpense = useCallback(
    async (id: string, data: Partial<EventExpense>) => {
      try {
        if (isFirebaseConfigured) {
          await firebaseService.addExpenseDoc({ id, ...data } as EventExpense);
        } else {
          setExpenses((p) => {
            const next = p.map((e) => (e.id === id ? { ...e, ...data } : e));
            saveToLocal(STORAGE_KEYS.EXPENSES, next);
            return next;
          });
        }
      } catch (err) {
        console.error("Erro ao atualizar despesa:", err);
        toast.error("Erro ao atualizar despesa.");
      }
    },
    []
  );

  const removeExpense = useCallback(
    async (id: string) => {
      try {
        if (isFirebaseConfigured) {
          await firebaseService.deleteExpenseDoc(id);
        } else {
          setExpenses((p) => {
            const next = p.filter((e) => e.id !== id);
            saveToLocal(STORAGE_KEYS.EXPENSES, next);
            return next;
          });
        }
        toast.success("Despesa removida.");
      } catch (err) {
        console.error("Erro ao remover despesa:", err);
        toast.error("Erro ao remover despesa.");
      }
    },
    []
  );

  const getConflicts = useCallback(
    (profId: string, eventId: string) => {
      const targetEvent = events.find((e) => e.id === eventId);
      if (!targetEvent) return [];

      const profEvents = assignments
        .filter((a) => a.professional_id === profId && a.event_id !== eventId)
        .map((a) => events.find((e) => e.id === a.event_id))
        .filter(Boolean) as Event[];

      return profEvents.filter((e) => e.event_date === targetEvent.event_date);
    },
    [events, assignments]
  );

  // Ordenação de eventos: por data, depois horário de início
  const sortedActiveEvents = [...events]
    .filter((e) => e.operational_status !== "Finalizado")
    .sort((a, b) => {
      const dateComp = (a.event_date || "").localeCompare(b.event_date || "");
      if (dateComp !== 0) return dateComp;
      return (a.coverage_start_time || "").localeCompare(b.coverage_start_time || "");
    });

  return {
    events,
    sortedActiveEvents,
    contracts,
    professionals,
    assignments,
    checklists,
    subEvents,
    expenses,
    loading,
    isFirebaseConfigured,
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
  };
}
