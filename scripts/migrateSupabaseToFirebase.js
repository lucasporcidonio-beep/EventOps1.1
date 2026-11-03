import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";

// 1. Carrega configurações do Firebase via .env
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...values] = trimmed.split("=");
      if (key && values.length > 0) {
        process.env[key.trim()] = values.join("=").trim();
      }
    }
  });
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const SUPABASE_URL = "https://jsopcfkvhogngresxxnr.supabase.co";
const SUPABASE_KEY = "sb_publishable_8VIC4__1GLfEVSoJVsw3Pw_jgypLyHo";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Limpeza de campos vazios ou undefined para o Firestore
function sanitizeDoc(raw) {
  const clean = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value !== undefined && value !== null) {
      clean[key] = value;
    }
  }
  return clean;
}

async function fetchFromSupabase(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Falha ao buscar tabela ${table}: HTTP ${res.status} - ${await res.text()}`);
  }

  return await res.json();
}

async function runMigration() {
  console.log("==================================================");
  console.log("🚀 INICIANDO MIGRAÇÃO SUPABASE -> FIREBASE FIRESTORE");
  console.log("==================================================");

  const tables = [
    "events",
    "contracts",
    "professionals",
    "assignments",
    "checklists",
    "sub_events",
    "expenses",
  ];

  const fullBackup = {
    exportedAt: new Date().toISOString(),
    source: "Supabase (jsopcfkvhogngresxxnr.supabase.co)",
    destination: "Firebase Firestore (eventops-app)",
    tables: {},
  };

  for (const table of tables) {
    console.log(`\n📦 Buscando registros da tabela '${table}' no Supabase...`);
    const records = await fetchFromSupabase(table);
    console.log(`-> Encontrados ${records.length} registros em '${table}'.`);
    fullBackup.tables[table] = records;

    let migrated = 0;
    for (const record of records) {
      const docId = String(record.id || crypto.randomUUID());
      const cleanData = sanitizeDoc(record);

      // Tratamento específico de tipos caso venha stringificado do PostgreSQL
      if (table === "events" && typeof cleanData.additional_services === "string") {
        try { cleanData.additional_services = JSON.parse(cleanData.additional_services); } catch {}
      }
      if (table === "contracts" && typeof cleanData.payment_history === "string") {
        try { cleanData.payment_history = JSON.parse(cleanData.payment_history); } catch {}
      }
      if (table === "professionals" && typeof cleanData.roles === "string") {
        try { cleanData.roles = JSON.parse(cleanData.roles); } catch {}
      }

      const docRef = doc(db, table, docId);
      await setDoc(docRef, cleanData, { merge: true });
      migrated++;
    }
    console.log(`✅ Sucesso: ${migrated}/${records.length} documentos salvos na coleção '${table}' do Firebase.`);
  }

  // Salva backup local completo em JSON por segurança
  const backupPath = path.resolve(process.cwd(), "backup_supabase_completo.json");
  fs.writeFileSync(backupPath, JSON.stringify(fullBackup, null, 2), "utf-8");
  console.log("\n==================================================");
  console.log(`🛡️ BACKUP DE SEGURANÇA SALVO EM: ${backupPath}`);
  console.log("🎉 MIGRAÇÃO CONCLUÍDA COM 100% DE SUCESSO!");
  console.log("==================================================");
  process.exit(0);
}

runMigration().catch((err) => {
  console.error("❌ Erro fatal durante migração:", err);
  process.exit(1);
});
