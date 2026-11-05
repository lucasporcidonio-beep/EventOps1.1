import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Database, Check } from "lucide-react";
import { parsePreContractAI } from "@/services/aiService";
import { toast } from "sonner";
import type { Event } from "@/types";

interface AIAssistantWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (event: Event) => void;
}

export function AIAssistantWizard({ open, onOpenChange, onComplete }: AIAssistantWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [rawInput, setRawInput] = useState("");
  const [preContractData, setPreContractData] = useState<any>(null);

  const handleStep1 = async () => {
    if (!rawInput.trim()) {
      toast.error("Cole os dados do cliente para processar.");
      return;
    }
    setLoading(true);
    try {
      const data = await parsePreContractAI(rawInput);
      setPreContractData(data);
      setStep(2);
      toast.success("Dados do evento extraídos com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao interpretar texto.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = () => {
    const eventDate =
      preContractData?.event?.event_date || new Date().toISOString().split("T")[0];

    const newEvent: Event = {
      id: crypto.randomUUID(),
      event_type: preContractData?.event?.event_type || "Outro",
      client_name: preContractData?.client?.full_name || "Sem Nome",
      client_phone: preContractData?.client?.phone || "",
      client_rg: preContractData?.client?.document || "",
      event_date: eventDate,
      coverage_start_time:
        preContractData?.event?.locations?.ceremony?.start_time || "16:00",
      coverage_end_time: "23:00",
      ceremony_location:
        preContractData?.event?.locations?.ceremony?.name || "",
      reception_location:
        preContractData?.event?.locations?.reception?.name || "",
      main_service: preContractData?.main_service?.service_type || "Fotografia",
      additional_services: [],
      operational_status: "Planejado",
      confirmation_status: "Aguardando",
      notes: "Criado via EventOps AI",
      package_name: "Pacote Padrão",
      package_value: preContractData?.financial?.package_value || 0,
    };

    onComplete(newEvent);
    onOpenChange(false);
    setStep(1);
    setPreContractData(null);
    setRawInput("");
    toast.success("Novo evento criado a partir da IA!");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val);
        if (!val) {
          setStep(1);
          setPreContractData(null);
        }
      }}
    >
      <DialogContent className="max-w-xl bg-zinc-950 border-white/10 text-zinc-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-400">
            <Sparkles className="w-5 h-5 text-emerald-400" /> EventOps AI Wizard
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4 justify-between border-b border-white/10 pb-4 mt-2">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`flex-1 text-center text-xs font-semibold py-1 px-2 rounded-lg ${
                step === s
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : step > s
                  ? "text-emerald-400"
                  : "text-zinc-500"
              }`}
            >
              {s === 1 && "1. Entrada de Dados"}
              {s === 2 && "2. Revisão & Criação"}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">
              Cole os dados brutos da conversa do WhatsApp, e-mail ou anotação para criar o evento e contrato automaticamente:
            </p>
            <Textarea
              className="min-h-[180px] font-mono text-xs bg-black/60 border-white/10 focus-visible:ring-emerald-500"
              placeholder={
                "Nome: Beatriz Santos\nEvento: Casamento\nData: 18/10/2026 às 16h\nLocal: Espaço das Palmeiras\nValor: R$ 5.500"
              }
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
            />
            <Button
              onClick={handleStep1}
              disabled={loading || !rawInput.trim()}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-11"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Interpretando Dados...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" /> Extrair Informações do Evento
                </>
              )}
            </Button>
          </div>
        )}

        {step === 2 && preContractData && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-zinc-900 border border-white/10 space-y-2 text-sm">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-zinc-400">Cliente:</span>
                <span className="font-semibold text-white">{preContractData.client?.full_name}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-zinc-400">Tipo:</span>
                <span className="font-semibold text-emerald-400">{preContractData.event?.event_type}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-zinc-400">Data:</span>
                <span className="font-semibold text-white">{preContractData.event?.event_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Valor Estimado:</span>
                <span className="font-semibold text-emerald-400">
                  R$ {preContractData.financial?.package_value?.toLocaleString("pt-BR") || "A definir"}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-white/10">
                Voltar e Corrigir
              </Button>
              <Button onClick={handleFinalize} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold">
                <Check className="w-4 h-4 mr-2" /> Salvar no CRM
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
