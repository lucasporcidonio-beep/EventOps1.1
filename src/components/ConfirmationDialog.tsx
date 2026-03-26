import type { ConfirmationChecklist, Event } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, AlertTriangle, Send } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event;
  checklist: ConfirmationChecklist;
  onUpdate: (eventId: string, data: Partial<ConfirmationChecklist>) => void;
  onUpdateEvent: (id: string, data: Partial<Event>) => void;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  event,
  checklist,
  onUpdate,
  onUpdateEvent,
}: Props) {
  const allConfirmed =
    checklist.event_date_confirmed &&
    checklist.coverage_time_confirmed &&
    checklist.locations_confirmed &&
    checklist.contact_name.trim() !== "" &&
    checklist.contact_phone.trim() !== "" &&
    checklist.authorized;

  const handleConfirm = () => {
    onUpdateEvent(event.id, { confirmation_status: "Confirmado" });
    onOpenChange(false);
  };

  const handleDivergence = () => {
    onUpdateEvent(event.id, { confirmation_status: "Divergência" });
    onOpenChange(false);
  };

  const whatsappMessage = `Olá! Gostaria de confirmar os detalhes do seu evento:\n\n📅 Data: ${event.event_date}\n⏰ Horário: ${event.coverage_start_time} - ${event.coverage_end_time}\n📍 Cerimônia: ${event.ceremony_location}\n📍 Recepção: ${event.reception_location}\n\nPor favor, confirme se está tudo correto.`;

  const whatsappUrl = `https://wa.me/${(event.client_phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Confirmação Final — {event.client_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event Summary */}
          <div className="bg-muted rounded-lg p-4 space-y-1 text-sm">
            <p><span className="text-muted-foreground">Data:</span> {event.event_date}</p>
            <p><span className="text-muted-foreground">Horário:</span> {event.coverage_start_time} - {event.coverage_end_time}</p>
            <p><span className="text-muted-foreground">Cerimônia:</span> {event.ceremony_location || "—"}</p>
            <p><span className="text-muted-foreground">Recepção:</span> {event.reception_location || "—"}</p>
          </div>

          {/* WhatsApp */}
          {event.client_phone && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/30 text-success text-sm hover:bg-success/20 transition"
            >
              <Send className="h-4 w-4" />
              Enviar confirmação via WhatsApp
            </a>
          )}

          {/* Checklist */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Checklist</h4>

            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={checklist.event_date_confirmed}
                onCheckedChange={(v) =>
                  onUpdate(event.id, { event_date_confirmed: !!v })
                }
              />
              <span className="text-sm">Data do evento confirmada</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={checklist.coverage_time_confirmed}
                onCheckedChange={(v) =>
                  onUpdate(event.id, { coverage_time_confirmed: !!v })
                }
              />
              <span className="text-sm">Horário de cobertura confirmado</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={checklist.locations_confirmed}
                onCheckedChange={(v) =>
                  onUpdate(event.id, { locations_confirmed: !!v })
                }
              />
              <span className="text-sm">Locais confirmados</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Responsável no evento</Label>
                <Input
                  value={checklist.contact_name}
                  onChange={(e) => onUpdate(event.id, { contact_name: e.target.value })}
                  placeholder="Nome"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telefone do responsável</Label>
                <Input
                  value={checklist.contact_phone}
                  onChange={(e) => onUpdate(event.id, { contact_phone: e.target.value })}
                  placeholder="Telefone"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={checklist.authorized}
                onCheckedChange={(v) =>
                  onUpdate(event.id, { authorized: !!v })
                }
              />
              <span className="text-sm font-medium">Autorização final do cliente</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              onClick={handleDivergence}
              className="flex-1 gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <AlertTriangle className="h-4 w-4" />
              Divergência
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!allConfirmed}
              className="flex-1 gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
