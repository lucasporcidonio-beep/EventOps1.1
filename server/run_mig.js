import fs from 'fs';
import { execSync } from 'child_process';
try {
  const output = execSync('node migrate-to-supabase.js');
  fs.writeFileSync('mig_success.txt', output.toString());
} catch(e) {
  fs.writeFileSync('mig_err.txt', e.stdout.toString() + "\nERR:\n" + e.stderr.toString());
}
console.log("Done");
