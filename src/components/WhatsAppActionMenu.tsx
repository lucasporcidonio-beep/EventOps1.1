import { MessageSquare, CalendarCheck, DollarSign, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { Event, Contract } from "@/types";
import { toast } from "sonner";

interface WhatsAppActionMenuProps {
  event: Event;
  contract?: Contract;
}

export function WhatsAppActionMenu({ event, contract }: WhatsAppActionMenuProps) {
  const sanitizePhone = (phone?: string) => {
    if (!phone) return "";
    let clean = phone.replace(/\D/g, "");
    if (clean.length === 10 || clean.length === 11) {
      clean = "55" + clean;
    }
    return clean;
  };

  const openWhatsApp = (text: string) => {
    const phone = sanitizePhone(event.client_phone);
    if (!phone) {
      toast.error("Telefone do cliente não cadastrado.");
      return;
    }
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank");
  };

  // Templates de mensagens inteligentes
  const getConfirmationMessage = () => {
    return (
      `Olá, ${event.client_name}! Tudo bem?\n\n` +
      `Passando da equipe para confirmar os detalhes do seu *${event.event_type}*:\n` +
      `📅 *Data:* ${event.event_date}\n` +
      `⏰ *Início da Cobertura:* ${event.coverage_start_time || "A combinar"}\n` +
      `📍 *Local:* ${event.ceremony_location || event.reception_location || "A definir"}\n` +
      `📸 *Serviço:* ${event.main_service}\n\n` +
      `Qualquer dúvida ou ajuste de cronograma, estamos à disposição!`
    );
  };

  const getFinancialReminderMessage = () => {
    const total = contract?.total_value || event.package_value || 0;
    const paid = contract?.total_paid || 0;
    const pending = total - paid;

    return (
      `Olá, ${event.client_name}!\n\n` +
      `Passando com o resumo financeiro atualizado do seu evento (${event.event_type}):\n` +
      `💰 *Valor Total do Pacote:* R$ ${total.toLocaleString("pt-BR")}\n` +
      `✅ *Valor Pago:* R$ ${paid.toLocaleString("pt-BR")}\n` +
      `⏳ *Saldo Pendente:* R$ ${pending.toLocaleString("pt-BR")}\n\n` +
      `Se precisar da chave PIX ou dados bancários para quitação, me avise por aqui. Obrigado!`
    );
  };

  const getBriefingSummary = () => {
    return (
      `📋 *Briefing Operacional - ${event.event_type}*\n` +
      `👤 *Cliente:* ${event.client_name}\n` +
      `📅 *Data:* ${event.event_date} (${event.coverage_start_time || ""} às ${event.coverage_end_time || ""})\n` +
      `⛪ *Cerimônia:* ${event.ceremony_location || "N/A"}\n` +
      `🎉 *Recepção:* ${event.reception_location || "N/A"}\n` +
      `📝 *Notas & Desejos:* ${event.notes || "Sem observações adicionais"}\n`
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 gap-1.5 border-emerald-500/30 hover:border-emerald-500 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
          <span>WhatsApp</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-zinc-950 border-white/10 text-zinc-200">
        <DropdownMenuLabel className="text-xs text-zinc-400">Mensagens Rápidas</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />

        <DropdownMenuItem
          className="cursor-pointer gap-2 hover:bg-emerald-500/10 focus:bg-emerald-500/10 text-xs"
          onClick={() => openWhatsApp(getConfirmationMessage())}
        >
          <CalendarCheck className="h-4 w-4 text-emerald-400" />
          <span>Confirmar Data e Local</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer gap-2 hover:bg-emerald-500/10 focus:bg-emerald-500/10 text-xs"
          onClick={() => openWhatsApp(getBriefingSummary())}
        >
          <FileText className="h-4 w-4 text-blue-400" />
          <span>Enviar Resumo do Briefing</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="cursor-pointer gap-2 hover:bg-emerald-500/10 focus:bg-emerald-500/10 text-xs"
          onClick={() => openWhatsApp(getFinancialReminderMessage())}
        >
          <DollarSign className="h-4 w-4 text-amber-400" />
          <span>Lembrete de Saldo Financeiro</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
