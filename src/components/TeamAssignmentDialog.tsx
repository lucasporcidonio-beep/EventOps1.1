import { useState } from "react";
import type { Professional, TeamAssignment, Event, ProfessionalRole } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Trash2, UserPlus, Star, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ROLES: { role: ProfessionalRole; icon: string; label: string }[] = [
  { role: "Fotógrafo", icon: "📷", label: "Fotógrafo" },
  { role: "Storymaker", icon: "🎬", label: "Storymaker" },
  { role: "Videomaker", icon: "🎥", label: "Videomaker" },
  { role: "Drone", icon: "🛸", label: "Drone" },
  { role: "Assistente", icon: "🤝", label: "Assistente" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event;
  professionals: Professional[];
  assignments: TeamAssignment[];
  onAddProfessional: (p: Professional) => void;
  onRemoveProfessional: (id: string) => void;
  onAssign: (a: TeamAssignment) => Promise<boolean> | boolean;
  onUpdateAssignment: (eventId: string, profId: string, data: Partial<TeamAssignment>) => void;
  onRemoveAssignment: (eventId: string, profId: string) => void;
  getConflicts: (profId: string, eventId: string) => Event[];
}

export function TeamAssignmentDialog({
  open,
  onOpenChange,
  event,
  professionals,
  assignments,
  onAddProfessional,
  onRemoveProfessional,
  onAssign,
  onUpdateAssignment,
  onRemoveAssignment,
  getConflicts,
}: Props) {
  const [newProfName, setNewProfName] = useState("");
  const [newProfRoles, setNewProfRoles] = useState<ProfessionalRole[]>(["Fotógrafo"]);
  const [selectedProf, setSelectedProf] = useState("");
  const [selectedRole, setSelectedRole] = useState<ProfessionalRole>("Fotógrafo");

  const eventAssignments = assignments.filter((a) => a.event_id === event.id);
  const availableProfs = professionals.filter(
    (p) => !eventAssignments.some((a) => a.professional_id === p.id)
  );

  const handleAddProf = () => {
    if (!newProfName.trim()) return;
    onAddProfessional({
      id: crypto.randomUUID(),
      name: newProfName.trim(),
      roles: newProfRoles.length > 0 ? newProfRoles : ["Fotógrafo"],
      default_role: newProfRoles[0] || "Fotógrafo",
    });
    setNewProfName("");
    setNewProfRoles(["Fotógrafo"]);
  };

  const toggleNewProfRole = (role: ProfessionalRole) => {
    setNewProfRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleAssign = () => {
    if (!selectedProf) return;
    const conflicts = getConflicts(selectedProf, event.id);
    if (conflicts.length > 0) {
      alert(
        `🚫 BLOQUEADO!\n\n${professionals.find(p => p.id === selectedProf)?.name} já está alocado no mesmo dia em:\n${conflicts.map(c => `- ${c.client_name} (${c.coverage_start_time}-${c.coverage_end_time})`).join("\n")}\n\nNão é possível alocar o mesmo profissional em dois eventos no mesmo dia.`
      );
      return;
    }
    onAssign({
      event_id: event.id,
      professional_id: selectedProf,
      role: selectedRole,
      primary: false,
    });
    setSelectedProf("");
  };

  const handleQuickAssign = (prof: Professional) => {
    const role = prof.default_role || (prof.roles || [])[0] || "Fotógrafo";
    const conflicts = getConflicts(prof.id, event.id);
    if (conflicts.length > 0) {
      alert(
        `🚫 BLOQUEADO!\n\n${prof.name} já está alocado no mesmo dia em:\n${conflicts.map(c => `- ${c.client_name} (${c.coverage_start_time}-${c.coverage_end_time})`).join("\n")}\n\nNão é possível alocar o mesmo profissional em dois eventos no mesmo dia.`
      );
      return;
    }
    onAssign({
      id: crypto.randomUUID(),
      event_id: event.id,
      professional_id: prof.id,
      role,
      primary: false,
      service_confirmed: false,
      cache_value: undefined,
      cache_paid: false,
    });
  };

  const handleTogglePrimary = (profId: string, role: ProfessionalRole) => {
    if (role === "Assistente") return;
    const current = eventAssignments.find(a => a.professional_id === profId);
    if (!current) return;
    onAssign({ ...current, primary: !current.primary });
  };

  const getRoleIcon = (role: ProfessionalRole) => {
    return ROLES.find((r) => r.role === role)?.icon || "👤";
  };

  // Calculate cachê totals for this event
  const totalCache = eventAssignments.reduce((sum, a) => sum + (a.cache_value || 0), 0);
  const totalCachePaid = eventAssignments.filter(a => a.cache_paid).reduce((sum, a) => sum + (a.cache_value || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Users className="h-5 w-5" />
            Equipe — {event.client_name}
          </DialogTitle>
        </DialogHeader>

        {/* Cachê Summary */}
        {totalCache > 0 && (
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted border border-border text-sm">
            <div>
              <span className="text-muted-foreground">Cachê Total:</span>{" "}
              <span className="font-semibold text-foreground">R$ {totalCache.toLocaleString("pt-BR")}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Pago:</span>{" "}
              <span className="font-semibold text-success">R$ {totalCachePaid.toLocaleString("pt-BR")}</span>
            </div>
            {totalCache - totalCachePaid > 0 && (
              <div>
                <span className="text-muted-foreground">Pendente:</span>{" "}
                <span className="font-semibold text-warning">R$ {(totalCache - totalCachePaid).toLocaleString("pt-BR")}</span>
              </div>
            )}
          </div>
        )}

        {/* Current Team */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Equipe Alocada</h4>
          {eventAssignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum profissional alocado</p>
          ) : (
            <div className="space-y-2">
              {eventAssignments.map((a) => {
                const prof = professionals.find((p) => p.id === a.professional_id);
                const conflicts = getConflicts(a.professional_id, event.id);
                return (
                  <div
                    key={a.professional_id}
                    className={`p-3 rounded-lg border space-y-2 ${conflicts.length > 0 ? "border-destructive/50 bg-destructive/5" : "border-border bg-muted"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {a.primary && <Star className="h-4 w-4 text-warning fill-warning" />}
                        <span className="text-base">{getRoleIcon(a.role)}</span>
                        <span className="text-sm font-medium">{prof?.name}</span>
                        <Badge variant="outline" className="text-xs">{a.role}</Badge>
                        {conflicts.length > 0 && (
                          <Badge variant="outline" className="status-danger text-xs">Conflito</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleTogglePrimary(a.professional_id, a.role)}
                          disabled={a.role === "Assistente"}
                          className="h-7 px-2 text-xs"
                        >
                          {a.primary ? "★ Principal" : "Tornar Principal"}
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => onRemoveAssignment(event.id, a.professional_id)}
                          className="h-7 px-2 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {/* Service confirmed */}
                    <div className="flex items-center gap-2 pl-6">
                      <Checkbox
                        checked={a.service_confirmed || false}
                        onCheckedChange={(v) => onUpdateAssignment(event.id, a.professional_id, { service_confirmed: !!v })}
                      />
                      <span className="text-xs text-muted-foreground">Serviço realizado</span>
                    </div>
                    {/* Cachê row */}
                    <div className="flex items-center gap-2 pl-6">
                      <span className="text-xs text-muted-foreground">Cachê:</span>
                      <Input
                        type="number"
                        value={a.cache_value || ""}
                        onChange={(e) => onUpdateAssignment(event.id, a.professional_id, { cache_value: Number(e.target.value) || 0 })}
                        placeholder="R$ 0"
                        className="h-7 w-24 text-xs"
                      />
                      <div className="flex items-center gap-1.5">
                        <Checkbox
                          checked={a.cache_paid || false}
                          onCheckedChange={(v) => onUpdateAssignment(event.id, a.professional_id, { cache_paid: !!v })}
                        />
                        <span className="text-xs text-muted-foreground">Pago</span>
                      </div>
                      {!a.cache_paid && (
                        <Input
                          type="date"
                          value={a.cache_payment_date || ""}
                          onChange={(e) => onUpdateAssignment(event.id, a.professional_id, { cache_payment_date: e.target.value })}
                          className="h-7 w-36 text-xs"
                          title="Data prevista de pagamento"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Assign */}
        {availableProfs.length > 0 && (
          <div className="space-y-2 border-t border-border pt-4">
            <h4 className="text-sm font-medium text-muted-foreground">Clique para alocar rapidamente</h4>
            <div className="flex flex-wrap gap-2">
              {availableProfs.map((p) => (
                <Button
                  key={p.id}
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => handleQuickAssign(p)}
                >
                  {getRoleIcon(p.default_role || (p.roles || [])[0] || "Fotógrafo")}
                  {p.name}
                  <span className="text-muted-foreground">· {(p.roles || []).join(", ")}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Manual Assign */}
        <div className="space-y-3 border-t border-border pt-4">
          <h4 className="text-sm font-medium text-muted-foreground">Alocar com função específica</h4>
          <div className="flex gap-2">
            <Select value={selectedProf} onValueChange={setSelectedProf}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecionar profissional" />
              </SelectTrigger>
              <SelectContent>
                {availableProfs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({(p.roles || []).join(", ")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as ProfessionalRole)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.role} value={r.role}>
                    {r.icon} {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAssign} size="sm" disabled={!selectedProf}>
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Add new professional with multiple roles */}
        <div className="space-y-3 border-t border-border pt-4">
          <h4 className="text-sm font-medium text-muted-foreground">Cadastrar Novo Profissional</h4>
          <div className="flex gap-2">
            <Input
              value={newProfName}
              onChange={(e) => setNewProfName(e.target.value)}
              placeholder="Nome do profissional"
              onKeyDown={(e) => e.key === "Enter" && handleAddProf()}
              className="flex-1"
            />
            <Button onClick={handleAddProf} size="sm" disabled={!newProfName.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <Button
                key={r.role}
                variant={newProfRoles.includes(r.role) ? "default" : "outline"}
                size="sm"
                className="text-xs gap-1"
                onClick={() => toggleNewProfRole(r.role)}
              >
                {r.icon} {r.label}
              </Button>
            ))}
          </div>
          {professionals.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {professionals.map((p) => (
                <Badge key={p.id} variant="secondary" className="text-xs gap-1">
                  {(p.roles || []).map(r => getRoleIcon(r)).join("")} {p.name}
                  <button onClick={() => onRemoveProfessional(p.id)} className="hover:text-destructive">×</button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
