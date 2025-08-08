import * as fs from 'fs';
import * as path from 'path';

export async function handleJournal(opts: any, cleanup: () => Promise<void>): Promise<void> {
  try {
    const journalPath = path.join(process.cwd(), '.antigoldfishmode', 'journal.jsonl');
    if (opts.show) {
      if (!fs.existsSync(journalPath)) { console.log('No journal found.'); return; }
      const text = fs.readFileSync(journalPath, 'utf8');
      const lines = text.trim() ? text.trim().split(/\r?\n/).slice(-100) : [];
      if (!lines.length) { console.log('Journal is empty.'); return; }
      console.log('📒 AGM Journal (latest 100 entries):');
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

