import type { Event, Contract, ConfirmationChecklist } from "@/types";

function id() {
  return crypto.randomUUID();
}

function makeEvent(partial: Partial<Event> & { client_name: string; event_date: string; event_type: Event["event_type"] }): Event {
  return {
    id: id(),
    event_type: partial.event_type,
    client_name: partial.client_name,
    client_phone: partial.client_phone || "",
    client_rg: partial.client_rg || "",
    client_birthdate: partial.client_birthdate || "",
    client_address: partial.client_address || "",
    event_date: partial.event_date,
    coverage_start_time: partial.coverage_start_time || "",
    coverage_end_time: partial.coverage_end_time || "",
    ceremony_location: partial.ceremony_location || "",
    reception_location: partial.reception_location || "",
    main_service: partial.main_service || "Fotografia",
    additional_services: partial.additional_services || [],
    operational_status: partial.operational_status || "Planejado",
    confirmation_status: partial.confirmation_status || "Aguardando",
    notes: partial.notes || "",
    debutante_name: partial.debutante_name || "",
    package_name: partial.package_name || "",
    package_value: partial.package_value || 0,
  };
}

export function generateSeedEvents(): { events: Event[]; contracts: Contract[]; checklists: ConfirmationChecklist[]; professionals: import("@/types").Professional[] } {
  const events: Event[] = [
    // FEVEREIRO 2026
    makeEvent({
      client_name: "Alessandra",
      event_type: "Outro",
      event_date: "2026-02-07",
      main_service: "Storymaker",
      notes: "Dia inteiro",
    }),
    makeEvent({
      client_name: "Karen",
      event_type: "Evento Religioso",
      event_date: "2026-02-08",
      coverage_start_time: "08:50",
      notes: "Batizado",
    }),
    makeEvent({
      client_name: "Alessandra",
      event_type: "Outro",
      event_date: "2026-02-14",
      main_service: "Storymaker",
      notes: "Dia inteiro",
    }),
    makeEvent({
      client_name: "Maria Clara",
      event_type: "Debutante",
      event_date: "2026-02-14",
      coverage_start_time: "19:00",
      ceremony_location: "Recanto Alegria",
      reception_location: "Recanto Alegria",
      main_service: "Fotografia",
      additional_services: ["Storymaker"],
      debutante_name: "Maria Clara",
    }),
    makeEvent({
      client_name: "Isabelli",
      event_type: "Debutante",
      event_date: "2026-02-21",
      debutante_name: "Isabelli",
      notes: "Horário a definir — PENDENTE",
    }),

    // MARÇO 2026
    makeEvent({
      client_name: "Michele",
      event_type: "Debutante",
      event_date: "2026-03-06",
      ceremony_location: "Salão",
      reception_location: "Salão",
      main_service: "Fotografia",
      additional_services: ["Vídeo"],
      notes: "15 Anos — horário a definir",
    }),
    makeEvent({
      client_name: "Michele",
      event_type: "Aniversário",
      event_date: "2026-03-07",
      ceremony_location: "Salão",
      reception_location: "Salão",
      main_service: "Fotografia",
      additional_services: ["Vídeo"],
      notes: "Bodas de Prata — horário a definir",
    }),
    makeEvent({
      client_name: "Milena e José",
      event_type: "Casamento",
      event_date: "2026-03-14",
      coverage_start_time: "11:00",
      ceremony_location: "Igreja São Jorge",
    }),

    // ABRIL 2026
    makeEvent({
      client_name: "Camila Gomes do Amaral Ferreira",
      event_type: "Aniversário",
      event_date: "2026-04-11",
      coverage_start_time: "16:00",
      coverage_end_time: "20:30",
      ceremony_location: "Estrada dos Morros, 49 — Chácara 02",
      reception_location: "Estrada dos Morros, 49 — Chácara 02",
    }),
    makeEvent({
      client_name: "Alessandra — Evento Murilo",
      event_type: "Outro",
      event_date: "2026-04-19",
      main_service: "Storymaker",
      ceremony_location: "Portal Paradise",
      reception_location: "Portal Paradise",
    }),
    makeEvent({
      client_name: "Paula",
      event_type: "Outro",
      event_date: "2026-04-26",
      notes: "Horário a definir — PENDENTE",
    }),

    // MAIO 2026
    makeEvent({
      client_name: "Paula",
      event_type: "Outro",
      event_date: "2026-05-31",
      ceremony_location: "Franclei",
      reception_location: "Franclei",
      notes: "Workshop de Noivas — tarde — PENDENTE",
    }),

    // JULHO 2026
    makeEvent({
      client_name: "Francisca Maria dos Reis Pires",
      event_type: "Aniversário",
      event_date: "2026-07-04",
      coverage_start_time: "19:00",
      ceremony_location: "Estr. da Servidão, 73 — Sorocaba",
      reception_location: "Estr. da Servidão, 73 — Sorocaba",
      notes: "Horário pode mudar",
    }),
    makeEvent({
      client_name: "Michele Buffet",
      event_type: "Outro",
      event_date: "2026-07-04",
      ceremony_location: "Salão",
      reception_location: "Salão",
      main_service: "Fotografia",
      additional_services: ["Storymaker"],
    }),
    makeEvent({
      client_name: "Karen",
      event_type: "Aniversário",
      event_date: "2026-07-11",
      coverage_start_time: "18:50",
    }),
    makeEvent({
      client_name: "Sabrina",
      event_type: "Aniversário",
      event_date: "2026-07-19",
      ceremony_location: "Quintal da Vó",
      reception_location: "Quintal da Vó",
      notes: "Aniversário Infantil — 2h de fotografia — horário a definir",
    }),

    // AGOSTO 2026
    makeEvent({
      client_name: "Michele",
      event_type: "Debutante",
      event_date: "2026-08-15",
      ceremony_location: "Salão",
      reception_location: "Salão",
      main_service: "Fotografia",
      additional_services: ["Vídeo"],
      notes: "15 Anos — horário a definir",
    }),

    // NOVEMBRO 2026
    makeEvent({
      client_name: "Kátia Gomes do Amaral Lacerda",
      event_type: "Debutante",
      event_date: "2026-11-20",
      coverage_start_time: "20:00",
      ceremony_location: "Salão Alfa Eventos",
      reception_location: "Salão Alfa Eventos",
      debutante_name: "Kátia Gomes do Amaral Lacerda",
    }),

    // DEZEMBRO 2026
    makeEvent({
      client_name: "Yasmin Cristine R. Cassiano",
      event_type: "Debutante",
      event_date: "2026-12-11",
      coverage_start_time: "20:00",
      coverage_end_time: "01:00",
      debutante_name: "Yasmin Cristine R. Cassiano",
    }),
    makeEvent({
      client_name: "Luana e Giovanni",
      event_type: "Casamento",
      event_date: "2026-12-12",
      coverage_start_time: "16:00",
      ceremony_location: "Igreja Nossa Senhora Consolata",
      reception_location: "Chácara Gomes — Sorocaba",
    }),
  ];

  const contracts: Contract[] = events.map((e) => ({
    id: id(),
    event_id: e.id,
    signed: false,
    entry_payment_value: 0,
    entry_payment_confirmed: false,
    total_paid: 0,
    payment_history: [],
  }));

  const checklists: ConfirmationChecklist[] = events.map((e) => ({
    id: id(),
    event_id: e.id,
    event_date_confirmed: false,
    coverage_time_confirmed: false,
    locations_confirmed: false,
    contact_name: "",
    contact_phone: "",
    authorized: false,
  }));

  const professionals: import("@/types").Professional[] = [
    { id: id(), name: "Lucas", roles: ["Fotógrafo", "Videomaker", "Drone"], default_role: "Fotógrafo", pix_key: "lucas@example.com", phone: "(11) 99999-9999", notes: "Fotógrafo Principal" },
    { id: id(), name: "Fernanda", roles: ["Fotógrafo", "Storymaker"], default_role: "Fotógrafo", pix_key: "fernanda@example.com", phone: "(11) 98888-8888", notes: "Fotógrafa" },
    { id: id(), name: "Camila", roles: ["Assistente", "Storymaker"], default_role: "Assistente", pix_key: "camila@example.com", phone: "(11) 97777-7777", notes: "Assistente" },
    { id: id(), name: "Gustavo", roles: ["Videomaker", "Drone"], default_role: "Videomaker", pix_key: "gustavo@example.com", phone: "(11) 96666-6666", notes: "Videomaker" },
  ];

  return { events, contracts, checklists, professionals };
}
