import * as fs from 'fs';
import * as path from 'path';
import { Paths } from '../utils/Paths';

export async function handleJournal(opts: any, cleanup: () => Promise<void>): Promise<void> {
  try {
  const journalPath = Paths.journalPath(process.cwd());
    if (opts.show) {
      if (!fs.existsSync(journalPath)) { console.log('No journal found.'); return; }
      const text = fs.readFileSync(journalPath, 'utf8');
      const lines = text.trim() ? text.trim().split(/\r?\n/).slice(-100) : [];
      if (!lines.length) { console.log('Journal is empty.'); return; }
  console.log('📒 SecuraMem Journal (latest 100 entries):');
      lines.forEach((l) => console.log(l));
      return;
    }
    if (opts.clear) {
      if (!fs.existsSync(journalPath)) { console.log('No journal to clear.'); return; }
      fs.writeFileSync(journalPath, '');
      console.log('🧹 Journal cleared.');
      return;
    }
    console.log('Use --show or --clear');
  } catch (e) {
    console.error('journal error:', (e as Error).message);
  } finally {
    await cleanup();
  }
}

