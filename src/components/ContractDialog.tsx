import { useState, useEffect } from "react";
import type { Contract, Event, PaymentRecord, EventExpense } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { FileText, DollarSign, Plus, Trash2, MessageCircle, Receipt, Pencil, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event;
  contract: Contract;
  expenses: EventExpense[];
  onUpdate: (eventId: string, data: Partial<Contract>) => void;
  onAddExpense: (expense: EventExpense) => void;
  onRemoveExpense: (id: string) => void;
  onUpdateExpense: (id: string, data: Partial<EventExpense>) => void;
}

const PAYMENT_METHODS = ["Pix", "Dinheiro", "Cartão Crédito", "Cartão Débito", "Transferência", "Boleto"];

const EXPENSE_CATEGORIES = ["Deslocamento", "Ingressos", "Material Impresso", "Alimentação", "Hospedagem", "Equipamento", "Outro"];

export function ContractDialog({ open, onOpenChange, event, contract, expenses, onUpdate, onAddExpense, onRemoveExpense, onUpdateExpense }: Props) {
  const [newPaymentValue, setNewPaymentValue] = useState("");
  const [newPaymentMethod, setNewPaymentMethod] = useState("Pix");
  const [newPaymentNotes, setNewPaymentNotes] = useState("");
  const [newExpenseCategory, setNewExpenseCategory] = useState("Deslocamento");
  const [newExpenseDesc, setNewExpenseDesc] = useState("");
  const [newExpenseValue, setNewExpenseValue] = useState("");
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseCategory, setEditExpenseCategory] = useState("");
  const [editExpenseDesc, setEditExpenseDesc] = useState("");
  const [editExpenseValue, setEditExpenseValue] = useState("");
  // Local state for entry_payment_value to avoid updating on every keystroke
  const [localEntryValue, setLocalEntryValue] = useState(String(contract?.entry_payment_value || ""));

  // Sync local entry value when contract changes (different event selected)
  useEffect(() => {
    setLocalEntryValue(String(contract?.entry_payment_value || ""));
  }, [contract?.id, contract?.entry_payment_value]);

  const totalPaid = contract?.total_paid || 0;
  const entryValue = contract?.entry_payment_confirmed ? (contract?.entry_payment_value || 0) : 0;
  const packageValue = event.package_value || 0;
  const totalPaidWithEntry = totalPaid + entryValue;
  const remaining = Math.max(0, packageValue - totalPaidWithEntry);
  const paymentHistory = contract?.payment_history || [];
  const eventExpenses = expenses?.filter((e) => e.event_id === event.id) || [];
  const totalExpenses = eventExpenses.reduce((sum, e) => sum + e.value, 0);

  const handleAddPayment = () => {
    const value = parseFloat(newPaymentValue);
    if (!value || value <= 0) return;

    const payment: PaymentRecord = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split("T")[0],
      value,
      method: newPaymentMethod,
      notes: newPaymentNotes || undefined,
    };

    onUpdate(event.id, {
      total_paid: totalPaid + value,
      payment_history: [...paymentHistory, payment],
    });

    setNewPaymentValue("");
    setNewPaymentNotes("");
  };

  const handleRemovePayment = (paymentId: string) => {
    const payment = paymentHistory.find((p) => p.id === paymentId);
    if (!payment) return;
    onUpdate(event.id, {
      total_paid: Math.max(0, totalPaid - payment.value),
      payment_history: paymentHistory.filter((p) => p.id !== paymentId),
    });
  };

  const whatsappLink = event.client_phone
    ? `https://wa.me/55${event.client_phone.replace(/\D/g, "")}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <FileText className="h-5 w-5" />
            Contrato — {event.client_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client Info */}
          <div className="bg-muted rounded-lg p-4 space-y-1 text-sm">
            <p><span className="text-muted-foreground">Cliente:</span> {event.client_name}</p>
            {event.client_rg && <p><span className="text-muted-foreground">RG:</span> {event.client_rg}</p>}
            {event.client_phone && (
              <p className="flex items-center gap-2">
                <span className="text-muted-foreground">Telefone:</span> {event.client_phone}
                {whatsappLink && (
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-success hover:underline">
                    <MessageCircle className="h-3 w-3" /> WhatsApp
                  </a>
                )}
              </p>
            )}
            {event.client_address && <p><span className="text-muted-foreground">Endereço:</span> {event.client_address}</p>}
            <p><span className="text-muted-foreground">Evento:</span> {event.event_type} — {event.event_date}</p>
            {event.package_name && (
              <p><span className="text-muted-foreground">Pacote:</span> {event.package_name} {packageValue ? `(R$ ${packageValue.toFixed(2)})` : ""}</p>
            )}
          </div>

          {/* Financial Summary */}
          <div className="rounded-lg border border-border p-4 space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Financeiro
            </h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Valor Total</p>
                <p className="text-lg font-semibold text-foreground">R$ {packageValue.toFixed(2)}</p>
              </div>
              <div className="bg-success/10 rounded-lg p-3">
                <p className="text-xs text-success">Pago</p>
                <p className="text-lg font-semibold text-success">R$ {totalPaidWithEntry.toFixed(2)}</p>
              </div>
              <div className={`rounded-lg p-3 ${remaining > 0 ? "bg-warning/10" : "bg-success/10"}`}>
                <p className={`text-xs ${remaining > 0 ? "text-warning" : "text-success"}`}>Restante</p>
                <p className={`text-lg font-semibold ${remaining > 0 ? "text-warning" : "text-success"}`}>
                  R$ {remaining.toFixed(2)}
                </p>
              </div>
            </div>
            {packageValue > 0 && (
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-success h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (totalPaidWithEntry / packageValue) * 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Payment History */}
          {paymentHistory.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Histórico de Pagamentos</h4>
              <div className="space-y-1">
                {paymentHistory.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{p.date}</span>
                      <span className="font-medium text-success">R$ {p.value.toFixed(2)}</span>
                      <Badge variant="outline" className="text-xs">{p.method}</Badge>
                      {p.notes && <span className="text-xs text-muted-foreground">{p.notes}</span>}
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 px-1 text-destructive hover:text-destructive"
                      onClick={() => handleRemovePayment(p.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Payment */}
          <div className="space-y-2 border-t border-border pt-4">
            <h4 className="text-sm font-medium text-muted-foreground">Registrar Pagamento</h4>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Valor (R$)"
                value={newPaymentValue}
                onChange={(e) => setNewPaymentValue(e.target.value)}
                className="w-28"
              />
              <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Obs."
                value={newPaymentNotes}
                onChange={(e) => setNewPaymentNotes(e.target.value)}
                className="flex-1"
              />
              <Button size="sm" onClick={handleAddPayment} disabled={!newPaymentValue}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Expenses */}
          <div className="space-y-2 border-t border-border pt-4">
            <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Receipt className="h-4 w-4" /> Despesas do Evento
              {totalExpenses > 0 && (
                <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
                  R$ {totalExpenses.toLocaleString("pt-BR")}
                </Badge>
              )}
            </h4>
            {eventExpenses.length > 0 && (
              <div className="space-y-1">
                {eventExpenses.map((exp) => (
                  <div key={exp.id}>
                    {editingExpenseId === exp.id ? (
                      <div className="flex gap-1 items-center p-2 rounded-lg bg-muted">
                        <Select value={editExpenseCategory} onValueChange={setEditExpenseCategory}>
                          <SelectTrigger className="w-[110px] h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EXPENSE_CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input value={editExpenseDesc} onChange={(e) => setEditExpenseDesc(e.target.value)} className="flex-1 h-7 text-xs" />
                        <Input type="number" value={editExpenseValue} onChange={(e) => setEditExpenseValue(e.target.value)} className="w-20 h-7 text-xs" />
                        <Button variant="ghost" size="sm" className="h-6 px-1 text-success" onClick={() => {
                          const val = parseFloat(editExpenseValue);
                          if (val > 0 && editExpenseDesc) {
                            onUpdateExpense(exp.id, { category: editExpenseCategory, description: editExpenseDesc, value: val });
                          }
                          setEditingExpenseId(null);
                        }}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-1" onClick={() => setEditingExpenseId(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-muted text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{exp.category}</Badge>
                          <span className="text-xs">{exp.description}</span>
                          <span className="font-medium text-destructive">R$ {exp.value.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Button variant="ghost" size="sm" className="h-6 px-1 text-muted-foreground hover:text-foreground"
                            onClick={() => { setEditingExpenseId(exp.id); setEditExpenseCategory(exp.category); setEditExpenseDesc(exp.description); setEditExpenseValue(String(exp.value)); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 px-1 text-destructive hover:text-destructive"
                            onClick={() => onRemoveExpense(exp.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Select value={newExpenseCategory} onValueChange={setNewExpenseCategory}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Descrição"
                value={newExpenseDesc}
                onChange={(e) => setNewExpenseDesc(e.target.value)}
                className="flex-1 h-8 text-xs"
              />
              <Input
                type="number"
                placeholder="R$"
                value={newExpenseValue}
                onChange={(e) => setNewExpenseValue(e.target.value)}
                className="w-20 h-8 text-xs"
              />
              <Button size="sm" className="h-8" disabled={!newExpenseValue || !newExpenseDesc} onClick={() => {
                const val = parseFloat(newExpenseValue);
                if (!val || val <= 0) return;
                onAddExpense({
                  id: crypto.randomUUID(),
                  event_id: event.id,
                  category: newExpenseCategory,
                  description: newExpenseDesc,
                  value: val,
                  date: new Date().toISOString().split("T")[0],
                });
                setNewExpenseDesc("");
                setNewExpenseValue("");
              }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Contract Status */}
          <div className="space-y-3 border-t border-border pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={contract?.signed || false}
                onCheckedChange={(v) => onUpdate(event.id, { signed: !!v })}
              />
              <span className="text-sm font-medium">Contrato assinado</span>
            </label>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Valor da Entrada (R$)
              </Label>
              <Input
                type="number"
                value={localEntryValue}
                onChange={(e) => setLocalEntryValue(e.target.value)}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (!isNaN(val)) onUpdate(event.id, { entry_payment_value: val });
                }}
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={contract?.entry_payment_confirmed || false}
                onCheckedChange={(v) =>
                  onUpdate(event.id, { entry_payment_confirmed: !!v })
                }
              />
              <span className="text-sm font-medium">Pagamento de entrada confirmado</span>
            </label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
