import express from 'express';
import cors from 'cors';
import { supabase } from './supabaseClient.js';
import crypto from 'crypto';
import aiRoutes from './aiRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Proxy AI
app.use('/api/ai', aiRoutes);

// Generic CRUD endpoints mapped to Supabase
const allowedTables = ['events', 'contracts', 'professionals', 'assignments', 'checklists', 'sub_events', 'expenses'];

// Expose individual tables endpoints matching existing frontend
allowedTables.forEach(table => {
    app.get(`/${table}`, async (req, res) => {
        const { data, error } = await supabase.from(table).select('*');
        if (error) return res.status(500).json({ error: error.message });
        res.json(data);
    });

    app.post(`/${table}`, async (req, res) => {
        if (!req.body.id) req.body.id = crypto.randomUUID();
        
        // Remove materials_delivered se nulo antes do stringify ou insert?
        // Supabase-js ignora ou aceita json direto. Booleans também vão diretos.
        
        const { error } = await supabase.from(table).insert(req.body);
        if (error) return res.status(500).json({ error: error.message });

        // Specific legacy behavior for events (auto-expense)
        if (table === 'events') {
            await supabase.from('expenses').insert({
                id: crypto.randomUUID(),
                event_id: req.body.id,
                category: 'Administrativo',
                description: 'Despesa Administrativa',
                value: 50,
                date: new Date().toISOString().split('T')[0]
            });
        }
        res.json({ status: 'success' });
    });

    app.put(`/${table}/:id`, async (req, res) => {
        const { id } = req.params;
        const body = { ...req.body };
        delete body.id; // avoid mutating PK
        const { error } = await supabase.from(table).update(body).eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ status: 'success' });
    });

    app.delete(`/${table}/:id`, async (req, res) => {
        const { id } = req.params;
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        res.json({ status: 'success' });
    });
});

// Custom Contract Routes
app.get('/contracts/by-event/:event_id/contract-text', async (req, res) => {
    const { data, error } = await supabase.from('contracts').select('generated_contract_text').eq('event_id', req.params.event_id).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ contractText: data?.generated_contract_text || null });
});

app.put('/contracts/by-event/:event_id/contract-text', async (req, res) => {
    const { event_id } = req.params;
    const { contractText } = req.body;
    
    const { data: existing } = await supabase.from('contracts').select('id').eq('event_id', event_id).maybeSingle();
    let error;
    if (existing) {
        ({ error } = await supabase.from('contracts').update({ generated_contract_text: contractText }).eq('id', existing.id));
    } else {
        ({ error } = await supabase.from('contracts').insert({
            id: crypto.randomUUID(),
            event_id,
            generated_contract_text: contractText,
            total_value: 0,
            total_paid: 0,
            entry_payment_value: 0
        }));
    }
    if (error) return res.status(500).json({ error: error.message });
    res.json({ status: 'success' });
});

app.put('/contracts/by-event/:event_id', async (req, res) => {
    const { event_id } = req.params;
    const c = { ...req.body };
    delete c.id;
    delete c.event_id;
    
    const { data: existing } = await supabase.from('contracts').select('id').eq('event_id', event_id).maybeSingle();
    let error;
    if (existing) {
        ({ error } = await supabase.from('contracts').update(c).eq('id', existing.id));
    } else {
        ({ error } = await supabase.from('contracts').insert({
            id: crypto.randomUUID(),
            event_id,
            ...c
        }));
    }
    if (error) return res.status(500).json({ error: error.message });
    res.json({ status: 'success', action: existing ? 'updated' : 'inserted' });
});

// Listen locally if running direct Node
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const PORT = 3000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server proxy Supabase running at http://0.0.0.0:${PORT}`);
    });
}

export default app;
