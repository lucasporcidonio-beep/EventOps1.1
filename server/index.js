import express from 'express';
import cors from 'cors';
import multer from 'multer';
import db from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import aiRoutes from './aiRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Serve frontend web app (pasta dist)
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Mount AI Routes
app.use('/api/ai', aiRoutes);

// Helper for Promisified DB queries
const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

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
        // Support legacy schema where roles might just be a plain string
        if (typeof str === 'string' && !str.trim().startsWith('[') && !str.trim().startsWith('{')) {
            return [str.trim()];
        }
        return JSON.parse(str);
    } catch (e) {
        console.error('JSON Parse Error for value:', str, 'Error:', e.message);
        return [];
    }
};

// --- ROUTES ---

// EVENTS
app.get('/events', async (req, res) => {
    try {
        const rows = await all('SELECT * FROM events');
        const events = rows.map(e => {
            try {
                return {
                    ...e,
                    additional_services: safeJsonParse(e.additional_services),
                    materials_delivered: !!e.materials_delivered
                };
            } catch (mapErr) {
                console.error('Error mapping event:', e.id, mapErr);
                throw mapErr;
            }
        });
        res.json(events);
    } catch (err) {
        console.error('GET /events Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/events', async (req, res) => {
    const e = req.body;
    const sql = `INSERT INTO events (id, event_type, client_name, client_phone, client_rg, client_birthdate, client_address, event_date, coverage_start_time, coverage_end_time, ceremony_location, reception_location, main_service, additional_services, operational_status, confirmation_status, notes, debutante_name, groom_name, bride_name, birthday_person_name, package_name, package_value, materials_delivered) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [e.id, e.event_type, e.client_name, e.client_phone, e.client_rg, e.client_birthdate, e.client_address, e.event_date, e.coverage_start_time, e.coverage_end_time, e.ceremony_location, e.reception_location, e.main_service, JSON.stringify(e.additional_services), e.operational_status, e.confirmation_status, e.notes, e.debutante_name, e.groom_name, e.bride_name, e.birthday_person_name, e.package_name, e.package_value, e.materials_delivered ? 1 : 0];
    try {
        await run(sql, params);
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/events/:id', async (req, res) => {
    const { id } = req.params;
    const e = req.body;
    // Construct dynamic update query
    const updates = [];
    const params = [];

    if (e.additional_services) e.additional_services = JSON.stringify(e.additional_services);
    if (e.materials_delivered !== undefined) e.materials_delivered = e.materials_delivered ? 1 : 0;

    for (const key in e) {
        if (key !== 'id') {
            updates.push(`${key} = ?`);
            params.push(e[key]);
        }
    }

    if (updates.length === 0) return res.json({ status: 'no changes' });

    params.push(id);
    const sql = `UPDATE events SET ${updates.join(', ')} WHERE id = ?`;

    try {
        await run(sql, params);
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/events/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await run('DELETE FROM events WHERE id = ?', [id]);
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CONTRACTS
app.get('/contracts', async (req, res) => {
    try {
        const rows = await all('SELECT * FROM contracts');
        const contracts = rows.map(c => {
            try {
                return {
                    ...c,
                    payment_history: safeJsonParse(c.payment_history),
                    entry_payment_confirmed: !!c.entry_payment_confirmed
                };
            } catch (mapErr) {
                console.error('Error mapping contract:', c.id, mapErr);
                throw mapErr;
            }
        });
        res.json(contracts);
    } catch (err) {
        console.error('GET /contracts Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/contracts/:id', async (req, res) => { // Get by ID (usually event_id in this schema based on frontend?)
    // Actually schema says id is primary key, event_id is FK. 
    // Frontend might fetch by event_id? let's stick to standard CRUD for now or check usage if needed.
    // Standard CRUD
    try {
        const row = await get('SELECT * FROM contracts WHERE id = ?', [req.params.id]);
        if (!row) return res.status(404).json({ error: 'Contract not found' });

        row.payment_history = safeJsonParse(row.payment_history);
        row.entry_payment_confirmed = !!row.entry_payment_confirmed;

        res.json(row);
    } catch (err) {
        console.error('GET /contracts/:id Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/contracts', async (req, res) => {
    const c = req.body;
    const sql = `INSERT INTO contracts (id, event_id, total_value, total_paid, entry_payment_value, entry_payment_date, entry_payment_method, entry_payment_confirmed, payment_history) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [c.id, c.event_id, c.total_value, c.total_paid, c.entry_payment_value, c.entry_payment_date, c.entry_payment_method, c.entry_payment_confirmed ? 1 : 0, JSON.stringify(c.payment_history)];
    try {
        await run(sql, params);
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update contract by event_id (works even when contract id is null/empty due to DB restore)
app.put('/contracts/by-event/:event_id', async (req, res) => {
    const { event_id } = req.params;
    const c = req.body;
    
    try {
        // Check if contract exists for this event
        const existing = await get('SELECT event_id FROM contracts WHERE event_id = ?', [event_id]);
        
        if (!existing) {
            // INSERT (Upsert logic for new events that somehow lost their contract creation payload)
            const crypto = await import('crypto');
            const newId = crypto.randomUUID();
            const payHist = c.payment_history ? JSON.stringify(c.payment_history) : '[]';
            const sqlInsert = `INSERT INTO contracts (id, event_id, total_value, total_paid, entry_payment_value, entry_payment_date, entry_payment_method, entry_payment_confirmed, payment_history) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const paramsInsert = [
                newId, 
                event_id, 
                c.total_value || 0, 
                c.total_paid || 0, 
                c.entry_payment_value || 0, 
                c.entry_payment_date || null, 
                c.entry_payment_method || null, 
                c.entry_payment_confirmed ? 1 : 0, 
                payHist
            ];
            await run(sqlInsert, paramsInsert);
            console.log('[PUT /contracts/by-event] INSERTED new contract for event_id:', event_id);
            return res.json({ status: 'success', action: 'inserted', id: newId });
        }

        // UPDATE (Contract exists)
        const updates = [];
        const params = [];

        if (c.payment_history !== undefined) c.payment_history = JSON.stringify(c.payment_history);
        if (c.entry_payment_confirmed !== undefined) c.entry_payment_confirmed = c.entry_payment_confirmed ? 1 : 0;

        for (const key in c) {
            if (key !== 'id' && key !== 'event_id') {
                updates.push(`${key} = ?`);
                params.push(c[key]);
            }
        }

        if (updates.length === 0) return res.json({ status: 'no changes' });

        params.push(event_id);
        const sqlUpdate = `UPDATE contracts SET ${updates.join(', ')} WHERE event_id = ?`;
        
        await run(sqlUpdate, params);
        console.log('[PUT /contracts/by-event] UPDATED contract for event_id:', event_id);
        res.json({ status: 'success', action: 'updated' });
    } catch (err) {
        console.error('[PUT /contracts/by-event] ERROR:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.put('/contracts/:id', async (req, res) => {
    const { id } = req.params;
    const c = req.body;
    const updates = [];
    const params = [];

    if (c.payment_history) c.payment_history = JSON.stringify(c.payment_history);
    if (c.entry_payment_confirmed !== undefined) c.entry_payment_confirmed = c.entry_payment_confirmed ? 1 : 0;

    for (const key in c) {
        if (key !== 'id' && key !== 'event_id') {
            updates.push(`${key} = ?`);
            params.push(c[key]);
        }
    }

    if (updates.length === 0) return res.json({ status: 'no changes' });

    params.push(id);
    const sql = `UPDATE contracts SET ${updates.join(', ')} WHERE id = ?`;
    console.log('[PUT /contracts] SQL:', sql);
    console.log('[PUT /contracts] Params:', params);

    try {
        await run(sql, params);
        console.log('[PUT /contracts] Success for id:', id);
        res.json({ status: 'success' });
    } catch (err) {
        console.error('[PUT /contracts] SQL ERROR:', err.message, '| SQL:', sql);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/contracts/:id', async (req, res) => {
    try {
        await run('DELETE FROM contracts WHERE id = ?', [req.params.id]);
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// PROFESSIONALS
app.get('/professionals', async (req, res) => {
    try {
        const rows = await all('SELECT * FROM professionals');
        const professionals = rows.map(p => {
            try {
                return {
                    ...p,
                    roles: safeJsonParse(p.roles)
                };
            } catch (mapErr) {
                console.error('Error mapping professional:', p.id, mapErr);
                throw mapErr;
            }
        });
        res.json(professionals);
    } catch (err) {
        console.error('GET /professionals Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/professionals', async (req, res) => {
    const p = req.body;
    const sql = `INSERT INTO professionals (id, name, roles, pix_key, phone, notes) VALUES (?, ?, ?, ?, ?, ?)`;
    const params = [p.id, p.name, JSON.stringify(p.roles), p.pix_key, p.phone, p.notes];
    try {
        await run(sql, params);
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/professionals/:id', async (req, res) => {
    const { id } = req.params;
    const p = req.body;
    const updates = [];
    const params = [];

    if (p.roles) p.roles = JSON.stringify(p.roles);

    for (const key in p) {
        if (key !== 'id') {
            updates.push(`${key} = ?`);
            params.push(p[key]);
        }
    }

    if (updates.length === 0) return res.json({ status: 'no changes' });

    params.push(id);
    const sql = `UPDATE professionals SET ${updates.join(', ')} WHERE id = ?`;

    try {
        await run(sql, params);
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/professionals/:id', async (req, res) => {
    try {
        await run('DELETE FROM professionals WHERE id = ?', [req.params.id]);
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ASSIGNMENTS, CHECKLISTS, SUBEVENTS, EXPENSES (Simplified generic handlers could be used but sticking to explicit)
// ... For brevity I will implement GET/POST/DELETE for these in similar fashion.

// Helper for other tables
const createSimpleCrud = (tableName, jsonFields = [], boolFields = [], fieldList = null) => {
    app.get(`/${tableName}`, async (req, res) => {
        try {
            const rows = await all(`SELECT * FROM ${tableName}`);
            const results = rows.map(r => {
                jsonFields.forEach(f => { if (r[f]) r[f] = JSON.parse(r[f]) });
                boolFields.forEach(f => { r[f] = !!r[f] });
                return r;
            });
            res.json(results);
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.post(`/${tableName}`, async (req, res) => {
        const body = req.body;
        const keys = fieldList ? fieldList : Object.keys(body);
        const values = keys.map(k => {
            let v = body[k];
            if (jsonFields.includes(k)) v = JSON.stringify(v);
            if (boolFields.includes(k)) v = v ? 1 : 0;
            return v;
        });
        const placeholders = keys.map(() => '?').join(', ');
        // Wrap column names in double quotes to prevent syntax errors with reserved keywords like "primary"
        const quotedKeys = keys.map(k => `"${k}"`);
        const sql = `INSERT INTO ${tableName} (${quotedKeys.join(', ')}) VALUES (${placeholders})`;
        try {
            await run(sql, values);
            res.json({ status: 'success' });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.put(`/${tableName}/:id`, async (req, res) => {
        const { id } = req.params;
        const body = req.body;
        const updates = [];
        const params = [];
        for (const k in body) {
            if (k === 'id') continue;
            let v = body[k];
            if (jsonFields.includes(k)) v = JSON.stringify(v);
            if (boolFields.includes(k)) v = v ? 1 : 0;
            updates.push(`"${k}" = ?`);
            params.push(v);
        }
        if (updates.length === 0) return res.json({ status: 'no changes' });
        params.push(id);

        try {
            await run(`UPDATE ${tableName} SET ${updates.join(', ')} WHERE id = ?`, params);
            res.json({ status: 'success' });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });

    app.delete(`/${tableName}/:id`, async (req, res) => {
        try {
            await run(`DELETE FROM ${tableName} WHERE id = ?`, [req.params.id]);
            res.json({ status: 'success' });
        } catch (err) { res.status(500).json({ error: err.message }); }
    });
}

createSimpleCrud('assignments', [], ['cache_paid', 'service_confirmed', 'primary']);
createSimpleCrud('checklists', [], ['date_confirmed', 'time_confirmed', 'location_confirmed', 'contact_confirmed', 'authorized_event']);
createSimpleCrud('sub_events', [], ['completed']);
createSimpleCrud('expenses', [], []);


// --- BACKUP & RESTORE ---
const upload = multer({ dest: 'uploads/' });

app.get('/backup', (req, res) => {
    const dbPath = './database.sqlite';
    res.download(dbPath, `eventflow_backup_${new Date().toISOString().split('T')[0]}.sqlite`);
});

app.post('/restore', upload.single('backup'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const dbPath = './database.sqlite';

    // Close DB execution before replacing file?? 
    // Ideally we should close the connection, replace file, reopen. 
    // For simplicity in this dev server, we will try to copy over.
    // SQLite allows copying over while open but it's risky. 
    // A better approach is closing it. But `sqlite3` lib doesn't make it super easy to close/reopen globally efficiently in this simple setup.

    // Let's just try to move the file over.

    fs.copyFile(req.file.path, dbPath, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to restore backup' });
        }

        // Clean up uploaded file
        fs.unlink(req.file.path, () => { });

        res.json({ status: 'success', message: 'Backup restored. Restart server if needed.' });

        // Trigger a reload of the DB object?
        // Since we import `db` which is an instance, replacing the file underneath might cause issues if WAL mode is on or locks are held.
        // But for single user local app, it generally works or user can restart server.
    });
});

app.post('/restore-sql', upload.single('backup'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    fs.readFile(req.file.path, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read backup file' });
        }

        // Map table names to match backend schema
        let sqlContent = data;
        sqlContent = sqlContent.replace(/team_assignments/g, 'assignments');
        sqlContent = sqlContent.replace(/confirmation_checklists/g, 'checklists');
        sqlContent = sqlContent.replace(/event_expenses/g, 'expenses');

        db.serialize(() => {
            // Drop tables in correct order (child tables first)
            const dropTables = [
                'expenses',
                'sub_events',
                'checklists',
                'assignments',
                'payment_history',
                'contracts',
                'professionals',
                'events'
            ];

            dropTables.forEach(table => {
                db.run(`DROP TABLE IF EXISTS ${table}`);
            });

            // Execute SQL script
            db.exec(sqlContent, (err) => {
                // Clean up uploaded file
                fs.unlink(req.file.path, () => { });

                if (err) {
                    console.error("SQL Restore Error:", err);
                    return res.status(500).json({ error: 'Error executing SQL script: ' + err.message });
                }

                res.json({ status: 'success', message: 'SQL backup restored successfully.' });
            });
        });
    });
});


app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
    console.log(`Web app disponível em http://localhost:${PORT}`);
});
