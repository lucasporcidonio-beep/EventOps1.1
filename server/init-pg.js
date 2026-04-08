import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const { Client } = pg;

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log("Connected to PostgreSQL");
        const schemaPath = path.join(__dirname, '..', '.gemini', 'artifacts', 'supabase_schema.sql');
        
        let schemaSql = "";
        try {
             schemaSql = fs.readFileSync(schemaPath, 'utf8');
        } catch (e) {
             // Fallback
             schemaSql = fs.readFileSync(path.join(__dirname, '..', 'brain', '4e1c831e-84ab-4294-8a0e-363aa64c9040', 'supabase_schema.sql'), 'utf8');
        }

        await client.query(schemaSql);
        console.log("Schema successfully created in PostgreSQL!");
    } catch (err) {
        console.error("Error connecting or executing:", err);
    } finally {
        await client.end();
    }
}

run();
