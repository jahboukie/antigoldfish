import * as fs from 'fs';
import * as path from 'path';

function findLastReceipt(projectRoot: string): string | null {
  const dir = path.join(projectRoot, '.antigoldfishmode', 'receipts');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  if (!files.length) return null;
  // sort by timestamp prefix (our IDs start with Date.now())
  files.sort((a, b) => (a < b ? 1 : -1));
  return path.join(dir, files[0]);
}

function findLastNReceipts(projectRoot: string, n: number): string[] {
  const dir = path.join(projectRoot, '.antigoldfishmode', 'receipts');
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  if (!files.length) return [];
  files.sort((a, b) => (a < b ? 1 : -1));
  return files.slice(0, Math.max(1, n)).map(f => path.join(dir, f));
}

export async function handleReceiptShow(idOrPath?: string, opts?: { last?: boolean; limit?: number }): Promise<void> {
  const projectRoot = process.cwd();
  let filePath: string | undefined;

  if (opts?.limit && (!idOrPath || opts.last)) {
    const n = Math.max(1, Math.min(50, opts.limit));
    const files = findLastNReceipts(projectRoot, n);
    if (!files.length) { console.error('No receipts found.'); return; }
    for (const fp of files) {
      try {
        const json = JSON.parse(fs.readFileSync(fp, 'utf8'));
        const ordered: any = {};
        const keys = ['schema','version','id','command','argv','cwd','startTime','endTime','params','resultSummary','results','success','exitCode','error','digests'];
        for (const k of keys) if (k in json) ordered[k] = json[k];
        for (const k of Object.keys(json)) if (!(k in ordered)) ordered[k] = json[k];
        console.log(JSON.stringify(ordered, null, 2));
      } catch (e) {
        console.error('Failed to parse receipt:', (e as Error).message);
      }
    }
    return;
  } else if (opts?.last || !idOrPath) {
    const last = findLastReceipt(projectRoot);
    if (!last) { console.error('No receipts found.'); return; }
    filePath = last;
  } else {
    filePath = idOrPath;
    if (!/\.json$/i.test(filePath)) {
      filePath = path.join(projectRoot, '.antigoldfishmode', 'receipts', `${filePath}.json`);
    }
  }

  if (!filePath || !fs.existsSync(filePath)) {
    console.error(`Receipt not found: ${filePath}`);
    return;
  }
  try {
    const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // Pretty print with key ordering for readability
    const ordered: any = {};
    const keys = ['schema','version','id','command','argv','cwd','startTime','endTime','params','resultSummary','results','success','exitCode','error','digests'];
    for (const k of keys) if (k in json) ordered[k] = json[k];
    for (const k of Object.keys(json)) if (!(k in ordered)) ordered[k] = json[k];
    console.log(JSON.stringify(ordered, null, 2));
  } catch (e) {
    console.error('Failed to parse receipt:', (e as Error).message);
  }
}

