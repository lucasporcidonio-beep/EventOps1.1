import sqlite3 from 'sqlite3';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

console.log("Iniciando Migração do SQLite para o Supabase...");

const all = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const safeJsonParse = (str) => {
    try {
        if (!str) return [];
        if (typeof str === 'string' && !str.trim().startsWith('[') && !str.trim().startsWith('{')) return [str.trim()];
        const parsed = JSON.parse(str);
        if (parsed === null || parsed === undefined) return [];
        return parsed;
    } catch {
        return [];
    }
};

const tables = [
    'events',
    'contracts',
    'professionals',
    'assignments',
    'checklists',
    'sub_events',
    'expenses'
];

const schemas = {
    events: ['id', 'event_type', 'client_name', 'client_phone', 'client_rg', 'client_birthdate', 'client_address', 'event_date', 'coverage_start_time', 'coverage_end_time', 'ceremony_location', 'reception_location', 'main_service', 'additional_services', 'operational_status', 'confirmation_status', 'notes', 'debutante_name', 'groom_name', 'bride_name', 'birthday_person_name', 'package_name', 'package_value', 'materials_delivered'],
    contracts: ['id', 'event_id', 'total_value', 'total_paid', 'entry_payment_value', 'entry_payment_date', 'entry_payment_method', 'entry_payment_confirmed', 'payment_history', 'generated_contract_text'],
    professionals: ['id', 'name', 'roles', 'pix_key', 'phone', 'notes'],
    assignments: ['id', 'event_id', 'professional_id', 'role', 'cache_value', 'cache_paid', 'service_performed', 'payment_date', 'primary', 'service_confirmed', 'date', 'status', 'value'],
    checklists: ['id', 'event_id', 'date_confirmed', 'time_confirmed', 'location_confirmed', 'contact_confirmed', 'authorized_event'],
    sub_events: ['id', 'parent_event_id', 'type', 'date', 'time', 'location', 'notes', 'completed'],
    expenses: ['id', 'event_id', 'category', 'description', 'value', 'date']
};

const validEventIds = new Set();
const validProfIds = new Set();

async function migrate() {
    for (const table of tables) {
        console.log(`\nLendo [${table}] do SQLite...`);
        try {
            const rows = await all(`SELECT * FROM ${table}`);
            if (rows && rows.length > 0) {
                console.log(`Encontrados ${rows.length} registros em [${table}]. Convertendo...`);
                
                const processedRows = rows.map(r => {
                    const newRow = { ...r };
                    
                    if (!newRow.id) {
                        newRow.id = crypto.randomUUID();
                    }
                    
                    if (table === 'events') {
                        validEventIds.add(newRow.id);
                        if (newRow.materials_delivered !== undefined) newRow.materials_delivered = !!newRow.materials_delivered;
                        if (newRow.additional_services !== undefined) newRow.additional_services = safeJsonParse(newRow.additional_services);
                    }
                    if (table === 'contracts') {
                        if (newRow.event_id && !validEventIds.has(newRow.event_id)) return null;
                        if (newRow.entry_payment_confirmed !== undefined) newRow.entry_payment_confirmed = !!newRow.entry_payment_confirmed;
                        if (newRow.payment_history !== undefined) newRow.payment_history = safeJsonParse(newRow.payment_history);
                    }
                    if (table === 'professionals') {
                        validProfIds.add(newRow.id);
                        if (newRow.roles !== undefined) newRow.roles = safeJsonParse(newRow.roles);
                    }
                    if (table === 'assignments') {
                        if (newRow.event_id && !validEventIds.has(newRow.event_id)) return null;
                        if (newRow.professional_id && !validProfIds.has(newRow.professional_id)) return null;
                        if (newRow.cache_paid !== undefined) newRow.cache_paid = !!newRow.cache_paid;
                        if (newRow.service_performed !== undefined) newRow.service_performed = !!newRow.service_performed;
                        if (newRow.primary !== undefined) newRow.primary = !!newRow.primary;
                        if (newRow.service_confirmed !== undefined) newRow.service_confirmed = !!newRow.service_confirmed;
                    }
                    if (table === 'checklists') {
                        if (newRow.event_id && !validEventIds.has(newRow.event_id)) return null;
                        if (newRow.date_confirmed !== undefined) newRow.date_confirmed = !!newRow.date_confirmed;
                        if (newRow.time_confirmed !== undefined) newRow.time_confirmed = !!newRow.time_confirmed;
                        if (newRow.location_confirmed !== undefined) newRow.location_confirmed = !!newRow.location_confirmed;
                        if (newRow.contact_confirmed !== undefined) newRow.contact_confirmed = !!newRow.contact_confirmed;
                        if (newRow.authorized_event !== undefined) newRow.authorized_event = !!newRow.authorized_event;
                    }
                    if (table === 'sub_events') {
                        if (newRow.parent_event_id && !validEventIds.has(newRow.parent_event_id)) return null;
                        if (newRow.completed !== undefined) newRow.completed = !!newRow.completed;
                    }
                    if (table === 'expenses') {
                        if (newRow.event_id && !validEventIds.has(newRow.event_id)) return null;
                    }

                    // Strict Schema Filter
                    const schema = schemas[table];
                    Object.keys(newRow).forEach(k => {
                        if (!schema.includes(k)) {
                            delete newRow[k];
                        }
                    });
                    
                    return newRow;
                }).filter(r => r !== null);

                console.log(`Enviando ${processedRows.length} registros para o Supabase...`);
                // Split into chunks of 100
                const chunkSize = 100;
                for (let i = 0; i < processedRows.length; i += chunkSize) {
                    const chunk = processedRows.slice(i, i + chunkSize);
                    const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id' });
                    if (error) {
                        import('fs').then(fs => fs.writeFileSync('error_report.json', JSON.stringify(error, null, 2)));
                        console.error(`Erro salvo em error_report.json`);
                        throw error;
                    }
                }
                
                console.log(`✅ [${table}] Migrada com sucesso!`);
            } else {
                console.log(`Aviso: Tabela [${table}] está vazia e foi ignorada.`);
            }
        } catch (e) {
            console.error(`❌ Erro fatal na migração de [${table}]:`, e);
            throw e;
        }
    }
    
    console.log("\n🚀 Migração do Banco de Dados concluída perfeitamente!");
    process.exit(0);
}

migrate();
