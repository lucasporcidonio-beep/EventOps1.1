import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isFirebaseConfigured } from "@/lib/firebase";
import { ArrowLeft, Upload, Download, Flame, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { generateSeedEvents } from "@/data/seedEvents";
import * as firebaseService from "@/services/firebaseService";

export default function Settings() {
  const navigate = useNavigate();
  const [isSeeding, setIsSeeding] = useState(false);

  // Exportar backup local/firestore para arquivo JSON
  const handleExportJson = () => {
    try {
      const backupData = {
        exportedAt: new Date().toISOString(),
        events: JSON.parse(localStorage.getItem("eventops_events") || "[]"),
        contracts: JSON.parse(localStorage.getItem("eventops_contracts") || "[]"),
        professionals: JSON.parse(localStorage.getItem("eventops_professionals") || "[]"),
        assignments: JSON.parse(localStorage.getItem("eventops_assignments") || "[]"),
        checklists: JSON.parse(localStorage.getItem("eventops_checklists") || "[]"),
        subEvents: JSON.parse(localStorage.getItem("eventops_sub_events") || "[]"),
        expenses: JSON.parse(localStorage.getItem("eventops_expenses") || "[]"),
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `eventops-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup JSON exportado com sucesso!");
    } catch {
      toast.error("Erro ao gerar backup.");
    }
  };

  // Restaurar dados via arquivo JSON
  const handleRestoreJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.events) localStorage.setItem("eventops_events", JSON.stringify(data.events));
        if (data.contracts) localStorage.setItem("eventops_contracts", JSON.stringify(data.contracts));
        if (data.professionals) localStorage.setItem("eventops_professionals", JSON.stringify(data.professionals));
        if (data.assignments) localStorage.setItem("eventops_assignments", JSON.stringify(data.assignments));
        if (data.checklists) localStorage.setItem("eventops_checklists", JSON.stringify(data.checklists));
        if (data.subEvents) localStorage.setItem("eventops_sub_events", JSON.stringify(data.subEvents));
        if (data.expenses) localStorage.setItem("eventops_expenses", JSON.stringify(data.expenses));

        toast.success("Backup importado com sucesso! Atualizando aplicação...");
        setTimeout(() => window.location.reload(), 1200);
      } catch {
        toast.error("Arquivo JSON inválido.");
      }
    };
    reader.readAsText(file);
  };

  // Popular o Firestore diretamente caso conectado
  const handleSeedFirebase = async () => {
    if (!window.confirm("Deseja enviar os dados de demonstração para o seu banco Firebase?")) return;

    setIsSeeding(true);
    try {
      const seed = generateSeedEvents();
      for (const ev of seed.events) {
        const ctr = seed.contracts.find((c) => c.event_id === ev.id) || {};
        const chk = seed.checklists.find((c) => c.event_id === ev.id) || {};
        await firebaseService.createEventWithDefaults(ev, ctr, chk, {});
      }
      for (const prof of seed.professionals) {
        await firebaseService.addProfessionalDoc(prof);
      }
      toast.success("Dados de demonstração enviados para o Firebase com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar dados para o Firebase. Verifique suas regras no Firestore.");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Configurações & Banco de Dados</h1>
      </div>

      <div className="space-y-6">
        {/* Status do Banco Firebase */}
        <Card className={isFirebaseConfigured ? "border-emerald-500/50" : "border-amber-500/50"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className={isFirebaseConfigured ? "h-5 w-5 text-emerald-500" : "h-5 w-5 text-amber-500"} />
              Status do Banco de Dados
            </CardTitle>
            <CardDescription>
              {isFirebaseConfigured
                ? "Sua aplicação está conectada ao Google Firebase Cloud Firestore com sincronização em tempo real e cache offline."
                : "O aplicativo está rodando em modo Demonstração Local (armazenamento seguro no navegador)."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              {isFirebaseConfigured ? (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Firebase Conectado e Ativo</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Modo Local / Demonstração (Sem servidor necessário)</span>
                </div>
              )}
            </div>

            {!isFirebaseConfigured && (
              <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                <p className="font-semibold text-foreground">Como conectar seu Firebase em 3 passos:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs sm:text-sm">
                  <li>Acesse o <strong>Firebase Console</strong> (console.firebase.google.com) e crie um projeto gratuito.</li>
                  <li>Ative o <strong>Cloud Firestore</strong> em modo de teste ou cole as regras de <code>firestore.rules</code>.</li>
                  <li>Adicione um Web App (<code>&lt;/&gt;</code>) e copie as chaves para o arquivo <code>.env</code> na raiz do projeto.</li>
                </ol>
              </div>
            )}

            {isFirebaseConfigured && (
              <Button onClick={handleSeedFirebase} disabled={isSeeding} className="w-full">
                <RefreshCw className={`h-4 w-4 mr-2 ${isSeeding ? "animate-spin" : ""}`} />
                {isSeeding ? "Enviando dados..." : "Povoar Firebase com Eventos de Exemplo"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Backup & Restauração JSON */}
        <Card>
          <CardHeader>
            <CardTitle>Backup e Restauração Instantânea</CardTitle>
            <CardDescription>
              Exporte seus eventos, contratos e equipe para um arquivo JSON leve ou restaure backups anteriores sem precisar de servidores locais.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <Button onClick={handleExportJson} variant="outline" className="flex-1">
              <Download className="h-4 w-4 mr-2" /> Baixar Backup JSON
            </Button>

            <div className="relative flex-1">
              <input
                type="file"
                accept=".json"
                onChange={handleRestoreJson}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline" className="w-full">
                <Upload className="h-4 w-4 mr-2" /> Restaurar Backup (.json)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
