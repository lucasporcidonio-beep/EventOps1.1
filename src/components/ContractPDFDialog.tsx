import { useState, useRef, useEffect } from "react";
import type { Event } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Download, 
  Loader2, 
  RefreshCcw, 
  Edit, 
  Eye, 
  Copy, 
  Check, 
  Trash2, 
  Key, 
  Sparkles, 
  ShieldAlert 
} from "lucide-react";
import html2pdf from "html2pdf.js";
import { marked } from "marked";
import { 
  generateContractAI, 
  getGeminiApiKey, 
  setGeminiApiKey 
} from "@/services/aiService";
import * as firebaseService from "@/services/firebaseService";
import { isFirebaseConfigured, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event;
}

export function ContractPDFDialog({ open, onOpenChange, event }: Props) {
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [contractText, setContractText] = useState("");
  const [parsedHtml, setParsedHtml] = useState("");
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [copied, setCopied] = useState(false);
  const [rawInput, setRawInput] = useState("");
  const [inputMode, setInputMode] = useState<"auto" | "manual">("auto");
  const [hasSaved, setHasSaved] = useState(false);
  const [phase, setPhase] = useState<"idle" | "loaded" | "generating" | "done">("idle");
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState(getGeminiApiKey());
  const printRef = useRef<HTMLDivElement>(null);

  // Busca contrato existente diretamente no Firestore ou localStorage
  useEffect(() => {
    if (!open) return;
    setLoadingExisting(true);

    const loadContract = async () => {
      try {
        let existingText = "";

        if (isFirebaseConfigured && db) {
          const q = query(
            collection(db, firebaseService.COLLECTIONS.CONTRACTS),
            where("event_id", "==", event.id)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            existingText = (snap.docs[0].data() as any).generated_contract_text || "";
          }
        } else {
          const localContracts = JSON.parse(localStorage.getItem("eventops_contracts") || "[]");
          const found = localContracts.find((c: any) => c.event_id === event.id);
          existingText = found?.generated_contract_text || "";
        }

        if (existingText && existingText.trim()) {
          setContractText(existingText);
          const html = await marked.parse(existingText);
          setParsedHtml(String(html));
          setHasSaved(true);
          setPhase("loaded");
        } else {
          setHasSaved(false);
          setPhase("idle");
        }
      } catch (err) {
        console.error("Erro ao carregar contrato:", err);
        setPhase("idle");
      } finally {
        setLoadingExisting(false);
      }
    };

    loadContract();
  }, [open, event.id]);

  const saveContractToDb = async (text: string) => {
    try {
      if (isFirebaseConfigured) {
        await firebaseService.upsertContractDoc(event.id, {
          generated_contract_text: text,
        });
      } else {
        const localContracts = JSON.parse(localStorage.getItem("eventops_contracts") || "[]");
        const idx = localContracts.findIndex((c: any) => c.event_id === event.id);
        if (idx >= 0) {
          localContracts[idx].generated_contract_text = text;
        } else {
          localContracts.push({
            id: crypto.randomUUID(),
            event_id: event.id,
            generated_contract_text: text,
          });
        }
        localStorage.setItem("eventops_contracts", JSON.stringify(localContracts));
      }
    } catch (err) {
      console.error("Erro ao salvar contrato:", err);
    }
  };

  const handleGenerateContract = async () => {
    setPhase("generating");
    setLoading(true);
    try {
      const res = await generateContractAI(
        event,
        inputMode === "manual" && rawInput.trim() ? rawInput : undefined
      );

      if (res.contractText) {
        setContractText(res.contractText);
        const html = await marked.parse(res.contractText);
        setParsedHtml(String(html));
        setPhase("done");
        setHasSaved(true);
        await saveContractToDb(res.contractText);

        if (res.usedAI) {
          toast.success("Contrato gerado com sucesso via Inteligência Artificial!");
        } else {
          toast.info(
            "Contrato gerado com sucesso via Template Jurídico Especializado!",
            { description: "Todas as cláusulas, valores e dados foram preenchidos." }
          );
        }
      }
    } catch (err: any) {
      console.error("Falha ao gerar contrato:", err);
      toast.error("Erro ao processar contrato.");
      setPhase("idle");
    } finally {
      setLoading(false);
    }
  };

  const handleContractEdit = async (text: string) => {
    setContractText(text);
    const html = await marked.parse(text);
    setParsedHtml(String(html));
    await saveContractToDb(text);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(contractText);
    setCopied(true);
    toast.success("Texto do contrato copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!window.confirm("Deseja apagar o contrato gerado deste evento?")) return;
    await saveContractToDb("");
    setContractText("");
    setParsedHtml("");
    setHasSaved(false);
    setPhase("idle");
    setRawInput("");
    setInputMode("auto");
    setMode("preview");
    toast.info("Contrato apagado.");
  };

  const handleDownloadPDF = () => {
    if (!printRef.current) return;
    const filename = `Contrato_${event.client_name.replace(/\s+/g, "_")}.pdf`;
    const opt = {
      margin: [15, 15, 15, 15] as [number, number, number, number],
      filename,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
    };
    html2pdf().set(opt).from(printRef.current).save();
    toast.success("Download do PDF iniciado!");
  };

  const handleSaveGeminiKey = () => {
    setGeminiApiKey(geminiKeyInput);
    setShowKeyConfig(false);
    toast.success("Chave Gemini salva!");
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
      <DialogContent className="max-w-4xl bg-zinc-950 border-white/10 max-h-[92vh] flex flex-col gap-0 p-0 text-zinc-100 shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-white/10">
          <DialogTitle className="flex flex-wrap items-center justify-between gap-2 text-white">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-400" />
              <span>Contrato Inteligente — {event.client_name}</span>
              {hasSaved && phase !== "generating" && (
                <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                  Salvo
                </span>
              )}
            </div>
            {isViewingContract && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Apagar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="border-white/10 text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1 text-emerald-400" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" /> Copiar Texto
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode(mode === "preview" ? "edit" : "preview")}
                  className="border-white/10 text-xs"
                >
                  {mode === "preview" ? (
                    <>
                      <Edit className="h-4 w-4 mr-1" /> Editar
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-1" /> Visualizar
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPhase("idle")}
                  className="border-white/10 text-xs"
                >
                  <RefreshCcw className="h-4 w-4 mr-1" /> Gerar Novo
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleDownloadPDF}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs"
                >
                  <Download className="h-4 w-4 mr-1" /> Baixar PDF
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Carregando do banco */}
          {loadingExisting && (
            <div className="flex items-center justify-center h-48 text-zinc-400">
              <Loader2 className="h-8 w-8 animate-spin mr-3 text-emerald-400" /> Verificando contratos salvos no Firestore...
            </div>
          )}

          {/* Gerando contrato */}
          {phase === "generating" && (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-300">
              <Loader2 className="h-10 w-10 animate-spin mb-4 text-emerald-400" />
              <p className="font-semibold text-lg text-white">Redigindo o contrato...</p>
              <p className="text-xs text-zinc-400 mt-1">
                Processando cláusulas, prazos e dados do evento. Aguarde alguns instantes.
              </p>
            </div>
          )}

          {/* Tela de Seleção / Geração */}
          {!loadingExisting && phase === "idle" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-300">
                  Escolha como deseja gerar o contrato para <strong className="text-white">{event.client_name}</strong>:
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowKeyConfig(!showKeyConfig)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  <Key className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                  {showKeyConfig ? "Fechar Config" : "Configurar Chave Gemini"}
                </Button>
              </div>

              {/* Painel opcional de Chave Gemini */}
              {showKeyConfig && (
                <div className="p-4 rounded-xl border border-white/10 bg-zinc-900/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-white">Chave de API do Google Gemini (Opcional)</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Você pode conectar sua chave gratuita gerada em{" "}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 underline"
                    >
                      Google AI Studio
                    </a>
                    . Caso não tenha uma chave, o sistema usará automaticamente o Template Jurídico Completo do Lucas.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="Cole sua API Key do Gemini (AIzaSy...)"
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyInput(e.target.value)}
                      className="bg-black/50 border-white/10 text-xs"
                    />
                    <Button size="sm" onClick={handleSaveGeminiKey} className="bg-emerald-500 hover:bg-emerald-400 text-black">
                      Salvar Chave
                    </Button>
                  </div>
                </div>
              )}

              {hasSaved && (
                <div
                  className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 cursor-pointer hover:bg-emerald-500/15 transition"
                  onClick={() => setPhase("loaded")}
                >
                  <FileText className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-emerald-300">📄 Contrato já salvo — Abrir sem gerar novamente</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Um contrato já foi gerado anteriormente para este evento. Clique aqui para abri-lo.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  className={`flex-1 rounded-xl border p-4 text-left transition-all ${
                    inputMode === "auto"
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-white/10 hover:border-white/20 bg-zinc-900/50"
                  }`}
                  onClick={() => setInputMode("auto")}
                >
                  <p className="font-semibold text-sm text-white">📂 Usar dados do evento</p>
                  <p className="text-xs text-zinc-400 mt-1">Preenche automaticamente com os dados do cadastro no CRM</p>
                </button>
                <button
                  className={`flex-1 rounded-xl border p-4 text-left transition-all ${
                    inputMode === "manual"
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-white/10 hover:border-white/20 bg-zinc-900/50"
                  }`}
                  onClick={() => setInputMode("manual")}
                >
                  <p className="font-semibold text-sm text-white">📋 Colar dados manualmente</p>
                  <p className="text-xs text-zinc-400 mt-1">Cole uma mensagem do WhatsApp ou e-mail com os dados do cliente</p>
                </button>
              </div>

              {inputMode === "manual" && (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-400">Cole abaixo os dados do cliente em qualquer formato:</p>
                  <textarea
                    className="w-full h-40 p-3 font-mono text-xs bg-black/60 border border-white/10 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-200 resize-none"
                    placeholder={
                      "Nome completo: ...\nRG: ...\nData de Nascimento: ...\nCelular: ...\nEndereço: ...\nData e horário do evento: ...\nLocais: ...\nValor e forma de pagamento: ..."
                    }
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                  />
                </div>
              )}

              <Button
                size="lg"
                onClick={handleGenerateContract}
                disabled={inputMode === "manual" && !rawInput.trim()}
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-lg shadow-emerald-500/20 rounded-xl"
              >
                <FileText className="h-4 w-4 mr-2" />
                {hasSaved ? "Gerar Novo Contrato" : "Gerar Contrato Agora"}
              </Button>
            </div>
          )}

          {/* Visualização do Contrato */}
          {!loadingExisting && isViewingContract && mode === "preview" && (
            <div className="bg-white text-black p-8 sm:p-12 rounded-xl shadow-xl">
              <div
                ref={printRef}
                className="prose prose-sm max-w-none text-black"
                style={{ fontFamily: "Georgia, serif", fontSize: "14px", lineHeight: "1.75" }}
                dangerouslySetInnerHTML={{ __html: parsedHtml }}
              />
            </div>
          )}

          {/* Modo Edição */}
          {!loadingExisting && isViewingContract && mode === "edit" && (
            <textarea
              className="w-full h-[500px] p-4 font-mono text-xs bg-black/60 border border-white/10 rounded-xl whitespace-pre-wrap outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-200"
              value={contractText}
              onChange={(e) => handleContractEdit(e.target.value)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
