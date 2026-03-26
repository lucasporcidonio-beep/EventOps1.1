import type { ConfirmationStatus, OperationalStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ConfirmationBadge({ status }: { status: ConfirmationStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium border px-2 py-0.5",
        status === "Aguardando" && "status-warning",
        status === "Divergência" && "status-danger",
        status === "Confirmado" && "status-success"
      )}
    >
      {status}
    </Badge>
  );
}

export function OperationalBadge({ status }: { status: OperationalStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium border px-2 py-0.5",
        status === "Hoje" && "status-warning",
        status === "Em Execução" && "bg-primary/15 border-primary/30 text-primary",
        status === "Entregue" && "status-success",
        (status === "Planejado" || status === "Próximo") && "status-neutral"
      )}
    >
      {status}
    </Badge>
  );
}
