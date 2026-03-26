import express from 'express';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY }); // Ensure env variable fits

const MASTER_PROMPT_CONTEXT = `
PAPEL DA IA: Você é uma IA operacional de gestão de projetos de eventos.
Sua função não é criar, não é opinar e não é interpretar livremente.
Se qualquer informação estiver ambígua ou ausente, você deve sinalizar erro, nunca inventar.

TAXONOMIA FECHADA (NUNCA INVENTAR):
- TIPOS DE EVENTO: Casamento, Debutante, Aniversário, Evento Corporativo, Ensaio, Evento Religioso, Outro.
- TIPOS DE SERVIÇO: Fotografia, Storymaker, Vídeo.
- TIPOS DE ENTREGA: Galeria Digital, Vídeos Curtos, Reels, Stories em Tempo Real, Material Bruto, Álbum.
`;

router.post('/pre-contract', async (req, res) => {
    try {
        const { rawInput } = req.body;
        if (!rawInput) return res.status(400).json({ error: 'Missing rawInput' });

        const model = "gemini-2.0-flash";

        const schema = {
            type: Type.OBJECT,
            properties: {
                project_id: { type: Type.STRING },
                client: {
                    type: Type.OBJECT,
                    properties: {
                        full_name: { type: Type.STRING },
                        document: { type: Type.STRING },
                        birthdate: { type: Type.STRING },
                        phone: { type: Type.STRING },
                        email: { type: Type.STRING },
                        address: { type: Type.STRING }
                    },
                    required: ["full_name", "document", "phone"]
                },
                event: {
                    type: Type.OBJECT,
                    properties: {
                        event_type: { 
                            type: Type.STRING, 
                            enum: ["Casamento", "Debutante", "Aniversário", "Evento Corporativo", "Ensaio", "Evento Religioso", "Outro"] 
                        },
                        event_name: { type: Type.STRING },
                        event_date: { type: Type.STRING },
                        locations: {
                            type: Type.OBJECT,
                            properties: {
                                ceremony: {
                                    type: Type.OBJECT,
                                    properties: {
                                        name: { type: Type.STRING },
                                        address: { type: Type.STRING },
                                        city: { type: Type.STRING },
                                        start_time: { type: Type.STRING }
                                    }
                                },
                                reception: {
                                    type: Type.OBJECT,
                                    properties: {
                                        name: { type: Type.STRING },
                                        address: { type: Type.STRING },
                                        city: { type: Type.STRING }
                                    }
                                }
                            }
                        }
                    },
                    required: ["event_type", "event_date"]
                },
                main_service: {
                    type: Type.OBJECT,
                    properties: {
                        service_type: { type: Type.STRING, enum: ["Fotografia"] },
                        coverage_start_time: { type: Type.STRING },
                        coverage_end_time: { type: Type.STRING }
                    },
                    required: ["service_type", "coverage_start_time", "coverage_end_time"]
                },
                additional_services: {
                    type: Type.OBJECT,
                    properties: {
                        storymaker: {
                            type: Type.OBJECT,
                            properties: {
                                enabled: { type: Type.BOOLEAN },
                                coverage_type: { type: Type.STRING }
                            },
                            required: ["enabled"]
                        },
                        video: {
                            type: Type.OBJECT,
                            properties: {
                                enabled: { type: Type.BOOLEAN }
                            },
                            required: ["enabled"]
                        }
                    },
                    required: ["storymaker", "video"]
                },
                commercial_package: {
                    type: Type.OBJECT,
                    properties: {
                        package_name: { type: Type.STRING },
                        customized: { type: Type.BOOLEAN },
                        custom_notes: { type: Type.STRING }
                    }
                },
                deliverables: {
                    type: Type.OBJECT,
                    properties: {
                        items: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING, enum: ["Galeria Digital", "Vídeos Curtos", "Reels", "Stories em Tempo Real", "Material Bruto", "Álbum"] }
                        },
                        delivery_deadline_days: { type: Type.NUMBER }
                    },
                    required: ["items", "delivery_deadline_days"]
                },
                financial: {
                    type: Type.OBJECT,
                    properties: {
                        total_value: { type: Type.NUMBER },
                        entry_value: { type: Type.NUMBER },
                        remaining_value: { type: Type.NUMBER },
                        remaining_due_date: { type: Type.STRING },
                        payment_notes: { type: Type.STRING }
                    },
                    required: ["total_value", "entry_value"]
                },
                operational_notes: { type: Type.STRING }
            },
            required: ["project_id", "client", "event", "main_service", "financial"]
        };

        const cleanInput = rawInput.replace(/"/g, "'");

        const response = await ai.models.generateContent({
            model,
            contents: `${MASTER_PROMPT_CONTEXT}
            
            MODO 1 — PRÉ-CONTRATO
            Tarefas: Estruturar dados do formulário para Schema Oficial.
            IMPORTANTE: Gere apenas o JSON. Se um campo não existir, use null.
            
            MAPEAMENTO DE CAMPOS (formato que o usuário costuma enviar → campo do schema):
            - "Nome completo" → client.full_name (retire os asteriscos se existirem)
            - "RG" → client.document
            - "Data de Nascimento" → client.birthdate (formato YYYY-MM-DD)
            - "Celular" ou "Telefone" → client.phone (manter exatamente como digitado)
            - "Endereço" (residencial, sem "Igreja" ou "Recepção") → client.address
            - "Endereço Igreja" ou "Endereço Cerimônia" → Preecha TANTO event.locations.ceremony.address QUANTO event.locations.ceremony.name com esse valor
            - "Endereço Recepção", "Endereço Festa" ou "Endereço da festa" → Preecha TANTO event.locations.reception.address QUANTO event.locations.reception.name com esse valor
            - "Data e horario", "Data e hora da festa" ou "Data/Hora" → event.event_date (formato YYYY-MM-DD) + event.locations.ceremony.start_time (formato HH:MM)
            - "Nome dos Noivos" ou "Noivos" → event.event_name (ex: "Camila & Carlos") + detecta event_type = "Casamento"
            - "Nome da debutante/aniversariante" ou "Nome do(a) aniversariante" → event.event_name (ex: "Vitória Caroline") + detecta event_type correspondente (Aniversário ou Debutante baseando-se no termo usado)
            - "Pacote escolhido" → commercial_package.package_name
            - "Valor da entrada" ou "Entrada" → financial.entry_value (valor numérico apenas)
            - Se houver "parcelas" ou "prestações", calcule financial.total_value = entrada + (qtd_parcelas × valor_parcela)
            - Guarde a descrição completa do pagamento em financial.payment_notes
            - Datas por extenso (ex: "19 de Dezembro 2026") ou formato DD/MM/YYYY (ex: "19/12/2026") → converter para YYYY-MM-DD (ex: "2026-12-19")
            
            REGRAS DE LIMPEZA GERAL:
            1. Os dados originais podem vir colados com suas labels, sem espaços ou dois pontos, e envoltos por asteriscos. Ex: "*RG*428583593" significa "RG: 428583593". Limpe isso e extraia o valor exato.
            2. Remova os asteriscos (\`*\`) de todos os valores extraídos.
            3. A cidade é opcional e não obrigatória; extraia a cidade se for identificável no endereço de festa/igreja (ex: "Votorantim").
            - Horários como "11 hrs", "11h", "11:00" → converter para "11:00"
            - RG com pontos e traço (ex: "47.419.002-x") → manter exatamente como está
            - Se mencionar "Camila & Carlos" ou semelhante, o event_type = "Casamento"
            - project_id: gerar como iniciais do nome + data (ex: "CAE-2026-12-19")
            
            Entrada: "${cleanInput}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.1,
                maxOutputTokens: 2000, 
                thinkingConfig: { thinkingBudget: 0 }
            },
        });

        const text = response.text;
        if (!text) throw new Error("Resposta vazia da IA");
        res.json(JSON.parse(text));
    } catch (e) {
        console.error("Agent 1 Error:", e);
        res.status(500).json({ error: "Erro ao processar instrução da IA." });
    }
});

router.post('/compare-contract', async (req, res) => {
    try {
        const { truth, extractedText } = req.body;
        if (!truth || !extractedText) return res.status(400).json({ error: 'Missing truth or extractedText' });

        const model = "gemini-3-flash-preview";

        // Step 1: Extract (Simulating Agent 2A)
        const extractionSchema = {
            type: Type.OBJECT,
            properties: {
                project_id: { type: Type.STRING },
                contract_metadata: {
                    type: Type.OBJECT,
                    properties: { contract_type: { type: Type.STRING }, contract_date: { type: Type.STRING }, signed: { type: Type.BOOLEAN } },
                    required: ["signed", "contract_date"]
                },
                parties: {
                    type: Type.OBJECT,
                    properties: {
                        contractor: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, document: { type: Type.STRING } }, required: ["name", "document"] },
                        client: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, document: { type: Type.STRING } }, required: ["name"] }
                    },
                    required: ["contractor", "client"]
                },
                event: {
                    type: Type.OBJECT,
                    properties: {
                        event_type: { type: Type.STRING }, event_date: { type: Type.STRING }, event_name: { type: Type.STRING },
                        locations: {
                            type: Type.OBJECT,
                            properties: {
                                ceremony: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, address: { type: Type.STRING }, city: { type: Type.STRING }, start_time: { type: Type.STRING } } },
                                reception: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, address: { type: Type.STRING }, city: { type: Type.STRING } } }
                            }
                        }
                    }
                },
                services: {
                    type: Type.OBJECT,
                    properties: { main_service: { type: Type.STRING }, coverage_duration_hours: { type: Type.NUMBER }, additional_services: { type: Type.ARRAY, items: { type: Type.STRING } } }
                },
                deliverables: {
                    type: Type.OBJECT,
                    properties: { items: { type: Type.ARRAY, items: { type: Type.STRING } }, delivery_deadline_days: { type: Type.NUMBER }, delivery_method: { type: Type.STRING } }
                },
                financial: {
                    type: Type.OBJECT,
                    properties: { total_value: { type: Type.NUMBER }, entry_value: { type: Type.NUMBER }, remaining_value: { type: Type.NUMBER }, remaining_due_date: { type: Type.STRING } }
                },
                missing_or_ambiguous_fields: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["contract_metadata", "parties", "event", "services", "financial", "missing_or_ambiguous_fields"]
        };

        const extractResponse = await ai.models.generateContent({
            model,
            contents: `${MASTER_PROMPT_CONTEXT}
            MODO 2A — EXTRAÇÃO DE CONTRATO
            Tarefas: 1. Ler o texto do contrato. 2. Extrair APENAS o explícito. 3. Nunca inferir. 4. Preencher missing_or_ambiguous_fields se faltar algo crítico.
            TEXTO DO CONTRATO:
            "${extractedText.replace(/"/g, "'")}"`,
            config: { responseMimeType: "application/json", responseSchema: extractionSchema, temperature: 0.0, thinkingConfig: { thinkingBudget: 0 } },
        });

        const extracted = JSON.parse(extractResponse.text || "{}");

        // Step 2: Compare (Simulating Agent 2B)
        const compareSchema = {
            type: Type.OBJECT,
            properties: {
                contract_verified: { type: Type.BOOLEAN },
                discrepancies: { type: Type.ARRAY, items: { type: Type.STRING } },
                notes: { type: Type.STRING },
                confirmed_services: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["contract_verified", "discrepancies", "notes", "confirmed_services"]
        };

        const compareResponse = await ai.models.generateContent({
            model,
            contents: `${MASTER_PROMPT_CONTEXT}
            MODO 2B — VERIFICAÇÃO (COMPARAÇÃO)
            Tarefas: 
            1. Comparar A VERDADE com EXTRAÍDO. 
            2. Se houver divergência defina contract_verified = false e popule discrepancies.
            3. REGRA CRÍTICA: IGNORE o campo 'project_id'. É normal que ele exista na VERDADE e falte no EXTRAÍDO (já que não costuma estar escrito no contrato). Não crie divergência por causa de project_id.
            A VERDADE: ${JSON.stringify(truth)}
            EXTRAÍDO: ${JSON.stringify(extracted)}`,
            config: { responseMimeType: "application/json", responseSchema: compareSchema, temperature: 0.1, thinkingConfig: { thinkingBudget: 0 } },
        });

        const result = JSON.parse(compareResponse.text || "{}");
        res.json({ ...result, extraction_data: extracted });
    } catch (e) {
        console.error("Agent 2 Error:", e);
        res.status(500).json({ error: "Erro na extração e comparação do contrato." });
    }
});

router.post('/planning', async (req, res) => {
    try {
        const { preContractData, verifiedData } = req.body;
        if (!preContractData || !verifiedData) return res.status(400).json({ error: 'Missing data' });

        const model = "gemini-3-flash-preview";

        const schema = {
            type: Type.OBJECT,
            properties: {
                project_id: { type: Type.STRING },
                planning: {
                    type: Type.OBJECT,
                    properties: {
                        event_type: { type: Type.STRING },
                        main_service: { type: Type.STRING },
                        additional_services: { type: Type.ARRAY, items: { type: Type.STRING } },
                        execution_profile: { type: Type.STRING, enum: ["Evento_Social_Completo", "Evento_Social_Padrão", "Ensaio_Simples", "Corporativo", "Religioso"] },
                        status: { type: Type.STRING, enum: ["Planejado"] }
                    },
                    required: ["execution_profile", "status"]
                },
                agenda: {
                    type: Type.OBJECT,
                    properties: {
                        event_created: { type: Type.BOOLEAN },
                        event_date: { type: Type.STRING },
                        coverage_start_time: { type: Type.STRING },
                        coverage_end_time: { type: Type.STRING },
                        locations: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["event_created", "event_date", "locations"]
                },
                checklist: {
                    type: Type.OBJECT,
                    properties: {
                        profile_name: { type: Type.STRING },
                        items: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["profile_name", "items"]
                },
                alerts: {
                    type: Type.OBJECT,
                    properties: {
                        pre_event: { type: Type.ARRAY, items: { type: Type.STRING } },
                        day_of_event: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["pre_event", "day_of_event"]
                },
                post_event: {
                    type: Type.OBJECT,
                    properties: {
                        next_status: { type: Type.STRING, enum: ["Pós-Produção"] },
                        post_event_tasks: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["next_status", "post_event_tasks"]
                }
            },
            required: ["planning", "agenda", "checklist", "alerts", "post_event"]
        };

        const response = await ai.models.generateContent({
            model,
            contents: `${MASTER_PROMPT_CONTEXT}
            MODO 3 — PLANEJAMENTO (RÍGIDO)
            REGRAS DE PERFIL BINÁRIO:
            1. Se 'event_type' for "Evento Corporativo" --> Use Perfil "Corporativo".
            2. QUALQUER OUTRO tipo --> Use Perfil "Evento_Social_Completo".
            ITENS DE CHECKLIST (Copiar exatamente):
            - Evento_Social_Completo: Confirmar equipamentos fotográficos, Baterias carregadas, Cartões de memória formatados, Chegar ao local com antecedência mínima, Registro da cerimônia, Mini ensaio com os protagonistas, Cobertura da recepção, Backup imediato pós-evento.
            - Corporativo: Briefing alinhado, Registro institucional, Cobertura de público e ambiente, Backup pós-evento.
            ALERTAS: Pré-evento: 48h revisão, 24h equipamentos, 2h deslocamento. Dia do evento: 30min antes, Alerta de término.
            DADOS DE ENTRADA: ${JSON.stringify(preContractData)}
            DADOS VERIFICADOS: ${JSON.stringify(verifiedData)}`,
            config: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.1, thinkingConfig: { thinkingBudget: 0 } },
        });

        res.json(JSON.parse(response.text || "{}"));
    } catch (e) {
        console.error("Agent 3 Error:", e);
        res.status(500).json({ error: "Erro na geração do plano." });
    }
});

export default router;
