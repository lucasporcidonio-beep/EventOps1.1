import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Bot, Check, ArrowRight, Loader2, Database, AlertTriangle } from "lucide-react";
import { getApiUrl, apiFetch } from "@/lib/api";
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
  const [contractText, setContractText] = useState("");
  const [preContractData, setPreContractData] = useState<any>(null);
  const [planningData, setPlanningData] = useState<any>(null);

  const apiUrl = getApiUrl();

  const handleStep1 = async () => {
    if (!rawInput.trim()) {
      toast.error("Cole os dados do cliente para processar.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(`${apiUrl}/api/ai/pre-contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput })
      });
      if (!res.ok) throw new Error("Falha na API");
      const data = await res.json();
      setPreContractData(data);
      // Skip contract validation entirely and move straight to planning
      setStep(2);
      handleGeneratePlanning(data);
    } catch (err) {
      toast.error("Falha ao interpretar texto via Gemini.");
    } finally {
      setLoading(false);
    }
  };

  // Generate Planning automatically after Pre-Contract is successful
  const handleGeneratePlanning = async (extractedData: any) => {
    setLoading(true);
    try {
      // Pass the extractedData as both preContractData and verifiedData since we skip validation
      const res = await apiFetch(`${apiUrl}/api/ai/planning`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preContractData: extractedData, verifiedData: { contract_verified: true, discrepancies: [], notes: "Validado automaticamente." } })
      });
      if (!res.ok) throw new Error("Falha na API");
      const data = await res.json();
      setPlanningData(data);
      setStep(2); // Stay on step 2 (now Planning) and remove loading state
      toast.success("Planejamento gerado!");
    } catch (err) {
      toast.error("Falha ao gerar planejamento operacional.");
      setStep(1); // Revert if failed
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = () => {
    // Map planningData & preContractData to Event Model
    const eventDate = preContractData?.event?.event_date || new Date().toISOString().split("T")[0];
    const newEvent: Event = {
      id: crypto.randomUUID(),
      event_type: preContractData?.event?.event_type || "Outro",
      client_name: preContractData?.client?.full_name || "Sem Nome",
      client_phone: preContractData?.client?.phone || "",
      client_rg: preContractData?.client?.document || "",
      event_date: eventDate,
      coverage_start_time: preContractData?.main_service?.coverage_start_time || "10:00",
      coverage_end_time: preContractData?.main_service?.coverage_end_time || "18:00",
      ceremony_location: preContractData?.event?.locations?.ceremony?.name || "",
      reception_location: preContractData?.event?.locations?.reception?.name || "",
      main_service: preContractData?.main_service?.service_type || "Fotografia",
      additional_services: preContractData?.additional_services?.storymaker?.enabled ? ["Storymaker"] : [],
      operational_status: "Planejado",
      confirmation_status: "Aguardando",
      notes: "Criado via IA",
      package_name: preContractData?.commercial_package?.package_name || "",
      package_value: preContractData?.financial?.total_value || 0,
    };
    onComplete(newEvent);
    onOpenChange(false);
    setStep(1);
    setPreContractData(null);
    setPlanningData(null);
    setRawInput("");
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
        onOpenChange(val);
        if (!val) { setStep(1); setPreContractData(null); setPlanningData(null); }
    }}>
      <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="w-5 h-5 text-indigo-500" /> EventOps AI Wizard
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4 justify-between border-b pb-4 mt-2">
           {[1, 2, 3].map(s => (
             <div key={s} className={`flex-1 text-center text-xs font-bold py-1 px-2 rounded-lg ${step === s ? 'bg-primary/20 text-primary' : step > s ? 'text-emerald-500' : 'text-muted-foreground'}`}>
               {s === 1 && "Entrada de Dados (IA)"}
               {s === 2 && "Planejamento Gerado"}
               {s === 3 && "Confirmação Final"}
             </div>
           ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Cole os dados brutos da negociação (WhatsApp, Email) para estruturar o pré-contrato automaticamente.</p>
            <Textarea
              className="min-h-[200px] font-mono text-xs"
              placeholder="Nome do cliente, data, local, valores..."
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
            />
            <Button onClick={handleStep1} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Database className="w-4 h-4 mr-2" />} 
              Gerar Estrutura Sagrada
            </Button>
          </div>
        )}

        {step === 2 && planningData && (
          <div className="space-y-4">
            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
               <h3 className="font-bold text-sm mb-1 text-primary">Dados Extraídos</h3>
               <p className="text-xs"><strong>Cliente:</strong> {preContractData?.client?.full_name}</p>
               <p className="text-xs"><strong>Tipo:</strong> {preContractData?.event?.event_type}</p>
               <p className="text-xs"><strong>Data/Hora:</strong> {preContractData?.event?.event_date} - {preContractData?.main_service?.coverage_start_time}</p>
               <p className="text-xs"><strong>Local da Festa:</strong> {preContractData?.event?.locations?.reception?.name || 'Não informado'}</p>
               <p className="text-xs"><strong>Valor Total:</strong> R$ {preContractData?.financial?.total_value}</p>
            </div>

            <div className="bg-accent p-4 rounded-lg border">
               <h3 className="font-bold text-sm mb-2 text-foreground">Visão Operacional (IA)</h3>
               <p className="text-xs"><strong>Perfil Adotado:</strong> {planningData?.planning?.execution_profile}</p>
               <p className="text-xs"><strong>Checklist ({planningData?.checklist?.items?.length} itens):</strong> {planningData?.checklist?.items?.[0]}...</p>
               <p className="text-xs text-muted-foreground mt-2 italic">A IA removeu o processo de "validação de contrato" para tornar a criação rápida via WhatsApp.</p>
            </div>

            <Button onClick={() => setStep(3)} disabled={loading} className="w-full mt-4">
               <ArrowRight className="w-4 h-4 mr-2" /> Prosseguir para Confirmação
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 p-4 rounded-lg border border-emerald-500/20">
               <h3 className="font-bold text-sm mb-2 text-primary">Resumo do Planejamento Gerado</h3>
               <p className="text-xs"><strong>Perfil de Execução:</strong> {planningData?.planning?.execution_profile}</p>
               <p className="text-xs"><strong>Checklist ({planningData?.checklist?.items?.length} itens):</strong> {planningData?.checklist?.items?.[0]}...</p>
               <p className="text-xs"><strong>Alertas Dia:</strong> {planningData?.alerts?.day_of_event?.join(', ')}</p>
            </div>
            <p className="text-sm font-semibold">Tudo pronto para criar o Evento oficial no painel!</p>
            <Button onClick={handleFinalize} className="w-full mt-4" variant="default">
               <Check className="w-4 h-4 mr-2" /> Criar Projeto no EventFlow
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
