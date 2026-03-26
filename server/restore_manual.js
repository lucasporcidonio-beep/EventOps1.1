import db from './db.js';
import fs from 'fs';

const restore = async () => {
    console.log('Restoring database from SQL...');

    try {
        let sql = fs.readFileSync('c:/Users/lucas/Downloads/eventos_backup_2026-02-17.sql', 'utf8');

        // Map table names to match backend schema
        sql = sql.replace(/team_assignments/g, 'assignments');
        sql = sql.replace(/confirmation_checklists/g, 'checklists');
        sql = sql.replace(/event_expenses/g, 'expenses');

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
            db.exec(sql, (err) => {
                if (err) {
                    console.error('Error executing SQL:', err.message);
                } else {
                    console.log('Database restored successfully.');

                    // Verify counts
                    const tables = ['events', 'contracts', 'professionals', 'assignments', 'checklists', 'sub_events', 'expenses'];
                    tables.forEach(table => {
                        db.get(`SELECT COUNT(*) as count FROM ${table}`, (err, row) => {
                            if (!err) console.log(`${table}: ${row ? row.count : 0}`);
                            else console.error(`Error counting ${table}:`, err.message);
                        });
                    });
                }
            });
        });

    } catch (err) {
        console.error('Failed to read SQL file:', err.message);
    }
};

restore();
