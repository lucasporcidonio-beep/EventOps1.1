import { useState } from "react";
import type { Event, Contract, TeamAssignment, Professional } from "@/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CheckSquare,
  Users,
  DollarSign,
  Package,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event;
  contract: Contract;
  assignments: TeamAssignment[];
  professionals: Professional[];
  onUpdateAssignment: (eventId: string, profId: string, data: Partial<TeamAssignment>) => void;
  onUpdateEvent: (id: string, data: Partial<Event>) => void;
  onUpdateContract: (eventId: string, data: Partial<Contract>) => void;
  onConfirm: () => void;
}

export function ConcludeEventDialog({
  open,
  onOpenChange,
  event,
  contract,
  assignments,
  professionals,
  onUpdateAssignment,
  onUpdateEvent,
  onUpdateContract,
  onConfirm,
}: Props) {
  const eventAssigns = assignments.filter((a) => a.event_id === event.id);
  const packageValue = event.package_value || 0;
  const entryPaid = contract.entry_payment_confirmed ? (contract.entry_payment_value || 0) : 0;
  const totalPaidWithEntry = (contract.total_paid || 0) + entryPaid;
  const remaining = Math.max(0, packageValue - totalPaidWithEntry);

  const allProfConfirmed = eventAssigns.length === 0 || eventAssigns.every((a) => a.service_confirmed);
  const allCachePaid = eventAssigns.every((a) => !a.cache_value || a.cache_paid);
  const materialsDelivered = event.materials_delivered || false;
  const isPaid = packageValue > 0 && remaining <= 0;

  const canFinalize = allProfConfirmed && materialsDelivered;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <CheckSquare className="h-5 w-5" />
            Concluir Evento — {event.client_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Financial Summary */}
          <div className="rounded-lg border border-border p-3 space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Financeiro
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted rounded-lg p-2">
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="text-sm font-semibold">R$ {packageValue.toLocaleString("pt-BR")}</p>
              </div>
              <div className="bg-success/10 rounded-lg p-2">
                <p className="text-[10px] text-success">Pago</p>
                <p className="text-sm font-semibold text-success">R$ {totalPaidWithEntry.toLocaleString("pt-BR")}</p>
              </div>
              <div className={cn("rounded-lg p-2", remaining > 0 ? "bg-warning/10" : "bg-success/10")}>
                <p className={cn("text-[10px]", remaining > 0 ? "text-warning" : "text-success")}>Restante</p>
                <p className={cn("text-sm font-semibold", remaining > 0 ? "text-warning" : "text-success")}>
                  R$ {remaining.toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
            {remaining > 0 && (
              <div className="flex items-center gap-2 p-2 bg-warning/10 rounded-lg text-xs text-warning">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Evento com saldo pendente de R$ {remaining.toLocaleString("pt-BR")}
              </div>
            )}
          </div>

          {/* Team Confirmation */}
          <div className="rounded-lg border border-border p-3 space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" /> Confirmar Equipe
            </h4>
            {eventAssigns.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum profissional alocado</p>
            ) : (
              <div className="space-y-2">
                {eventAssigns.map((a) => {
                  const prof = professionals.find((p) => p.id === a.professional_id);
                  return (
                    <div key={a.professional_id} className={cn(
                      "p-3 rounded-lg border space-y-2",
                      a.service_confirmed ? "border-success/30 bg-success/5" : "border-border bg-muted"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{prof?.name}</span>
                          <Badge variant="outline" className="text-xs">{a.role}</Badge>
                          {a.primary && <Badge className="text-[10px] bg-warning/20 text-warning border-warning/30">★ Principal</Badge>}
                        </div>
                        {a.service_confirmed && (
                          <CheckCircle className="h-4 w-4 text-success" />
                        )}
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={a.service_confirmed || false}
                          onCheckedChange={(v) =>
                            onUpdateAssignment(event.id, a.professional_id, { service_confirmed: !!v })
                          }
                        />
                        <span className="text-xs font-medium">Confirmou realização do serviço</span>
                      </label>

                      {/* Cachê confirmation */}
                      <div className="flex items-center gap-3 pl-6">
                        <span className="text-xs text-muted-foreground">Cachê:</span>
                        <Input
                          type="number"
                          value={a.cache_value || ""}
                          onChange={(e) =>
                            onUpdateAssignment(event.id, a.professional_id, {
                              cache_value: Number(e.target.value) || 0,
                            })
                          }
                          placeholder="R$ 0"
                          className="h-7 w-24 text-xs"
                        />
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <Checkbox
                            checked={a.cache_paid || false}
                            onCheckedChange={(v) =>
                              onUpdateAssignment(event.id, a.professional_id, { cache_paid: !!v })
                            }
                          />
                          <span className="text-xs">Pago</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Materials */}
          <div className="rounded-lg border border-border p-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={materialsDelivered}
                onCheckedChange={(v) => onUpdateEvent(event.id, { materials_delivered: !!v })}
              />
              <span className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Materiais entregues ao cliente
              </span>
            </label>
          </div>

          {/* Contract signed */}
          <div className="rounded-lg border border-border p-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={contract.signed}
                onCheckedChange={(v) => onUpdateContract(event.id, { signed: !!v })}
              />
              <span className="text-sm font-medium">Contrato assinado</span>
            </label>
          </div>

          {/* Warnings */}
          {!canFinalize && (
            <div className="space-y-1">
              {!allProfConfirmed && (
                <p className="text-xs text-warning flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Confirme todos os profissionais que realizaram o serviço
                </p>
              )}
              {!materialsDelivered && (
                <p className="text-xs text-warning flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Confirme a entrega dos materiais
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={onConfirm}
            className={cn(
              "gap-2",
              canFinalize
                ? "bg-success hover:bg-success/90 text-success-foreground"
                : "bg-warning hover:bg-warning/90 text-warning-foreground"
            )}
          >
            <CheckSquare className="h-4 w-4" />
            {canFinalize ? "Finalizar Evento" : "Finalizar mesmo assim"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
