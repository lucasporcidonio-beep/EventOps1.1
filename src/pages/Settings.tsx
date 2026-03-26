import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiUrl, setApiUrl } from "@/lib/api";
import { ArrowLeft, Save, Upload, Download, Server, Database } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { generateSeedEvents } from "@/data/seedEvents"; // Add this

export default function Settings() {
    const navigate = useNavigate();
    const [apiUrl, setLocalApiUrl] = useState(getApiUrl());
    const [isRestoring, setIsRestoring] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [isSeeding, setIsSeeding] = useState(false); // Add this state

    const handleSaveUrl = () => {
        setApiUrl(apiUrl);
        toast.success("URL do servidor salva! Recarregue a página para aplicar.");
        setTimeout(() => window.location.reload(), 1000);
    };

    const handleBackup = () => {
        const url = `${getApiUrl()}/backup`;
        window.open(url, "_blank");
    };

    const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!window.confirm("ATENÇÃO: Isso irá substituir todos os dados atuais pelos do backup. Deseja continuar?")) {
            return;
        }

        setIsRestoring(true);
        const formData = new FormData();
        formData.append("backup", file);

        const isSql = file.name.toLowerCase().endsWith(".sql");
        const endpoint = isSql ? "/restore-sql" : "/restore";

        try {
            const res = await fetch(`${getApiUrl()}${endpoint}`, {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                toast.success("Backup restaurado com sucesso!");
                setTimeout(() => window.location.reload(), 1500);
            } else {
                throw new Error("Falha na restauração");
            }
        } catch (error) {
            toast.error("Erro ao restaurar backup. Verifique se o servidor está rodando.");
        } finally {
            setIsRestoring(false);
        }
    };

    const handleMigration = async () => {
        if (!window.confirm("Isso pegará os dados salvos no seu navegador (versão antiga) e enviará para o novo banco de dados. Deseja continuar?")) {
            return;
        }

        setIsMigrating(true);
        const api = getApiUrl();
        let successCount = 0;
        let errorCount = 0;

        const postItem = async (endpoint: string, item: any) => {
            try {
                const res = await fetch(`${api}/${endpoint}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(item),
                });
                if (res.ok) successCount++;
                else {
                    console.error(`Failed to post to ${endpoint}`, item, await res.text());
                    errorCount++;
                }
            } catch (e) {
                console.error(e);
                errorCount++;
            }
        };

        try {
            // 1. Events
            const events = JSON.parse(localStorage.getItem("events") || "[]");
            for (const e of events) await postItem("events", e);

            // 2. Professionals
            const professionals = JSON.parse(localStorage.getItem("professionals") || "[]");
            for (const p of professionals) await postItem("professionals", p);

            // 3. Contracts (Need ID generation if missing)
            const contracts = JSON.parse(localStorage.getItem("contracts") || "[]");
            for (const c of contracts) {
                if (!c.id) c.id = crypto.randomUUID();
                await postItem("contracts", c);
            }

            // 4. Checklists (Need ID generation)
            const checklists = JSON.parse(localStorage.getItem("checklists") || "[]");
            for (const c of checklists) {
                if (!c.id) c.id = crypto.randomUUID();
                await postItem("checklists", c);
            }

            // 5. Assignments (Need ID generation)
            const assignments = JSON.parse(localStorage.getItem("assignments") || "[]");
            for (const a of assignments) {
                if (!a.id) a.id = crypto.randomUUID();
                await postItem("assignments", a);
            }

            // 6. SubEvents
            const subEvents = JSON.parse(localStorage.getItem("subEvents") || "[]");
            for (const s of subEvents) await postItem("sub_events", s); // Ensure endpoint matches server "sub_events"

            // 7. Expenses
            const expenses = JSON.parse(localStorage.getItem("expenses") || "[]");
            for (const ex of expenses) await postItem("expenses", ex);

            toast.success(`Migração concluída! Sucessos: ${successCount}, Erros/Duplicados: ${errorCount}`);
            if (successCount > 0) {
                setTimeout(() => window.location.reload(), 2000);
            }

        } catch (err) {
            toast.error("Erro crítico durante a migração.");
            console.error(err);
        } finally {
            setIsMigrating(false);
        }
    };

    const handleSeedMigration = async () => {
        if (!window.confirm("Isso importará os dados fixos do código (Exemplos: Alessandra, Karen, etc) para o banco de dados. Continuar?")) {
            return;
        }

        setIsSeeding(true);
        const api = getApiUrl();
        let successCount = 0;
        let errorCount = 0;

        const postItem = async (endpoint: string, item: any) => {
            try {
                const res = await fetch(`${api}/${endpoint}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(item),
                });
                if (res.ok) successCount++;
                else errorCount++;
            } catch (e) {
                console.error(e);
                errorCount++;
            }
        };

        try {
            const seed = generateSeedEvents();
            // Events
            for (const e of seed.events) await postItem("events", e);
            // Contracts
            for (const c of seed.contracts) await postItem("contracts", c);
            // Checklists
            for (const c of seed.checklists) await postItem("checklists", c);
            // Professionals
            for (const p of seed.professionals) await postItem("professionals", p);

            toast.success(`Dados do código importados! Sucesso: ${successCount}`);
            setTimeout(() => window.location.reload(), 1500);

        } catch (err) {
            toast.error("Erro ao importar.");
            console.error(err);
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
                <h1 className="text-2xl font-bold">Configurações</h1>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Server className="h-5 w-5" /> Conexão com Servidor
                        </CardTitle>
                        <CardDescription>
                            Configure o IP do computador onde o servidor está rodando.
                            No PC use "http://localhost:3000". No celular use "http://IP_DO_PC:3000".
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                value={apiUrl}
                                onChange={(e) => setLocalApiUrl(e.target.value)}
                                placeholder="http://localhost:3000"
                            />
                            <Button onClick={handleSaveUrl}>
                                <Save className="h-4 w-4 mr-2" /> Salvar
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" /> Migração de Dados Antigos
                        </CardTitle>
                        <CardDescription>
                            Se você usava o sistema antes da atualização do servidor e seus dados sumiram, use este botão para importar os dados do navegador para o novo banco de dados.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-muted p-3 rounded-lg text-sm font-mono space-y-1">
                            <p className="font-semibold mb-2">Diagnóstico do Armazenamento Local:</p>
                            <p>Events: {JSON.parse(localStorage.getItem("events") || "[]").length} itens</p>
                            <p>Contracts: {JSON.parse(localStorage.getItem("contracts") || "[]").length} itens</p>
                            <p>Professionals: {JSON.parse(localStorage.getItem("professionals") || "[]").length} itens</p>
                            <p>Assignments: {JSON.parse(localStorage.getItem("assignments") || "[]").length} itens</p>
                            <p>SubEvents: {JSON.parse(localStorage.getItem("subEvents") || "[]").length} itens</p>
                            <p>Expenses: {JSON.parse(localStorage.getItem("expenses") || "[]").length} itens</p>
                            <p className="text-xs text-muted-foreground mt-2">
                                Chaves encontradas: {Object.keys(localStorage).join(", ")}
                            </p>
                        </div>
                        <Button onClick={handleMigration} disabled={isMigrating || isSeeding} className="w-full">
                            {isMigrating ? "Migrando..." : "Importar Dados do Navegador (Seus dados antigos)"}
                        </Button>
                        <Button onClick={handleSeedMigration} disabled={isMigrating || isSeeding} variant="secondary" className="w-full">
                            {isSeeding ? "Importando..." : "Restaurar Dados Originais (Exemplos do Código)"}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Backup e Restauração</CardTitle>
                        <CardDescription>
                            Salve uma cópia dos seus dados ou restaure um backup anterior.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row gap-4">
                        <Button onClick={handleBackup} variant="outline" className="flex-1">
                            <Download className="h-4 w-4 mr-2" /> Baixar Backup
                        </Button>

                        <div className="relative flex-1">
                            <input
                                type="file"
                                accept=".sqlite,.sql"
                                onChange={handleRestore}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={isRestoring}
                            />
                            <Button variant="outline" className="w-full" disabled={isRestoring}>
                                <Upload className="h-4 w-4 mr-2" />
                                {isRestoring ? "Restaurando..." : "Restaurar Backup (.sqlite ou .sql)"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
