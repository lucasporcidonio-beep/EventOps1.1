import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function test() {
    console.log("Testing Supabase REST GET...");
    const { data, error } = await supabase.from('events').select('id').limit(1);
    if (error) {
        if (error.code === '42P01') {
             console.log("REST API WORKS! (Table 'events' does not exist yet, which is expected)");
        } else {
             console.error("REST Error:", error);
        }
    } else {
        console.log("REST API WORKS! Data:", data);
    }
}
test();
