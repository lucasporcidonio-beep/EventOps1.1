import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import type {
  Event,
  Contract,
  Professional,
  TeamAssignment,
  ConfirmationChecklist,
  SubEvent,
  EventExpense,
} from "@/types";

// Coleções do Firestore
export const COLLECTIONS = {
  EVENTS: "events",
  CONTRACTS: "contracts",
  PROFESSIONALS: "professionals",
  ASSIGNMENTS: "assignments",
  CHECKLISTS: "checklists",
  SUB_EVENTS: "sub_events",
  EXPENSES: "expenses",
} as const;

// Limpa campos com undefined (Firestore rejeita valores 'undefined')
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

// ==========================================================
// 1. ESCUTADORES EM TEMPO REAL (REAL-TIME LISTENERS)
// ==========================================================

export function subscribeToEvents(callback: (events: Event[]) => void): () => void {
  if (!isFirebaseConfigured || !db) return () => {};
  const q = collection(db, COLLECTIONS.EVENTS);
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Event[];
    callback(data);
  }, (err) => {
    console.error("Erro ao escutar eventos:", err);
  });
}

export function subscribeToContracts(callback: (contracts: Contract[]) => void): () => void {
  if (!isFirebaseConfigured || !db) return () => {};
  const q = collection(db, COLLECTIONS.CONTRACTS);
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Contract[];
    callback(data);
  });
}

export function subscribeToProfessionals(callback: (profs: Professional[]) => void): () => void {
  if (!isFirebaseConfigured || !db) return () => {};
  const q = collection(db, COLLECTIONS.PROFESSIONALS);
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Professional[];
    callback(data);
  });
}

export function subscribeToAssignments(callback: (assignments: TeamAssignment[]) => void): () => void {
  if (!isFirebaseConfigured || !db) return () => {};
  const q = collection(db, COLLECTIONS.ASSIGNMENTS);
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TeamAssignment[];
    callback(data);
  });
}

export function subscribeToChecklists(callback: (checklists: ConfirmationChecklist[]) => void): () => void {
  if (!isFirebaseConfigured || !db) return () => {};
  const q = collection(db, COLLECTIONS.CHECKLISTS);
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ConfirmationChecklist[];
    callback(data);
  });
}

export function subscribeToSubEvents(callback: (subEvents: SubEvent[]) => void): () => void {
  if (!isFirebaseConfigured || !db) return () => {};
  const q = collection(db, COLLECTIONS.SUB_EVENTS);
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SubEvent[];
    callback(data);
  });
}

export function subscribeToExpenses(callback: (expenses: EventExpense[]) => void): () => void {
  if (!isFirebaseConfigured || !db) return () => {};
  const q = collection(db, COLLECTIONS.EXPENSES);
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as EventExpense[];
    callback(data);
  });
}

// ==========================================================
// 2. OPERAÇÕES DE EVENTOS (EVENTOS, CONTRATOS, CHECKLIST)
// ==========================================================

export async function createEventWithDefaults(
  event: Event,
  contract: Partial<Contract>,
  checklist: Partial<ConfirmationChecklist>,
  expense: Partial<EventExpense>
) {
  if (!isFirebaseConfigured || !db) return;

  const batch = writeBatch(db);

  // 1. Evento
  const eventRef = doc(db, COLLECTIONS.EVENTS, event.id);
  batch.set(eventRef, sanitizeForFirestore(event));

  // 2. Contrato
  const contractId = contract.id || crypto.randomUUID();
  const contractRef = doc(db, COLLECTIONS.CONTRACTS, contractId);
  batch.set(contractRef, sanitizeForFirestore({
    id: contractId,
    event_id: event.id,
    signed: false,
    total_paid: 0,
    entry_payment_value: 0,
    entry_payment_confirmed: false,
    payment_history: [],
    ...contract,
  }));

  // 3. Checklist
  const checklistId = checklist.id || crypto.randomUUID();
  const checklistRef = doc(db, COLLECTIONS.CHECKLISTS, checklistId);
  batch.set(checklistRef, sanitizeForFirestore({
    id: checklistId,
    event_id: event.id,
    event_date_confirmed: false,
    coverage_time_confirmed: false,
    locations_confirmed: false,
    contact_name: event.client_name || "",
    contact_phone: event.client_phone || "",
    authorized: false,
    ...checklist,
  }));

  // 4. Despesa padrão
  const expenseId = expense.id || crypto.randomUUID();
  const expenseRef = doc(db, COLLECTIONS.EXPENSES, expenseId);
  batch.set(expenseRef, sanitizeForFirestore({
    id: expenseId,
    event_id: event.id,
    category: "Deslocamento",
    description: "Deslocamento padrão",
    value: 50,
    date: new Date().toISOString().split("T")[0],
    ...expense,
  }));

  await batch.commit();
}

export async function updateEventDoc(id: string, data: Partial<Event>) {
  if (!isFirebaseConfigured || !db) return;
  const ref = doc(db, COLLECTIONS.EVENTS, id);
  await updateDoc(ref, sanitizeForFirestore(data));
}

export async function deleteEventDoc(eventId: string) {
  if (!isFirebaseConfigured || !db) return;

  const batch = writeBatch(db);

  // Deleta o evento
  batch.delete(doc(db, COLLECTIONS.EVENTS, eventId));

  // Busca e deleta em cascata as coleções filhas
  const deleteChildByField = async (collName: string, fieldName: string) => {
    if (!db) return;
    const q = query(collection(db, collName), where(fieldName, "==", eventId));
    const snapshot = await getDocs(q);
    snapshot.docs.forEach((d) => batch.delete(d.ref));
  };

  await Promise.all([
    deleteChildByField(COLLECTIONS.CONTRACTS, "event_id"),
    deleteChildByField(COLLECTIONS.CHECKLISTS, "event_id"),
    deleteChildByField(COLLECTIONS.EXPENSES, "event_id"),
    deleteChildByField(COLLECTIONS.ASSIGNMENTS, "event_id"),
    deleteChildByField(COLLECTIONS.SUB_EVENTS, "parent_event_id"),
  ]);

  await batch.commit();
}

// ==========================================================
// 3. OPERAÇÕES DE CONTRATO (UPSERT & TEXTO GERADO)
// ==========================================================

export async function upsertContractDoc(eventId: string, data: Partial<Contract & { generated_contract_text?: string }>) {
  if (!isFirebaseConfigured || !db) return;

  const q = query(collection(db, COLLECTIONS.CONTRACTS), where("event_id", "==", eventId));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const existingDoc = snapshot.docs[0];
    await updateDoc(existingDoc.ref, sanitizeForFirestore(data));
  } else {
    const newId = crypto.randomUUID();
    const newRef = doc(db, COLLECTIONS.CONTRACTS, newId);
    await setDoc(newRef, sanitizeForFirestore({
      id: newId,
      event_id: eventId,
      signed: false,
      total_paid: 0,
      entry_payment_value: 0,
      entry_payment_confirmed: false,
      payment_history: [],
      ...data,
    }));
  }
}

// ==========================================================
// 4. PROFISSIONAIS & ATRIBUIÇÕES
// ==========================================================

export async function addProfessionalDoc(prof: Professional) {
  if (!isFirebaseConfigured || !db) return;
  const ref = doc(db, COLLECTIONS.PROFESSIONALS, prof.id);
  await setDoc(ref, sanitizeForFirestore(prof));
}

export async function deleteProfessionalDoc(id: string) {
  if (!isFirebaseConfigured || !db) return;
  const batch = writeBatch(db);
  batch.delete(doc(db, COLLECTIONS.PROFESSIONALS, id));

  const q = query(collection(db, COLLECTIONS.ASSIGNMENTS), where("professional_id", "==", id));
  const snapshot = await getDocs(q);
  snapshot.docs.forEach((d) => batch.delete(d.ref));

  await batch.commit();
}

export async function saveAssignmentDoc(assignment: TeamAssignment) {
  if (!isFirebaseConfigured || !db) return;
  const ref = doc(db, COLLECTIONS.ASSIGNMENTS, assignment.id);
  await setDoc(ref, sanitizeForFirestore(assignment));
}

export async function updateAssignmentDoc(id: string, data: Partial<TeamAssignment>) {
  if (!isFirebaseConfigured || !db) return;
  const ref = doc(db, COLLECTIONS.ASSIGNMENTS, id);
  await updateDoc(ref, sanitizeForFirestore(data));
}

export async function removeAssignmentDoc(id: string) {
  if (!isFirebaseConfigured || !db) return;
  await deleteDoc(doc(db, COLLECTIONS.ASSIGNMENTS, id));
}

// ==========================================================
// 5. CHECKLIST, SUB-EVENTOS & DESPESAS
// ==========================================================

export async function updateChecklistDoc(id: string, data: Partial<ConfirmationChecklist>) {
  if (!isFirebaseConfigured || !db) return;
  const ref = doc(db, COLLECTIONS.CHECKLISTS, id);
  await updateDoc(ref, sanitizeForFirestore(data));
}

export async function addSubEventDoc(subEvent: SubEvent) {
  if (!isFirebaseConfigured || !db) return;
  const ref = doc(db, COLLECTIONS.SUB_EVENTS, subEvent.id);
  await setDoc(ref, sanitizeForFirestore(subEvent));
}

export async function updateSubEventDoc(id: string, data: Partial<SubEvent>) {
  if (!isFirebaseConfigured || !db) return;
  const ref = doc(db, COLLECTIONS.SUB_EVENTS, id);
  await updateDoc(ref, sanitizeForFirestore(data));
}

export async function deleteSubEventDoc(id: string) {
  if (!isFirebaseConfigured || !db) return;
  await deleteDoc(doc(db, COLLECTIONS.SUB_EVENTS, id));
}

export async function addExpenseDoc(expense: EventExpense) {
  if (!isFirebaseConfigured || !db) return;
  const ref = doc(db, COLLECTIONS.EXPENSES, expense.id);
  await setDoc(ref, sanitizeForFirestore(expense));
}

export async function deleteExpenseDoc(id: string) {
  if (!isFirebaseConfigured || !db) return;
  await deleteDoc(doc(db, COLLECTIONS.EXPENSES, id));
}
