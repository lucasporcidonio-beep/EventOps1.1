import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Event } from "@/types";

const GEMINI_STORAGE_KEY = "gemini_api_key";

export function getGeminiApiKey(): string {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && envKey !== "AIzaSy..." && !envKey.includes("AIzaSyBARIWVX")) {
    return envKey;
  }
  return localStorage.getItem(GEMINI_STORAGE_KEY) || "";
}

export function setGeminiApiKey(key: string): void {
  if (key.trim()) {
    localStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(GEMINI_STORAGE_KEY);
  }
}

const CONTRACT_MASTER_PROMPT = `
Você é um especialista em contratos para fotógrafos de eventos no Brasil.
Sua função é gerar contratos completos, profissionais e prontos para assinar.

## REGRAS CRÍTICAS DE FORMATAÇÃO (SIGA EXATAMENTE):
- Use Markdown rico: **negrito**, *itálico*, # Títulos, ### Seções, --- separadores, listas com *, numeração.
- O título do contrato deve ser: # **CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS – [TIPO DO EVENTO em MAIÚSCULO]**
- Cada seção deve começar com ### **N. Nome da Seção**
- Separar cada seção com ---
- Nomes de pessoas SEMPRE em **negrito**
- Valores monetários SEMPRE em **negrito**
- Datas SEMPRE em **negrito**
- Terminar com bloco de assinaturas completo incluindo: local/data, linha para o CONTRATANTE assinar, linha para o CONTRATADO assinar, espaço para 2 TESTEMUNHAS com Nome/CPF/Assinatura
- Escreva a cidade de domicílio do CONTRATANTE como foro somente se diferente de Iperó.

## ESTRUTURA OBRIGATÓRIA (12 seções):
1. Qualificação das partes (CONTRATANTE e CONTRATADO, com todos os dados pessoais)
2. Objeto do contrato (tipo de evento e nome se disponível, ex: casamento de Fulano & Ciclano)
3. Dados do evento (data, horário, e TODOS os locais mencionados: residência, igreja, recepção etc)
4. Descrição dos serviços (listar ponto a ponto: cobertura fotográfica, entrega editada em alta resolução, galeria online etc)
5. Prazos de entrega (15 dias úteis padrão, incluir storymaker se contratado)
6. Valor e forma de pagamento (detalhar CADA parcela mencionada, datas e valores EXATOS)
7. Uso de imagem (autorização para portfólio e redes sociais)
8. Obrigações das partes (do CONTRATADO e do CONTRATANTE separadamente)
9. Cancelamento e rescisão (entrada não devolvida, prazo de comunicação 48h)
10. Foro (comarca do CONTRATANTE ou Sorocaba, SP se não informado)
11. Local, data e assinaturas
12. Testemunhas (2 campos completos: Nome / CPF / Assinatura)

## DADOS FIXOS DO CONTRATADO (FOTÓGRAFO – SEMPRE USAR ESSES DADOS):
Nome: Lucas Henrique Nascimento Porcidonio
Nacionalidade: brasileiro, casado
Nascimento: 21/02/1991
CPF: 376.274.348-74
RG: 47.181.303-5
Telefone: (15) 99748-5268
Endereço: Rua Sérgio Siqueira, nº 59 – Bairro George Oetterer – Iperó/SP

## FORMA DE TRABALHO (SEMPRE INCLUIR NA SEÇÃO DE SERVIÇOS):
- Fotos entregues editadas e em alta resolução digital
- Entrega por galeria online ou link para download
- Prazo padrão: 15 dias úteis após o evento
- Entrada obrigatória para reserva da data
- Cancelamento = entrada não devolvida

## ESTILO DE ESCRITA:
Profissional e acessível. Use:
✅ "prestação de serviços", "cobertura fotográfica", "valor combinado", "galeria online"
❌ "outorgante", "avença", "doravante denominado", "instrumento de natureza contratual"
`;

// ============================================================================
// TEMPLATE JURÍDICO INTELIGENTE (Fallback 100% offline se IA estiver sem chave)
// ============================================================================
export function generateContractFallback(eventData: any, rawText?: string): string {
  const eventType = (eventData.event_type || "Evento").toUpperCase();
  const clientName = eventData.client_name || "CONTRATANTE";
  const clientDoc = eventData.client_rg ? `RG nº ${eventData.client_rg}` : "Documento a anexar";
  const clientPhone = eventData.client_phone || "(Não informado)";
  const clientAddress = eventData.client_address || "Endereço não informado";
  const eventDate = eventData.event_date ? eventData.event_date.split("-").reverse().join("/") : "A definir";
  const startTime = eventData.coverage_start_time || "A combinar";
  const endTime = eventData.coverage_end_time || "Término da cobertura";
  const ceremonyLoc = eventData.ceremony_location || eventData.reception_location || "Local a definir";
  const receptionLoc = eventData.reception_location || ceremonyLoc;
  const totalValue = eventData.package_value || eventData.contract?.total_value || 0;
  const entryValue = eventData.contract?.entry_payment_value || Math.round(totalValue * 0.3);
  const remainingValue = totalValue - entryValue;
  const serviceName = eventData.package_name || eventData.main_service || "Cobertura Fotográfica Completa";

  return `# **CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS – ${eventType}**

---

### **1. Qualificação das Partes**

**CONTRATADO:**
**Lucas Henrique Nascimento Porcidonio**, brasileiro, casado, nascido em 21/02/1991, portador do CPF nº **376.274.348-74** e RG nº **47.181.303-5**, residente e domiciliado na Rua Sérgio Siqueira, nº 59, Bairro George Oetterer, Iperó/SP, Telefone: **(15) 99748-5268**.

**CONTRATANTE:**
**${clientName}**, ${clientDoc}, telefone de contato **${clientPhone}**, com endereço em **${clientAddress}**.

---

### **2. Objeto do Contrato**

O presente contrato tem como objeto a prestação de serviços profissionais de **cobertura fotográfica** para o evento do tipo **${eventData.event_type || "Evento"}**, assegurando o registro com padrão técnico e artístico profissional.

---

### **3. Dados e Locais do Evento**

* **Data do Evento:** **${eventDate}**
* **Horário de Início:** **${startTime}**
* **Horário Previsto de Término:** **${endTime}**
* **Local da Cerimônia / Oficial:** **${ceremonyLoc}**
* **Local da Recepção / Festa:** **${receptionLoc}**

---

### **4. Descrição dos Serviços Contratados**

* **Pacote Contratado:** **${serviceName}**
* Cobertura fotográfica durante o período contratado;
* Tratamento e edição profissional de cor, luz e contraste de todas as fotos selecionadas;
* Entrega das fotografias em alta resolução digital;
* Disponibilização dos arquivos por meio de galeria online privativa ou link para download direto.

---

### **5. Prazos de Entrega**

* O prazo padrão para entrega do material completo é de **15 (quinze) dias úteis** a contar do primeiro dia útil seguinte à data do evento.
* Prévias digitais (se acordadas) serão encaminhadas em até 48 horas após a celebração.

---

### **6. Valor e Forma de Pagamento**

* **Valor Total do Contrato:** **R$ ${totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}**
* **Entrada / Reserva de Data:** **R$ ${entryValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}** pagos no ato da assinatura deste instrumento;
* **Saldo Restante:** **R$ ${remainingValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}** a ser quitado até a data da realização do evento ou conforme cronograma de parcelamento acordado.

---

### **7. Uso de Imagem**

O(A) **CONTRATANTE** autoriza o **CONTRATADO** a utilizar as imagens capturadas exclusivamente para fins de divulgação profissional de seu portfólio artístico, websites e redes sociais oficiais, respeitando sempre a dignidade e a honra dos fotografados.

---

### **8. Obrigações das Partes**

* **Do CONTRATADO:** Comparecer no local e horário estipulados com equipamentos profissionais e equipe apta, desempenhando o serviço com zelo e pontualidade.
* **Do CONTRATANTE:** Fornecer com antecedência o cronograma detalhado do evento e garantir a segurança e alimentação da equipe técnica durante coberturas com duração superior a 4 horas.

---

### **9. Cancelamento e Rescisão**

* O valor pago a título de **Entrada / Reserva de Data** não será devolvido em hipótese de cancelamento ou desistência imotivada por parte do CONTRATANTE, visando cobrir o bloqueio exclusivo da agenda do fotógrafo.
* Notificações de alteração de data deverão ser feitas por escrito com no mínimo 30 dias de antecedência, sujeitas à disponibilidade de agenda.

---

### **10. Do Foro**

Para dirimir eventuais litígios oriundos deste contrato, as partes elegem o foro da Comarca de **Sorocaba/SP**, com renúncia expressa a qualquer outro, por mais privilegiado que seja.

---

**Sorocaba/SP, ${new Date().toLocaleDateString("pt-BR")}.**

---

**CONTRATANTE:**

___________________________________________________
**${clientName}**

---

**CONTRATADO:**

___________________________________________________
**Lucas Henrique Nascimento Porcidonio**

---

**TESTEMUNHAS:**

1. Nome: __________________________________________
   CPF: ___________________________________________
   Assinatura: ____________________________________

2. Nome: __________________________________________
   CPF: ___________________________________________
   Assinatura: ____________________________________
`;
}

// ============================================================================
// GERAÇÃO PRINCIPAL DE CONTRATO (COM IA OU FALLBACK INTELIGENTE)
// ============================================================================
export async function generateContractAI(
  eventData: any,
  rawText?: string
): Promise<{ contractText: string; usedAI: boolean; error?: string }> {
  const apiKey = getGeminiApiKey();

  // Se não houver chave ou for a chave suspensa, gera via template profissional
  if (!apiKey || apiKey.includes("AIzaSyBARIWVX")) {
    console.info("[AI] Chave Gemini não configurada ou suspensa. Utilizando template jurídico inteligente.");
    return {
      contractText: generateContractFallback(eventData, rawText),
      usedAI: false,
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Tenta primeiro o modelo estável mais rápido
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { temperature: 0.15 },
    });

    let clientDataStr = "";
    if (rawText && rawText.trim()) {
      clientDataStr = `\nTEXTO BRUTO FORNECIDO PELO CLIENTE / WHATSAPP:\n${rawText}\n`;
    } else {
      const eventName =
        eventData.event_name ||
        (eventData.groom_name && eventData.bride_name
          ? `${eventData.bride_name} & ${eventData.groom_name}`
          : null) ||
        eventData.debutante_name ||
        eventData.birthday_person_name ||
        "";

      clientDataStr = `
Tipo de Evento: ${eventData.event_type || ""}
Nome do Cliente/Contratante: ${eventData.client_name || ""}
RG: ${eventData.client_rg || "Não informado"}
Data de Nascimento: ${eventData.client_birthdate || "Não informada"}
Celular: ${eventData.client_phone || ""}
Endereço do Cliente: ${eventData.client_address || "Não informado"}
Nome(s) no Evento: ${eventName}
Data do Evento: ${eventData.event_date || ""}
Horário: ${eventData.coverage_start_time || ""} às ${eventData.coverage_end_time || ""}
Local da Cerimônia/Igreja: ${eventData.ceremony_location || "A Definir"}
Local da Recepção/Festa: ${eventData.reception_location || "A Definir"}
Pacote/Serviços Contratados: ${eventData.package_name || eventData.main_service || "Fotografia"}
Serviços adicionais: ${JSON.stringify(eventData.additional_services || [])}
Valor Total do Pacote: R$ ${eventData.contract?.total_value || eventData.package_value || "A definir"}
Valor de Entrada: R$ ${eventData.contract?.entry_payment_value || "A definir"}
Observações do cliente: ${eventData.notes || "Nenhuma"}
`;
    }

    const prompt = `${CONTRACT_MASTER_PROMPT}\n\nAGORA GERE O CONTRATO USANDO OS DADOS ABAIXO:\n${clientDataStr}`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (text && text.trim().length > 50) {
      return { contractText: text, usedAI: true };
    }
    throw new Error("Resposta da IA vazia");
  } catch (err: any) {
    console.warn("[AI] Falha na chamada da API Gemini:", err.message);
    // Fallback instantâneo para não deixar o usuário na mão
    return {
      contractText: generateContractFallback(eventData, rawText),
      usedAI: false,
      error: err.message,
    };
  }
}

// ============================================================================
// EXTRAÇÃO DE DADOS VIA IA PARA O ASSISTENTE WIZARD
// ============================================================================
export async function parsePreContractAI(rawInput: string): Promise<any> {
  const apiKey = getGeminiApiKey();

  if (apiKey && !apiKey.includes("AIzaSyBARIWVX")) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const prompt = `Extraia os dados operacionais deste texto para um JSON estrito de evento:
${rawInput}

Retorne um JSON com:
{
  "client": { "full_name": string, "document": string, "birthdate": string, "phone": string, "email": string, "address": string },
  "event": { "event_type": "Casamento" | "Debutante" | "Aniversário" | "Evento Corporativo" | "Ensaio" | "Evento Religioso" | "Outro", "event_name": string, "event_date": "YYYY-MM-DD", "locations": { "ceremony": { "name": string, "address": string, "city": string, "start_time": string }, "reception": { "name": string, "address": string, "city": string } } },
  "main_service": { "service_type": "Fotografia" | "Storymaker" | "Vídeo" },
  "financial": { "package_value": number, "entry_value": number }
}`;

      const res = await model.generateContent(prompt);
      return JSON.parse(res.response.text());
    } catch (e) {
      console.warn("Falha no Gemini para pre-contract, usando parser local:", e);
    }
  }

  // Parser local inteligente se não houver IA conectada
  const dateMatch = rawInput.match(/(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})/);
  let eventDate = "";
  if (dateMatch) {
    eventDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
  }

  const phoneMatch = rawInput.match(/(?:\(?\d{2}\)?\s?)?(?:9\d{4}[-\s]?\d{4}|\d{4}[-\s]?\d{4})/);
  const valMatch = rawInput.match(/R\$\s?([\d\.,]+)/i) || rawInput.match(/(\d{3,5})(?:,\d{2})?/);

  return {
    client: {
      full_name: rawInput.split("\n")[0]?.replace(/^Nome:?\s*/i, "").trim() || "Cliente",
      phone: phoneMatch ? phoneMatch[0] : "",
      document: "",
      address: "",
    },
    event: {
      event_type: rawInput.toLowerCase().includes("casamento")
        ? "Casamento"
        : rawInput.toLowerCase().includes("debutante") || rawInput.toLowerCase().includes("15 anos")
        ? "Debutante"
        : "Outro",
      event_date: eventDate || new Date().toISOString().split("T")[0],
      locations: {
        ceremony: { name: "", start_time: "19:00" },
        reception: { name: "" },
      },
    },
    main_service: { service_type: "Fotografia" },
    financial: {
      package_value: valMatch ? parseFloat(valMatch[1].replace(/\./g, "").replace(",", ".")) : 0,
    },
  };
}
