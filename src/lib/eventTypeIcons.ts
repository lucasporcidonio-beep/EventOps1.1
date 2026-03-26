import type { EventType } from "@/types";

export const EVENT_TYPE_ICONS: Record<EventType, string> = {
  "Casamento": "💍",
  "Debutante": "👑",
  "Aniversário": "🎂",
  "Evento Corporativo": "🏢",
  "Ensaio": "📸",
  "Evento Religioso": "⛪",
  "Outro": "📋",
};

// Extended event subtypes for smarter detection
export function detectEventIcon(event: { event_type: EventType; notes?: string; client_name?: string }): string {
  // Check notes for specific keywords
  const notes = (event.notes || "").toLowerCase();
  const name = (event.client_name || "").toLowerCase();
  
  if (event.event_type === "Evento Religioso" || notes.includes("batizado") || notes.includes("batismo")) {
    return "⛪";
  }
  if (notes.includes("gestante") || notes.includes("grávida") || notes.includes("gravida")) {
    return "🤰";
  }
  if (notes.includes("família") || notes.includes("familia") || notes.includes("family")) {
    return "👨‍👩‍👧‍👦";
  }
  if (notes.includes("infantil") || notes.includes("criança")) {
    return "🎈";
  }
  if (notes.includes("bodas")) {
    return "🥂";
  }
  if (notes.includes("workshop") || notes.includes("noivas")) {
    return "💐";
  }
  
  return EVENT_TYPE_ICONS[event.event_type] || "📋";
}
