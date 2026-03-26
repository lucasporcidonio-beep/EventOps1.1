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
import { getApiUrl, apiFetch } from "@/lib/api";
import { toast } from "sonner";

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [checklists, setChecklists] = useState<ConfirmationChecklist[]>([]);
  const [subEvents, setSubEvents] = useState<SubEvent[]>([]);
  const [expenses, setExpenses] = useState<EventExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const apiUrl = getApiUrl();


  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [eRes, cRes, pRes, aRes, chRes, sRes, exRes] = await Promise.all([
        apiFetch(`${apiUrl}/events`),
        apiFetch(`${apiUrl}/contracts`),
        apiFetch(`${apiUrl}/professionals`),
        apiFetch(`${apiUrl}/assignments`),
        apiFetch(`${apiUrl}/checklists`),
        apiFetch(`${apiUrl}/sub_events`),
        apiFetch(`${apiUrl}/expenses`),
      ]);

      if (!eRes.ok) throw new Error("Failed to fetch events");

      const rawEvents = await eRes.json();
      const validEvents = Array.isArray(rawEvents) ? rawEvents.map((e: any) => ({
        ...e,
        event_date: e.event_date || "", // Ensure string
        coverage_start_time: e.coverage_start_time || "",
        client_name: e.client_name || "Sem Nome",
        main_service: e.main_service || "Serviço",
        additional_services: Array.isArray(e.additional_services) ? e.additional_services : [],
        operational_status: e.operational_status || "Planejado",
        confirmation_status: e.confirmation_status || "Aguardando",
      })).filter(e => e.id && e.event_date) : []; // Filter out events without ID or Date

      setEvents(validEvents);
      // setEvents(await eRes.json()); // Replaced by above
      setContracts(await cRes.json());
      setProfessionals(await pRes.json());
      setAssignments(await aRes.json());
      setChecklists(await chRes.json());
      setSubEvents(await sRes.json());
      setExpenses(await exRes.json());
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Erro ao conectar com servidor. Verifique se ele está rodando.");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchData();
    // Auto-refresh a cada 30 segundos (não sobrescreve dados locais recém-salvos)
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // --- CRUD HELPERS ---
  // Using optimistic updates for better UX would be complex here without a library like React Query or SWR.
  // For simplicity and reliability in this refactor, we will do the request then update state locally if successful.

  const addEvent = useCallback(async (event: Event) => {
    try {
      // 1. Create Event
      await apiFetch(`${apiUrl}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });

      // 2. Create related initial data (contract, checklist, default expense)
      const contract = { id: crypto.randomUUID(), event_id: event.id, total_value: event.package_value || 0, total_paid: 0, entry_payment_value: 0, entry_payment_confirmed: false, payment_history: [] };
      const checklist = { id: crypto.randomUUID(), event_id: event.id, date_confirmed: false, time_confirmed: false, location_confirmed: false, contact_confirmed: false, authorized_event: false };
      const expense = { id: crypto.randomUUID(), event_id: event.id, category: "Deslocamento", description: "Deslocamento padrão", value: 50, date: new Date().toISOString().split("T")[0] };

      await Promise.all([
        apiFetch(`${apiUrl}/contracts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(contract) }),
        apiFetch(`${apiUrl}/checklists`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(checklist) }),
        apiFetch(`${apiUrl}/expenses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(expense) }),
      ]);

      // Update local state
      setEvents(p => [...p, event]);
      setContracts(p => [...p, contract as any]);
      setChecklists(p => [...p, checklist as any]);
      setExpenses(p => [...p, expense as any]);
      toast.success("Evento criado com sucesso!");
    } catch (err) {
      toast.error("Erro ao criar evento.");
    }
  }, [apiUrl]);

  const updateEvent = useCallback(async (id: string, data: Partial<Event>) => {
    try {
      await apiFetch(`${apiUrl}/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setEvents(p => p.map(e => e.id === id ? { ...e, ...data } : e));
    } catch (err) { toast.error("Erro ao atualizar evento."); }
  }, [apiUrl]);

  const deleteEvent = useCallback(async (id: string) => {
    try {
      await apiFetch(`${apiUrl}/events/${id}`, { method: "DELETE" });
      setEvents(p => p.filter(e => e.id !== id));
      // Handled by ON DELETE CASCADE in DB for related tables, but update local state
      setContracts(p => p.filter(c => c.event_id !== id));
      setAssignments(p => p.filter(a => a.event_id !== id));
      setSubEvents(p => p.filter(s => s.parent_event_id !== id));
      setExpenses(p => p.filter(e => e.event_id !== id));
      setChecklists(p => p.filter(c => c.event_id !== id));
      toast.success("Evento excluído.");
    } catch (err) { toast.error("Erro ao excluir evento."); }
  }, [apiUrl]);

  // CONTRACTS
  const updateContract = useCallback(async (eventId: string, data: Partial<Contract>) => {
    try {
      // Use event_id-based route — contract id may be null from DB restore. Backend now handles UPSERT.
      const res = await apiFetch(`/contracts/by-event/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        toast.error(`Erro ao salvar: ${errBody.error || res.status}`);
        return;
      }
      
      const resData = await res.json();
      
      setContracts(p => {
        const exists = p.find(c => c.event_id === eventId);
        if (exists) {
          return p.map(c => c.event_id === eventId ? { ...c, ...data } : c);
        } else {
          // It was inserted by the backend Upsert. Create a new contract object in local state.
          const newContract = {
            id: resData.id || crypto.randomUUID(),
            event_id: eventId,
            total_value: data.total_value || 0,
            total_paid: data.total_paid || 0,
            entry_payment_value: data.entry_payment_value || 0,
            entry_payment_confirmed: data.entry_payment_confirmed || false,
            payment_history: data.payment_history || [],
            signed: data.signed || false,
            ...data
          };
          return [...p, newContract as Contract];
        }
      });
    } catch (err) {
      toast.error("Servidor inacessível. Verifique se está rodando na porta 3000.");
    }
  }, []);

  // PROFESSIONALS
  const addProfessional = useCallback(async (prof: Professional) => {
    try {
      await apiFetch(`${apiUrl}/professionals`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(prof) });
      setProfessionals(p => [...p, prof]);
      toast.success("Profissional adicionado.");
    } catch (err) { toast.error("Erro ao adicionar profissional."); }
  }, [apiUrl]);

  const removeProfessional = useCallback(async (id: string) => {
    try {
      await apiFetch(`${apiUrl}/professionals/${id}`, { method: "DELETE" });
      setProfessionals(p => p.filter(prof => prof.id !== id));
      setAssignments(p => p.filter(a => a.professional_id !== id));
    } catch (err) { toast.error("Erro ao remover profissional."); }
  }, [apiUrl]);

  // ASSIGNMENTS
  const assignProfessional = useCallback(async (assignment: TeamAssignment) => {
    try {
      // Check if exists logic moved to server ideally, but here we do frontend check/update
      // Assuming clean assignment
      // 1. Check if assistente trying to be primary (frontend check)
      if (assignment.role === "Assistente" && assignment.primary) return false;

      // 2. Handle Primary switch (backend doesn't auto-handle logic, so we might need multiple calls or smarter backend)
      // simple approach: just save this assignment.

      // Check existing
      const existing = assignments.find(a => a.event_id === assignment.event_id && a.professional_id === assignment.professional_id);

      if (existing) {
        // Update
        await apiFetch(`${apiUrl}/assignments/${existing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(assignment) });
        setAssignments(p => p.map(a => a.id === existing.id ? assignment : a));
      } else {
        // Create
        await apiFetch(`${apiUrl}/assignments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(assignment) });
        setAssignments(p => [...p, assignment]);
      }
      return true;
    } catch (err) { toast.error("Erro ao atribuir profissional."); return false; }
  }, [apiUrl, assignments]);

  const updateAssignment = useCallback(async (eventId: string, profId: string, data: Partial<TeamAssignment>) => {
    const assignment = assignments.find(a => a.event_id === eventId && a.professional_id === profId);
    if (!assignment) return;
    try {
      await apiFetch(`${apiUrl}/assignments/${assignment.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      setAssignments(p => p.map(a => a.id === assignment.id ? { ...a, ...data } : a));
    } catch (err) { toast.error("Erro ao atualizar atribuição."); }
  }, [apiUrl, assignments]);

  const removeAssignment = useCallback(async (eventId: string, profId: string) => {
    const assignment = assignments.find(a => a.event_id === eventId && a.professional_id === profId);
    if (!assignment) return;
    try {
      await apiFetch(`${apiUrl}/assignments/${assignment.id}`, { method: "DELETE" });
      setAssignments(p => p.filter(a => a.id !== assignment.id));
    } catch (err) { toast.error("Erro ao remover atribuição."); }
  }, [apiUrl, assignments]);

  // CHECKLISTS
  const updateChecklist = useCallback(async (eventId: string, data: Partial<ConfirmationChecklist>) => {
    const checklist = checklists.find(c => c.event_id === eventId);
    if (!checklist) return;
    try {
      await apiFetch(`${apiUrl}/checklists/${checklist.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      setChecklists(p => p.map(c => c.id === checklist.id ? { ...c, ...data } : c));
    } catch (err) { toast.error("Erro ao atualizar checklist."); }
  }, [apiUrl, checklists]);

  // SUBEVENTS
  const addSubEvent = useCallback(async (subEvent: SubEvent) => {
    try {
      await apiFetch(`${apiUrl}/sub_events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subEvent) });
      setSubEvents(p => [...p, subEvent]);
    } catch (err) { toast.error("Erro ao criar sub-evento."); }
  }, [apiUrl]);

  const updateSubEvent = useCallback(async (id: string, data: Partial<SubEvent>) => {
    try {
      await apiFetch(`${apiUrl}/sub_events/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      setSubEvents(p => p.map(s => s.id === id ? { ...s, ...data } : s));
    } catch (err) { toast.error("Erro ao atualizar sub-evento."); }
  }, [apiUrl]);

  const deleteSubEvent = useCallback(async (id: string) => {
    try {
      await apiFetch(`${apiUrl}/sub_events/${id}`, { method: "DELETE" });
      setSubEvents(p => p.filter(s => s.id !== id));
    } catch (err) { toast.error("Erro ao excluir sub-evento."); }
  }, [apiUrl]);

  // EXPENSES
  const addExpense = useCallback(async (expense: EventExpense) => {
    try {
      await apiFetch(`${apiUrl}/expenses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(expense) });
      setExpenses(p => [...p, expense]);
    } catch (err) { toast.error("Erro ao adicionar despesa."); }
  }, [apiUrl]);

  const updateExpense = useCallback(async (id: string, data: Partial<EventExpense>) => {
    try {
      await apiFetch(`${apiUrl}/expenses/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      setExpenses(p => p.map(e => e.id === id ? { ...e, ...data } : e));
    } catch (err) { toast.error("Erro ao atualizar despesa."); }
  }, [apiUrl]);

  const removeExpense = useCallback(async (id: string) => {
    try {
      await apiFetch(`${apiUrl}/expenses/${id}`, { method: "DELETE" });
      setExpenses(p => p.filter(e => e.id !== id));
    } catch (err) { toast.error("Erro ao remover despesa."); }
  }, [apiUrl]);

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

  // Sort events: by date, then by start time, exclude finalized
  const sortedActiveEvents = [...events]
    .filter((e) => e.operational_status !== "Finalizado")
    .sort((a, b) => {
      const dateComp = a.event_date.localeCompare(b.event_date);
      if (dateComp !== 0) return dateComp;
      return a.coverage_start_time.localeCompare(b.coverage_start_time);
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
