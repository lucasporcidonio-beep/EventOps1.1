export type EventType =
  | "Casamento"
  | "Debutante"
  | "Aniversário"
  | "Evento Corporativo"
  | "Ensaio"
  | "Evento Religioso"
  | "Outro";

export type OperationalStatus =
  | "Planejado"
  | "Próximo"
  | "Hoje"
  | "Em Execução"
  | "Entregue"
  | "Finalizado";

export type ConfirmationStatus = "Aguardando" | "Divergência" | "Confirmado";

export type ProfessionalRole = "Fotógrafo" | "Storymaker" | "Videomaker" | "Drone" | "Assistente";

export interface Event {
  id: string;
  event_type: EventType;
  client_name: string;
  client_phone?: string;
  client_rg?: string;
  client_birthdate?: string;
  client_address?: string;
  event_date: string;
  coverage_start_time: string;
  coverage_end_time: string;
  ceremony_location: string;
  reception_location: string;
  main_service: string;
  additional_services: string[];
  operational_status: OperationalStatus;
  confirmation_status: ConfirmationStatus;
  notes: string;
  debutante_name?: string;
  package_name?: string;
  package_value?: number;
  // Names based on event type
  groom_name?: string;
  bride_name?: string;
  birthday_person_name?: string;
  materials_delivered?: boolean;
}

export interface Contract {
  id: string;
  event_id: string;
  contract_file?: string;
  signed: boolean;
  entry_payment_value: number;
  entry_payment_confirmed: boolean;
  // Financial tracking
  total_paid: number;
  payment_history: PaymentRecord[];
}

export interface PaymentRecord {
  id: string;
  date: string;
  value: number;
  method: string;
  notes?: string;
}

export interface EventExpense {
  id: string;
  event_id: string;
  category: string;
  description: string;
  value: number;
  date: string;
}

export interface Professional {
  id: string;
  name: string;
  roles: ProfessionalRole[];
  default_role?: ProfessionalRole;
  phone?: string;
  pix_key?: string;
  notes?: string;
}

export interface TeamAssignment {
  id: string;
  event_id: string;
  professional_id: string;
  role: ProfessionalRole;
  primary: boolean;
  cache_value?: number;
  cache_paid?: boolean;
  cache_payment_date?: string;
  service_confirmed?: boolean; // confirmed that this professional actually performed the service
}

export type SubEventType = "Ensaio" | "Pré-Wedding" | "Making Of" | "Outro";

export interface SubEvent {
  id: string;
  parent_event_id: string;
  type: SubEventType;
  date: string;
  start_time: string;
  end_time?: string;
  location: string;
  notes?: string;
  completed: boolean;
  assigned_professionals?: string[]; // professional IDs
}

export interface ConfirmationChecklist {
  id: string;
  event_id: string;
  event_date_confirmed: boolean;
  coverage_time_confirmed: boolean;
  locations_confirmed: boolean;
  contact_name: string;
  contact_phone: string;
  authorized: boolean;
}

export interface ClientDataInput {
  full_name: string;
  rg: string;
  birthdate: string;
  phone: string;
  address: string;
  event_address: string;
  event_date_time: string;
  event_date_raw: string;
  event_time_raw: string;
  debutante_name: string;
  groom_name: string;
  bride_name: string;
  birthday_person_name: string;
  package_name: string;
  package_value: number;
  entry_value: number;
  event_type_hint: string;
}
