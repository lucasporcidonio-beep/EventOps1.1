import { useState, useRef, useEffect } from "react";
import type { Event } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2, RefreshCcw, Edit, Eye, Copy, Check, Trash2 } from "lucide-react";
import html2pdf from "html2pdf.js";
import { marked } from "marked";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event;
}

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function ContractPDFDialog({ open, onOpenChange, event }: Props) {
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [contractText, setContractText] = useState("");
  const [parsedHtml, setParsedHtml] = useState("");
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [copied, setCopied] = useState(false);
  const [rawInput, setRawInput] = useState("");
  const [inputMode, setInputMode] = useState<"auto" | "manual">("auto");
  const [hasSaved, setHasSaved] = useState(false); // whether a saved contract exists for this event
  // 'idle' = selection screen | 'loaded' = showing existing | 'generating' = AI in progress | 'done' = showing result
  const [phase, setPhase] = useState<"idle" | "loaded" | "generating" | "done">("idle");
  const printRef = useRef<HTMLDivElement>(null);

  // On dialog open, check database for an existing saved contract
  useEffect(() => {
    if (!open) return;
    setLoadingExisting(true);
    fetch(`${API}/contracts/by-event/${event.id}/contract-text`)
      .then(r => r.json())
      .then(data => {
        if (data.contractText) {
          setContractText(data.contractText);
          marked.parse(data.contractText).then(html => setParsedHtml(String(html)));
          setHasSaved(true);
          setPhase("loaded"); // go straight to viewing the existing contract
        } else {
          setHasSaved(false);
          setPhase("idle");
        }
      })
      .catch(() => setPhase("idle"))
      .finally(() => setLoadingExisting(false));
  }, [open, event.id]);

  const saveContractToDb = async (text: string) => {
    await fetch(`${API}/contracts/by-event/${event.id}/contract-text`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contractText: text }),
    });
  };

  const fetchContract = async () => {
    setPhase("generating");
    setLoading(true);
    try {
      const body = inputMode === "manual" && rawInput.trim()
        ? { rawText: rawInput }
        : { eventData: event };

      const res = await fetch(`${API}/api/ai/generate-contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.contractText) {
        setContractText(data.contractText);
        const html = await marked.parse(data.contractText);
        setParsedHtml(String(html));
        setPhase("done");
        setHasSaved(true);
        // Auto-save to DB
        await saveContractToDb(data.contractText);
      }
    } catch (err) {
      console.error("Failed to generate contract", err);
      setPhase("idle");
    } finally {
      setLoading(false);
    }
  };

  const handleContractEdit = async (text: string) => {
    setContractText(text);
    const html = await marked.parse(text);
    setParsedHtml(String(html));
    // Auto-save edits to DB
    await saveContractToDb(text);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(contractText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    await saveContractToDb(""); // clear from DB
    setContractText("");
    setParsedHtml("");
    setHasSaved(false);
    setPhase("idle");
    setRawInput("");
    setInputMode("auto");
    setMode("preview");
  };

  const handleDownloadPDF = () => {
    if (!printRef.current) return;
    const filename = `Contrato_${event.client_name.replace(/\s+/g, "_")}.pdf`;
    const opt = {
      margin:       [15, 15, 15, 15] as [number, number, number, number],
      filename,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };
    html2pdf().set(opt).from(printRef.current).save();
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setContractText("");
      setParsedHtml("");
      setRawInput("");
      setInputMode("auto");
      setMode("preview");
      setPhase("idle");
      setHasSaved(false);
    }
    onOpenChange(v);
  };

  const isViewingContract = (phase === "loaded" || phase === "done") && contractText;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl bg-card border-border max-h-[92vh] flex flex-col gap-0 p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
          <DialogTitle className="flex flex-wrap items-center justify-between gap-2 text-foreground">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contrato Inteligente — {event.client_name}
              {hasSaved && phase !== "generating" && (
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Salvo</span>
              )}
            </div>
            {isViewingContract && (
              <div className="flex gap-2 flex-wrap">
                <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" /> Apagar
                </Button>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <><Check className="h-4 w-4 mr-1 text-green-500" />Copiado!</> : <><Copy className="h-4 w-4 mr-1" />Copiar Texto</>}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMode(mode === "preview" ? "edit" : "preview")}>
                  {mode === "preview" ? <><Edit className="h-4 w-4 mr-1" />Editar</> : <><Eye className="h-4 w-4 mr-1" />Visualizar</>}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPhase("idle")}>
                  <RefreshCcw className="h-4 w-4 mr-1" /> Gerar Novo
                </Button>
                <Button variant="default" size="sm" onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-1" /> Baixar PDF
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Checking DB for existing contract */}
          {loadingExisting && (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mr-3" /> Verificando contratos salvos...
            </div>
          )}

          {/* AI is generating */}
          {phase === "generating" && (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
              <p className="font-medium">Redigindo o contrato...</p>
              <p className="text-xs mt-1">A IA está processando os dados. Aguarde cerca de 15 segundos.</p>
            </div>
          )}

          {/* Selection / generation screen */}
          {!loadingExisting && phase === "idle" && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Escolha como deseja gerar o contrato para <strong>{event.client_name}</strong>:
              </p>

              {hasSaved && (
                <div
                  className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-4 cursor-pointer hover:bg-green-500/20 transition"
                  onClick={() => setPhase("loaded")}
                >
                  <FileText className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-green-300">📄 Contrato já salvo — Abrir sem gerar novamente</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Um contrato foi gerado anteriormente para este evento. Clique para abri-lo.</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  className={`flex-1 rounded-lg border p-4 text-left transition-all ${inputMode === "auto" ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground"}`}
                  onClick={() => setInputMode("auto")}
                >
                  <p className="font-medium text-sm">📂 Usar dados do evento</p>
                  <p className="text-xs text-muted-foreground mt-1">Preenche automaticamente com os dados já cadastrados</p>
                </button>
                <button
                  className={`flex-1 rounded-lg border p-4 text-left transition-all ${inputMode === "manual" ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground"}`}
                  onClick={() => setInputMode("manual")}
                >
                  <p className="font-medium text-sm">📋 Colar dados manualmente</p>
                  <p className="text-xs text-muted-foreground mt-1">Cole um texto com os dados do cliente (WhatsApp, e-mail, etc.)</p>
                </button>
              </div>

              {inputMode === "manual" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Cole abaixo os dados do cliente em qualquer formato:</p>
                  <textarea
                    className="w-full h-40 p-3 font-mono text-sm bg-background border border-border rounded outline-none focus:ring-1 focus:ring-primary text-foreground resize-none"
                    placeholder={"Nome completo: ...\nRG: ...\nData de Nascimento: ...\nCelular: ...\nEndereço: ...\nData e horário do evento: ...\nLocais: ...\nValor e forma de pagamento: ..."}
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                  />
                </div>
              )}

              <Button
                size="lg"
                onClick={fetchContract}
                disabled={inputMode === "manual" && !rawInput.trim()}
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                {hasSaved ? "Gerar Novo Contrato" : "Gerar Contrato com IA"}
              </Button>
            </div>
          )}

          {/* Viewing saved or generated contract */}
          {!loadingExisting && isViewingContract && mode === "preview" && (
            <div
              ref={printRef}
              className="prose prose-sm dark:prose-invert max-w-none"
              style={{ fontFamily: "Georgia, serif", fontSize: "14px", lineHeight: "1.75" }}
              dangerouslySetInnerHTML={{ __html: parsedHtml }}
            />
          )}

          {!loadingExisting && isViewingContract && mode === "edit" && (
            <textarea
              className="w-full h-[500px] p-4 font-mono text-sm bg-background border border-border rounded whitespace-pre-wrap outline-none focus:ring-1 focus:ring-primary text-foreground"
              value={contractText}
              onChange={(e) => handleContractEdit(e.target.value)}
            />
          )}
        </div>

        {/* Hidden print target when in edit mode */}
        {isViewingContract && mode === "edit" && (
          <div className="hidden" aria-hidden="true">
            <div ref={printRef} dangerouslySetInnerHTML={{ __html: parsedHtml }}
              style={{ fontFamily: "Georgia, serif", fontSize: "14px", padding: "0 8px" }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
