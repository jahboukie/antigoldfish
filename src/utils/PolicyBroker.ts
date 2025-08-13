import * as fs from 'fs';
import * as path from 'path';
import * as minimatch from 'minimatch';

export interface Policy {
  allowedCommands: string[];
  allowedGlobs: string[];
  envPassthrough: string[];
  networkEgress: boolean;
  auditTrail: boolean;
  // New: portability and integrity toggles
  signExports?: boolean;              // default false; if true, agm export-context signs by default
  requireSignedContext?: boolean;     // default false; if true, agm import-context requires a valid signature
  forceSignedExports?: boolean;       // default false; if true, signing cannot be disabled (even with --no-sign)
}

export class PolicyBroker {
  private policy: Policy;
  private policyPath: string;
  private trustPath: string;

  constructor(policyPath: string = path.join(process.cwd(), '.antigoldfishmode', 'policy.json')) {
    this.policyPath = policyPath;
    this.trustPath = path.join(path.dirname(this.policyPath), 'trust.json');
    this.policy = this.loadPolicy();
  }

  private loadPolicy(): Policy {
    if (!fs.existsSync(this.policyPath)) {
      // Create default policy if it doesn't exist
      this.createDefaultPolicy();
    }
    const raw = fs.readFileSync(this.policyPath, 'utf8');
    let loaded: Policy = JSON.parse(raw);
    // Ensure required keys and merge with defaults if missing to avoid blocking
  const defaultPolicy: Policy = {
    allowedCommands: [
  "init","status","vector-status","ai-guide","index-code","search-code","journal","replay","receipt-show","remember","recall","policy",
  // .agmctx portability commands
  "export-context","import-context",
  // Diagnostics
  "prove-offline",
  // Global flags/commands that should never be blocked
  "help","--help","-h","version","--version","-V"
    ],
      allowedGlobs: ["**/*"],
      envPassthrough: ["NODE_ENV","AGM_MODE","PATH","HOME","USER","USERNAME"],
      networkEgress: false,
  auditTrail: true,
  signExports: false,
  requireSignedContext: false,
  forceSignedExports: false
    };
    let changed = false;
    if (!Array.isArray((loaded as any).allowedCommands)) { (loaded as any).allowedCommands = []; changed = true; }
    if (!Array.isArray((loaded as any).allowedGlobs)) { (loaded as any).allowedGlobs = []; changed = true; }
    if (!Array.isArray((loaded as any).envPassthrough)) { (loaded as any).envPassthrough = []; changed = true; }
    if (typeof (loaded as any).networkEgress !== 'boolean') { (loaded as any).networkEgress = defaultPolicy.networkEgress; changed = true; }
  if (typeof (loaded as any).auditTrail !== 'boolean') { (loaded as any).auditTrail = defaultPolicy.auditTrail; changed = true; }
  if (typeof (loaded as any).signExports !== 'boolean') { (loaded as any).signExports = defaultPolicy.signExports!; changed = true; }
  if (typeof (loaded as any).requireSignedContext !== 'boolean') { (loaded as any).requireSignedContext = defaultPolicy.requireSignedContext!; changed = true; }
  if (typeof (loaded as any).forceSignedExports !== 'boolean') { (loaded as any).forceSignedExports = defaultPolicy.forceSignedExports!; changed = true; }
    // Add critical defaults if missing
    for (const cmd of defaultPolicy.allowedCommands) {
      if (!loaded.allowedCommands.includes(cmd)) { loaded.allowedCommands.push(cmd); changed = true; }
    }
    if (loaded.allowedGlobs.length === 0) { loaded.allowedGlobs = defaultPolicy.allowedGlobs.slice(); changed = true; }
    if (loaded.envPassthrough.length === 0) { loaded.envPassthrough = defaultPolicy.envPassthrough.slice(); changed = true; }
    // Persist any changes back to disk for transparency
    if (changed) {
      try { fs.writeFileSync(this.policyPath, JSON.stringify(loaded, null, 2)); }
      catch {}
    }
    return loaded;
  }

  private createDefaultPolicy(): void {
  const defaultPolicy: Policy = {
      // Defaults are permissive for local testing; tighten in production
      allowedCommands: [
        "init",
        "status",
        "vector-status",
        "ai-guide",
        "index-code",
        "search-code",
        "journal",
        "replay",
        "receipt-show",
        // Memory ops only (license system removed in local-only pivot)
        "remember",
        "recall",
  // .agmctx portability
  "export-context",
  "import-context",
  // Health snapshot
  "health",
  // Diagnostics
  "prove-offline",
        // Global flags/commands that should never be blocked
        "help","--help","-h","version","--version","-V"
      ],
      allowedGlobs: ["**/*"],  // Allow all files by default for easier testing
      envPassthrough: ["NODE_ENV", "AGM_MODE", "PATH", "HOME", "USER", "USERNAME"],
      networkEgress: false,
  auditTrail: true,
  signExports: false,
  requireSignedContext: false,
  forceSignedExports: false
    };

    // Ensure directory exists
    const dir = path.dirname(this.policyPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write default policy
    fs.writeFileSync(this.policyPath, JSON.stringify(defaultPolicy, null, 2));
    console.log(`✅ Created default policy file: ${this.policyPath}`);
  }

  public isCommandAllowed(cmd: string): boolean {
    return this.policy.allowedCommands.includes(cmd);
  }

  public isFileAllowed(filePath: string): boolean {
    // Normalize Windows paths to POSIX for glob matching and allow matching absolute paths
    const posixPath = filePath.replace(/\\/g, '/');
    let rel = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
    if (!rel || rel === '.') rel = '.'; // project root
    const candidates = [posixPath, posixPath + '/', rel, rel + '/'];
    return this.policy.allowedGlobs.some(glob => {
      const pattern = glob.replace(/\\/g, '/');
      return candidates.some(target => minimatch.minimatch(target, pattern, { dot: true, nocase: true, matchBase: true }));
    });
  }

  public isEnvAllowed(envVar: string): boolean {
    return this.policy.envPassthrough.includes(envVar);
  }

  public isNetworkAllowed(): boolean {
    return !!this.policy.networkEgress;
  }

  public shouldAudit(): boolean {
    return !!this.policy.auditTrail;
  }

  public logAction(action: string, details: any): void {
    if (!this.shouldAudit()) return;
    const logPath = path.join(process.cwd(), '.antigoldfishmode', 'audit.log');
    const entry = { ts: new Date().toISOString(), action, details };
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
  }

  // ----- New: policy management helpers -----
  public getPolicy(): Policy { return this.policy; }

  public savePolicy(): void {
    fs.writeFileSync(this.policyPath, JSON.stringify(this.policy, null, 2));
  }

  public allowCommand(cmd: string): boolean {
    if (!this.policy.allowedCommands.includes(cmd)) {
      this.policy.allowedCommands.push(cmd);
      this.savePolicy();
      return true;
    }
    return false;
  }

  public allowPath(glob: string): boolean {
    if (!this.policy.allowedGlobs.includes(glob)) {
      this.policy.allowedGlobs.push(glob);
      this.savePolicy();
      return true;
    }
    return false;
  }

  public explainCommand(cmd: string): { allowed: boolean; reason: string; rule?: string } {
    const allowed = this.isCommandAllowed(cmd);
    return allowed
      ? { allowed, reason: 'Command present in allowedCommands', rule: 'allowedCommands' }
      : { allowed, reason: 'Command not present in allowedCommands' };
  }

  public explainPath(filePath: string): { allowed: boolean; reason: string; matchedGlob?: string } {
    const posixPath = filePath.replace(/\\/g, '/');
    let rel = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
    if (!rel || rel === '.') rel = '.';
    const candidates = [posixPath, posixPath + '/', rel, rel + '/'];
    for (const glob of this.policy.allowedGlobs) {
      const pattern = glob.replace(/\\/g, '/');
      for (const target of candidates) {
        if (minimatch.minimatch(target, pattern, { dot: true, nocase: true, matchBase: true })) {
          return { allowed: true, reason: 'Path matches allowedGlobs', matchedGlob: glob };
        }
      }
    }
    return { allowed: false, reason: 'No allowedGlobs matched' };
  }

  // ----- New: simple trust tokens -----
  private readTrust(): Record<string, number> {
    try { return JSON.parse(fs.readFileSync(this.trustPath, 'utf8')); } catch { return {}; }
  }
  private writeTrust(map: Record<string, number>): void {
    const dir = path.dirname(this.trustPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.trustPath, JSON.stringify(map, null, 2));
  }
  public addTrust(cmd: string, minutes: number): { until: string } {
    const m = this.readTrust();
    const until = Date.now() + Math.max(1, Math.floor(minutes)) * 60_000;
    m[cmd] = until;
    this.writeTrust(m);
    return { until: new Date(until).toISOString() };
  }
  public isTrusted(cmd: string): boolean {
    const m = this.readTrust();
    const t = m[cmd] || 0;
    return Date.now() < t;
  }
  public listTrust(): Array<{ cmd: string; until: string }>{
    const m = this.readTrust();
    return Object.entries(m)
      .map(([cmd, untilMs]) => ({ cmd, until: new Date(Number(untilMs)).toISOString() }))
      .filter(e => Date.parse(e.until) > Date.now())
      .sort((a,b) => Date.parse(a.until) - Date.parse(b.until));
  }
}
