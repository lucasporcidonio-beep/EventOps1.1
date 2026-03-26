import { useState } from "react";
import type { ClientDataInput } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: ClientDataInput) => void;
}

function parseClientData(text: string): Partial<ClientDataInput> {
  const result: Partial<ClientDataInput> = {};
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const extract = (pattern: RegExp): string | undefined => {
    const match = text.match(pattern);
    return match ? match[1].trim() : undefined;
  };

  // Nome: first non-empty line that doesn't look like a label
  const firstLine = lines[0];
  if (firstLine && !/^[\*]?\s*(RG|Data|Cel|End|Dia|Hora|Pacote|Valor|Entrada)/i.test(firstLine)) {
    result.full_name = firstLine.replace(/^\*\s*/, "").replace(/^Nome\s*(completo)?\s*[:\-]\s*/i, "").trim();
  }

  result.rg = extract(/\*?\s*RG\s*[:\-]\s*(.+)/i);
  result.birthdate = extract(/\*?\s*(?:Data\s+de\s+Nascimento|Data\s+Nasc\.?|Nascimento|Data\s+de\s+nasc\.?)\s*[:\-]?\s*(.+)/i);
  result.phone = extract(/\*?\s*(?:Celular|Cel\.?|Telefone|Tel\.?|WhatsApp|Fone)\s*[:\-]?\s*(.+)/i);

  // Endereço da festa MUST be matched BEFORE generic endereço
  result.event_address = extract(/\*?\s*(?:Endereço\s+da\s+festa|End\.?\s+da\s+festa|Local\s+da\s+festa|Endereço\s+do\s+evento)(?:\s*\(.*?\))?\s*[:\-]?\s*(.+)/i);
  // Generic address: match "End:" or "Endereço:" but NOT "Endereço da festa"
  result.address = extract(/\*?\s*(?:End(?:ereço)?\.?)\s*[:\-]\s*(?!da\s+festa)(.+)/i);

  // Date and time - separate or combined
  const dateTime = extract(/\*?\s*(?:Data\s+e\s+hora\s+da\s+festa|Data\s*\/?\s*hora)(?:\s*\(.*?\))?\s*[:\-]?\s*(.+)/i);
  if (dateTime) {
    result.event_date_time = dateTime;
    // Split into date and time parts
    const dPart = dateTime.match(/([\d\/\.\-]+)/);
    const tPart = dateTime.match(/(\d{1,2}:\d{2})/);
    if (dPart) result.event_date_raw = dPart[1];
    if (tPart) result.event_time_raw = tPart[1];
  } else {
    const day = extract(/\**\s*(?:Dia|Data\s+da\s+festa|Data\s+do\s+evento)\s*[:\-]?\s*([\d\/\.\-]+)/i);
    const time = extract(/\**\s*(?:Hora|Horário|Horario)\s*[:\-]?\s*([\d:]+)/i);
    if (day) {
      result.event_date_raw = day;
      result.event_date_time = time ? `${day} ${time}` : day;
    }
    if (time) result.event_time_raw = time;
  }

  result.debutante_name = extract(/\*?\s*Nome\s+da\s+debutante\s*[:\-]\s*(.+)/i);
  result.groom_name = extract(/\*?\s*Nome\s+do\s+noivo\s*[:\-]\s*(.+)/i);
  result.bride_name = extract(/\*?\s*Nome\s+da\s+noiva\s*[:\-]\s*(.+)/i);
  result.birthday_person_name = extract(/\*?\s*(?:Nome\s+d[oa]\s+aniversariante|Aniversariante)\s*[:\-]\s*(.+)/i);

  // Combined debutante/aniversariante field
  if (!result.debutante_name && !result.birthday_person_name) {
    const combo = extract(/\*?\s*Nome\s+da\s+debutante\s*\/\s*Aniversariante\s*[:\-]\s*(.+)/i);
    if (combo) {
      result.debutante_name = combo;
      result.birthday_person_name = combo;
    }
  }

  // If there's a standalone name line after address/date lines and before Pacote, it might be debutante/birthday person
  if (!result.debutante_name && !result.birthday_person_name && !result.groom_name) {
    const nameLineIdx = lines.findIndex((l, i) => {
      if (i === 0) return false; // skip first line (client name)
      const isLabel = /^[\*]?\s*(RG|Data|Cel|End|Dia|Hora|Pacote|Valor|Entrada|Nome\s+completo)/i.test(l);
      const isAfterAddress = lines.slice(0, i).some((prev) => /End|Endereço/i.test(prev));
      return !isLabel && isAfterAddress && l.length > 2 && !/^\d/.test(l) && !/R\$/.test(l);
    });
    if (nameLineIdx >= 0) {
      result.debutante_name = lines[nameLineIdx].replace(/^\*\s*/, "").trim();
    }
  }

  result.package_name = extract(/\*?\s*(?:Pacote\s+escolhido|Pacote)\s*[:\-]?\s*(.+)/i);

  // "Valor" alone = total value, but NOT "Valor da entrada"
  const totalMatch = extract(/\*?\s*(?:Valor\s+total|Valor)\s*[:\-]?\s*R?\$?\s*([\d.,]+)/i);
  if (totalMatch) result.package_value = parseFloat(totalMatch.replace(/\./g, "").replace(",", "."));

  const entryMatch = extract(/\*?\s*(?:Valor\s+da\s+entrada|Entrada)\s*[:\-]?\s*R?\$?\s*([\d.,]+)/i);
  if (entryMatch) result.entry_value = parseFloat(entryMatch.replace(/\./g, "").replace(",", "."));

  // Remove undefined keys
  Object.keys(result).forEach((k) => {
    if (result[k as keyof ClientDataInput] === undefined) delete result[k as keyof ClientDataInput];
  });

  // Detect event type
  const lower = text.toLowerCase();
  if (result.debutante_name || lower.includes("debutante") || lower.includes("15 anos")) {
    result.event_type_hint = "Debutante";
  } else if (result.groom_name || result.bride_name || lower.includes("casamento") || lower.includes("noiv")) {
    result.event_type_hint = "Casamento";
  } else if (result.birthday_person_name || lower.includes("aniversário") || lower.includes("aniversario")) {
    result.event_type_hint = "Aniversário";
  } else if (lower.includes("batizado") || lower.includes("batismo") || lower.includes("igreja")) {
    result.event_type_hint = "Evento Religioso";
  } else if (lower.includes("ensaio")) {
    result.event_type_hint = "Ensaio";
  } else if (lower.includes("corporativo") || lower.includes("empresa")) {
    result.event_type_hint = "Evento Corporativo";
  }

  return result;
}

export function ClientDataImport({ open, onOpenChange, onImport }: Props) {
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<Partial<ClientDataInput> | null>(null);

  const handleParse = () => {
    const data = parseClientData(rawText);
    setParsed(data);
  };

  const handleConfirm = () => {
    if (parsed) {
      onImport(parsed as ClientDataInput);
      setRawText("");
      setParsed(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <FileText className="h-5 w-5" />
            Importar Dados do Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Cole os dados do cliente abaixo:</Label>
            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={10}
              placeholder={`*Nome completo: ...\nRG: ...\n*Data de Nascimento: ...\nCelular: ...\n*Endereço: ...\nEndereço da festa: ...\n*Data e hora da festa: ...\n*Nome da debutante: ...\n*Nome do noivo: ...\n*Nome da noiva: ...\n*Nome do aniversariante: ...\n*Pacote escolhido: ...\n*Valor da entrada: ...`}
              className="font-mono text-sm"
            />
          </div>

          {!parsed && (
            <Button onClick={handleParse} disabled={!rawText.trim()} className="w-full">
              Processar Dados
            </Button>
          )}

          {parsed && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Dados Extraídos:</h4>
              <div className="bg-muted rounded-lg p-4 space-y-1 text-sm">
                {parsed.event_type_hint && <p><span className="text-primary font-medium">Tipo detectado:</span> {parsed.event_type_hint}</p>}
                {parsed.full_name && <p><span className="text-muted-foreground">Nome:</span> {parsed.full_name}</p>}
                {parsed.rg && <p><span className="text-muted-foreground">RG:</span> {parsed.rg}</p>}
                {parsed.birthdate && <p><span className="text-muted-foreground">Nascimento:</span> {parsed.birthdate}</p>}
                {parsed.phone && (
                  <p><span className="text-muted-foreground">Celular:</span> {parsed.phone}</p>
                )}
                {parsed.address && <p><span className="text-muted-foreground">Endereço:</span> {parsed.address}</p>}
                {parsed.event_address && <p><span className="text-muted-foreground">Local da festa:</span> {parsed.event_address}</p>}
                {parsed.event_date_raw && <p><span className="text-muted-foreground">Data:</span> {parsed.event_date_raw}</p>}
                {parsed.event_time_raw && <p><span className="text-muted-foreground">Hora:</span> {parsed.event_time_raw}</p>}
                {parsed.debutante_name && <p><span className="text-muted-foreground">Debutante:</span> {parsed.debutante_name}</p>}
                {parsed.groom_name && <p><span className="text-muted-foreground">Noivo:</span> {parsed.groom_name}</p>}
                {parsed.bride_name && <p><span className="text-muted-foreground">Noiva:</span> {parsed.bride_name}</p>}
                {parsed.birthday_person_name && <p><span className="text-muted-foreground">Aniversariante:</span> {parsed.birthday_person_name}</p>}
                {parsed.package_name && <p><span className="text-muted-foreground">Pacote:</span> {parsed.package_name}</p>}
                {parsed.package_value && <p><span className="text-muted-foreground">Valor:</span> R$ {parsed.package_value.toFixed(2)}</p>}
                {parsed.entry_value && <p><span className="text-muted-foreground">Entrada:</span> R$ {parsed.entry_value.toFixed(2)}</p>}
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setParsed(null)} className="flex-1">
                  Refazer
                </Button>
                <Button onClick={handleConfirm} className="flex-1">
                  Criar Evento com Estes Dados
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
