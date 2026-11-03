import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";

// Carrega .env manualmente caso --env-file não tenha sido passado
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

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("❌ Erro: Configure as credenciais do Firebase no arquivo .env antes de executar este script.");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const sampleEvents = [
  {
    id: "evt-casamento-juliana",
    event_type: "Casamento",
    client_name: "Juliana & Lucas",
    client_phone: "(11) 98765-4321",
    client_address: "Av. Paulista, 1000 - São Paulo, SP",
    event_date: "2026-05-16",
    coverage_start_time: "16:00",
    coverage_end_time: "23:00",
    ceremony_location: "Igreja Nossa Senhora do Brasil",
    reception_location: "Espaço Villa Bisutti",
    main_service: "Fotografia",
    additional_services: ["Vídeo", "Drone", "Álbum"],
    operational_status: "Planejado",
    confirmation_status: "Confirmado",
    notes: "Noiva quer foco em fotos espontâneas durante a festa.",
    package_name: "Combo Diamante",
    package_value: 8500,
    bride_name: "Juliana Mendes",
    groom_name: "Lucas Porcidonio"
  },
  {
    id: "evt-debutante-isabela",
    event_type: "Debutante",
    client_name: "Fernanda (Mãe da Isabela)",
    client_phone: "(11) 91234-5678",
    client_address: "Rua Oscar Freire, 500 - São Paulo, SP",
    event_date: "2026-06-20",
    coverage_start_time: "19:00",
    coverage_end_time: "02:00",
    ceremony_location: "Buffet França",
    reception_location: "Buffet França",
    main_service: "Fotografia",
    additional_services: ["Storymaker", "Reels"],
    operational_status: "Planejado",
    confirmation_status: "Aguardando",
    notes: "Valsa às 22h com 15 casais.",
    debutante_name: "Isabela Martins",
    package_name: "Debutante Gold",
    package_value: 6200
  }
];

const sampleProfessionals = [
  {
    id: "prof-marcos",
    name: "Marcos Silva",
    roles: ["Fotógrafo"],
    default_role: "Fotógrafo",
    phone: "(11) 97777-1111",
    pix_key: "marcos.foto@gmail.com",
    notes: "Especialista em retratos e cerimônia."
  },
  {
    id: "prof-carolina",
    name: "Carolina Souza",
    roles: ["Storymaker", "Videomaker"],
    default_role: "Storymaker",
    phone: "(11) 97777-2222",
    pix_key: "11977772222",
    notes: "Stories em tempo real e Reels de impacto."
  }
];

async function seed() {
  console.log("🚀 Iniciando povoamento no Firestore...");

  for (const event of sampleEvents) {
    await setDoc(doc(db, "events", event.id), event);
    console.log(`✅ Evento salvo: ${event.client_name}`);

    // Contrato
    await setDoc(doc(db, "contracts", `ctr-${event.id}`), {
      id: `ctr-${event.id}`,
      event_id: event.id,
      total_value: event.package_value,
      total_paid: Math.round(event.package_value * 0.3),
      entry_payment_value: Math.round(event.package_value * 0.3),
      entry_payment_confirmed: true,
      signed: true,
      payment_history: [
        {
          id: "pay-1",
          date: new Date().toISOString().split("T")[0],
          value: Math.round(event.package_value * 0.3),
          method: "PIX",
          notes: "Entrada / Sinal de Reserva"
        }
      ]
    });

    // Checklist
    await setDoc(doc(db, "checklists", `chk-${event.id}`), {
      id: `chk-${event.id}`,
      event_id: event.id,
      event_date_confirmed: true,
      coverage_time_confirmed: true,
      locations_confirmed: true,
      contact_name: event.client_name,
      contact_phone: event.client_phone,
      authorized: true
    });
  }

  for (const prof of sampleProfessionals) {
    await setDoc(doc(db, "professionals", prof.id), prof);
    console.log(`✅ Profissional salvo: ${prof.name}`);
  }

  console.log("🎉 Povoamento concluído com sucesso no Firebase!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Erro ao povoar Firestore:", err);
  process.exit(1);
});
