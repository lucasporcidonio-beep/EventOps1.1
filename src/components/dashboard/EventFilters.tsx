import React from "react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";
import { Professional, OperationalStatus, EventType } from "@/types";

interface EventFiltersProps {
    search: string;
    setSearch: (value: string) => void;
    filterStatus: string;
    setFilterStatus: (value: string) => void;
    filterType: string;
    setFilterType: (value: string) => void;
    filterProf: string;
    setFilterProf: (value: string) => void;
    professionals: Professional[];
    totalFiltered: number;
}

const OP_STATUSES: OperationalStatus[] = [
    "Planejado",
    "Próximo",
    "Hoje",
    "Em Execução",
    "Entregue",
    "Finalizado",
];

const EVENT_TYPES: EventType[] = [
    "Casamento",
    "Debutante",
    "Aniversário",
    "Evento Corporativo",
    "Ensaio",
    "Evento Religioso",
    "Outro",
];

export function EventFilters({
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    filterType,
    setFilterType,
    filterProf,
    setFilterProf,
    professionals,
    totalFiltered,
}: EventFiltersProps) {
    return (
        <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
            </div>
            <Input
                placeholder="Buscar cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-48 h-8 text-sm"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-[140px] h-8 text-sm">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    {OP_STATUSES.filter((s) => s !== "Finalizado").map((s) => (
                        <SelectItem key={s} value={s}>
                            {s}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-[150px] h-8 text-sm">
                    <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos Tipos</SelectItem>
                    {EVENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                            {t}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={filterProf} onValueChange={setFilterProf}>
                <SelectTrigger className="w-full sm:w-[160px] h-8 text-sm">
                    <SelectValue placeholder="Profissional" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos Profissionais</SelectItem>
                    {professionals.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                            {p.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-auto">
                {totalFiltered} evento{totalFiltered !== 1 ? "s" : ""}
            </span>
        </div>
    );
}
