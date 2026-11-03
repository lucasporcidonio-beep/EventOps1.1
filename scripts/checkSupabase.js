const SUPABASE_URL = "https://jsopcfkvhogngresxxnr.supabase.co";
const SUPABASE_KEY = "sb_publishable_8VIC4__1GLfEVSoJVsw3Pw_jgypLyHo";

async function check() {
  console.log("🔍 Conectando ao Supabase...");
  const tables = ["events", "contracts", "professionals", "assignments", "checklists", "sub_events", "expenses"];
  
  for (const table of tables) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        console.log(`✅ Tabela '${table}': ${data.length} registros`);
      } else {
        console.log(`⚠️ Tabela '${table}': HTTP ${res.status} - ${await res.text()}`);
      }
    } catch (err) {
      console.error(`❌ Erro na tabela '${table}':`, err.message);
    }
  }
}

check();
