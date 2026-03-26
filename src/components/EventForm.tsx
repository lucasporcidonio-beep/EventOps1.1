import { useState, useEffect } from "react";
import type { Event, EventType } from "@/types";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EVENT_TYPE_ICONS } from "@/lib/eventTypeIcons";

const EVENT_TYPES: EventType[] = [
  "Casamento",
  "Debutante",
  "Aniversário",
  "Evento Corporativo",
  "Ensaio",
  "Evento Religioso",
  "Outro",
];

interface EventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: Event) => void;
  initialData?: Event;
}

const emptyForm: Partial<Event> = {
  event_type: "Casamento",
  client_name: "",
  client_phone: "",
  client_rg: "",
  client_birthdate: "",
  client_address: "",
  event_date: "",
  coverage_start_time: "",
  coverage_end_time: "",
  ceremony_location: "",
  reception_location: "",
  main_service: "Fotografia",
  additional_services: [],
  operational_status: "Planejado",
  confirmation_status: "Aguardando",
  notes: "",
  debutante_name: "",
  groom_name: "",
  bride_name: "",
  birthday_person_name: "",
  package_name: "",
  package_value: 0,
};

export function EventForm({ open, onOpenChange, onSubmit, initialData }: EventFormProps) {
  const [form, setForm] = useState<Partial<Event>>(initialData || emptyForm);

  useEffect(() => {
    if (open) {
      setForm(initialData ? { ...initialData } : { ...emptyForm });
    }
  }, [open, initialData]);

  const handleSubmit = () => {
    const event: Event = {
      id: initialData?.id || crypto.randomUUID(),
      event_type: form.event_type || "Outro",
      client_name: form.client_name || "",
      client_phone: form.client_phone || "",
      client_rg: form.client_rg || "",
      client_birthdate: form.client_birthdate || "",
      client_address: form.client_address || "",
      event_date: form.event_date || "",
      coverage_start_time: form.coverage_start_time || "",
      coverage_end_time: form.coverage_end_time || "",
      ceremony_location: form.ceremony_location || "",
      reception_location: form.reception_location || "",
      main_service: form.main_service || "Fotografia",
      additional_services: form.additional_services || [],
      operational_status: form.operational_status || "Planejado",
      confirmation_status: form.confirmation_status || "Aguardando",
      notes: form.notes || "",
      debutante_name: form.debutante_name || "",
      groom_name: form.groom_name || "",
      bride_name: form.bride_name || "",
      birthday_person_name: form.birthday_person_name || "",
      package_name: form.package_name || "",
      package_value: form.package_value || 0,
    };

    onSubmit(event);
    onOpenChange(false);
  };

  const set = (key: keyof Event, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const eventType = form.event_type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {initialData ? "Editar Evento" : "Novo Evento"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label>Tipo de Evento</Label>
            <Select
              value={form.event_type}
              onValueChange={(v) => set("event_type", v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {EVENT_TYPE_ICONS[t]} {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nome do Cliente</Label>
            <Input
              value={form.client_name || ""}
              onChange={(e) => set("client_name", e.target.value)}
              placeholder="Nome completo"
            />
          </div>

          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              value={form.client_phone || ""}
              onChange={(e) => set("client_phone", e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label>RG</Label>
            <Input
              value={form.client_rg || ""}
              onChange={(e) => set("client_rg", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Data de Nascimento</Label>
            <Input
              type="date"
              value={form.client_birthdate || ""}
              onChange={(e) => set("client_birthdate", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Endereço do Cliente</Label>
            <Input
              value={form.client_address || ""}
              onChange={(e) => set("client_address", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Data do Evento</Label>
            <Input
              type="date"
              value={form.event_date || ""}
              onChange={(e) => set("event_date", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Início Cobertura</Label>
            <Input
              type="time"
              value={form.coverage_start_time || ""}
              onChange={(e) => set("coverage_start_time", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Fim Cobertura</Label>
            <Input
              type="time"
              value={form.coverage_end_time || ""}
              onChange={(e) => set("coverage_end_time", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Local da Cerimônia</Label>
            <Input
              value={form.ceremony_location || ""}
              onChange={(e) => set("ceremony_location", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Local da Recepção</Label>
            <Input
              value={form.reception_location || ""}
              onChange={(e) => set("reception_location", e.target.value)}
            />
          </div>

          {/* Dynamic fields based on event type */}
          {eventType === "Casamento" && (
            <>
              <div className="space-y-2">
                <Label>👰 Nome da Noiva</Label>
                <Input
                  value={form.bride_name || ""}
                  onChange={(e) => set("bride_name", e.target.value)}
                  placeholder="Nome da noiva"
                />
              </div>
              <div className="space-y-2">
                <Label>🤵 Nome do Noivo</Label>
                <Input
                  value={form.groom_name || ""}
                  onChange={(e) => set("groom_name", e.target.value)}
                  placeholder="Nome do noivo"
                />
              </div>
            </>
          )}

          {eventType === "Debutante" && (
            <div className="space-y-2">
              <Label>👑 Nome da Debutante</Label>
              <Input
                value={form.debutante_name || ""}
                onChange={(e) => set("debutante_name", e.target.value)}
                placeholder="Nome da debutante"
              />
            </div>
          )}

          {eventType === "Aniversário" && (
            <div className="space-y-2">
              <Label>🎂 Nome do Aniversariante</Label>
              <Input
                value={form.birthday_person_name || ""}
                onChange={(e) => set("birthday_person_name", e.target.value)}
                placeholder="Nome do aniversariante"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Pacote</Label>
            <Input
              value={form.package_name || ""}
              onChange={(e) => set("package_name", e.target.value)}
              placeholder="Ex: Lua Cheia"
            />
          </div>

          <div className="space-y-2">
            <Label>Valor do Pacote (R$)</Label>
            <Input
              type="number"
              value={form.package_value || ""}
              onChange={(e) => set("package_value", Number(e.target.value))}
            />
          </div>

          <div className="col-span-2 space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={form.notes || ""}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>
            {initialData ? "Salvar" : "Criar Evento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
