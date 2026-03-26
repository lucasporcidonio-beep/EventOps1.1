import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, FileText, CheckSquare, Users, Calendar, DollarSign, Menu, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const Help = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("overview");

  const handlePrint = () => {
    window.print();
  };

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setActiveSection(id);
    }
  };

  const sections = [
    { id: "overview", label: "1. Visão Geral", icon: FileText },
    { id: "create", label: "2. Criando um Evento", icon: CheckSquare },
    { id: "dashboard", label: "3. Painel Principal", icon: Calendar },
    { id: "finance", label: "4. Contrato e Financeiro", icon: DollarSign },
    { id: "team", label: "5. Gestão de Equipe", icon: Users },
    { id: "subevents", label: "6. Sub-eventos", icon: Share2 },
  ];

  const TableOfContents = ({ className }: { className?: string }) => (
    <nav className={cn("space-y-1", className)}>
      <h3 className="font-semibold text-sm mb-3 px-2 text-muted-foreground uppercase tracking-wider">Índice</h3>
      {sections.map(({ id, label, icon: Icon }) => (
        <Button
          key={id}
          variant={activeSection === id ? "secondary" : "ghost"}
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => scrollTo(id)}
        >
          <Icon className="h-4 w-4" />
          <span className="truncate">{label}</span>
        </Button>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background pb-10 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:block w-64 border-r border-border h-screen sticky top-0 bg-card/50 overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} title="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold">EventFlow Help</span>
        </div>
        <div className="p-4">
          <TableOfContents />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        {/* Header - Mobile & Print */}
        <header className="border-b border-border bg-card sticky top-0 z-30 print:hidden flex items-center justify-between px-4 py-3 md:py-4">
          <div className="flex items-center gap-2 md:hidden">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <div className="mt-8">
                  <TableOfContents />
                </div>
              </SheetContent>
            </Sheet>
            <span className="font-semibold text-sm">Manual do Usuário</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar PDF</span>
            </Button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8 print:p-0 print:max-w-none">
          <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">

            <div id="overview" className="scroll-mt-24 mb-10">
              <div className="flex items-center gap-3 mb-6 print:mb-4">
                <FileText className="h-8 w-8 text-primary" />
                <h1 className="m-0 text-3xl font-bold tracking-tight">Manual do Sistema</h1>
              </div>
              <p className="lead text-xl text-muted-foreground print:text-black">
                Plataforma completa para gerenciar eventos fotográficos/audiovisuais, controle financeiro e equipes.
              </p>
            </div>

            <hr className="my-6 border-border" />

            <section id="create" className="scroll-mt-24 mb-12 break-inside-avoid">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                <span className="bg-primary/10 p-1 rounded text-primary text-sm align-middle mr-1">2</span> Criando um Evento
              </h2>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Clique no botão <strong>"+ Novo Evento"</strong> no topo da página principal.</li>
                <li>Preencha os campos obrigatórios:
                  <ul className="list-disc pl-5 mt-1 space-y-1 text-muted-foreground print:text-black">
                    <li><strong>Tipo de evento</strong>: Casamento, Debutante, Aniversário, etc.</li>
                    <li><strong>Dados do cliente</strong>: Nome, telefone, RG, endereço.</li>
                    <li><strong>Data e Horários</strong>: Dia do evento, início e fim da cobertura.</li>
                    <li><strong>Locais</strong>: Cerimônia e recepção.</li>
                    <li><strong>Pacote</strong>: Nome e valor acordado.</li>
                  </ul>
                </li>
                <li>Clique em <strong>Salvar</strong> para registrar.</li>
              </ol>
              <div className="bg-muted p-4 rounded-lg mt-4 border border-border print:border-gray-300">
                <p className="text-sm font-medium">💡 Nota: Ao criar o evento, uma despesa de deslocamento de R$ 50 é adicionada automaticamente.</p>
              </div>
            </section>

            <section id="dashboard" className="scroll-mt-24 mb-12 break-inside-avoid">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                <span className="bg-primary/10 p-1 rounded text-primary text-sm align-middle mr-1">3</span> Painel Principal
              </h2>
              <div className="grid md:grid-cols-2 gap-6 print:block">
                <div className="bg-card p-4 rounded-xl border border-border print:border-gray-300 print:mb-4">
                  <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Eventos Anteriores
                  </h3>
                  <p className="text-muted-foreground print:text-black text-sm mb-2">Seção colapsável para eventos que já passaram mas têm pendências.</p>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    <li>✅ <strong>Materiais entregues</strong>: Confirme os entregáveis.</li>
                    <li>✔️ <strong>Concluir</strong>: Finalize o evento após quitar tudo.</li>
                  </ul>
                </div>
                <div className="bg-card p-4 rounded-xl border border-border print:border-gray-300">
                  <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" /> Eventos Ativos
                  </h3>
                  <p className="text-muted-foreground print:text-black text-sm mb-2">Lista organizada por data dos eventos futuros.</p>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    <li>Cards coloridos indicam o status (Planejado, Próximo, etc).</li>
                    <li>Ações rápidas para Contrato, Equipe e Edição.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="finance" className="scroll-mt-24 mb-12 break-inside-avoid">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                <span className="bg-primary/10 p-1 rounded text-primary text-sm align-middle mr-1">4</span> Contrato e Financeiro
              </h2>
              <p className="mb-4">Acesse clicando no botão <strong>Contrato</strong> em qualquer card de evento.</p>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">Resumo e Pagamentos</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Visualize <strong>Valor Total</strong>, <strong>Pago</strong> e <strong>Restante</strong>.</li>
                    <li>Registre novos pagamentos selecionando o método (Pix, Cartão, Dinheiro) e valor.</li>
                    <li>O sistema mantém um histórico detalhado de cada transação.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Despesas</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Lance custos como deslocamento, alimentação e equipamentos.</li>
                    <li>O lucro líquido do evento é calculado automaticamente abatendo estas despesas.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="team" className="scroll-mt-24 mb-12 break-inside-avoid">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                <span className="bg-primary/10 p-1 rounded text-primary text-sm align-middle mr-1">5</span> Gestão de Equipe
              </h2>
              <p className="mb-4">Gerencie profissionais clicando no botão <strong>Equipe</strong> <Users className="inline h-4 w-4" />.</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Cadastrar Profissional</strong>: Adicione fotógrafos, videomakers e assistentes ao banco de dados.</li>
                <li><strong>Atribuir</strong>: Selecione quem trabalhará no evento, função e valor do cachê combinado.</li>
                <li><strong>Controle</strong>:
                  <ul className="list-disc pl-5 mt-1 text-muted-foreground print:text-black">
                    <li>Marque "Serviço realizado" após o evento.</li>
                    <li>Marque "Cachê pago" quando transferir o valor.</li>
                  </ul>
                </li>
                <li><strong>Conflitos</strong>: O sistema alerta em amarelo se o profissional já estiver ocupado em outro evento no mesmo dia.</li>
              </ul>
            </section>

            <section id="subevents" className="scroll-mt-24 mb-12 break-inside-avoid">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-4">
                <span className="bg-primary/10 p-1 rounded text-primary text-sm align-middle mr-1">6</span> Sub-eventos e Ensaios
              </h2>
              <div className="grid md:grid-cols-2 gap-6 print:block">
                <div>
                  <p className="text-sm">Ideal para <strong>Ensaios, Pré-Wedding, Making Of</strong>, etc.</p>
                  <ul className="list-disc pl-5 mt-2 text-sm">
                    <li>Defina data, horário e local independentes.</li>
                    <li>Atribua profissionais específicos para o sub-evento.</li>
                    <li>Aparecem integrados no Calendário.</li>
                  </ul>
                </div>
              </div>
            </section>

          </div>
        </main>
      </div>
    </div>
  );
};

export default Help;
