// Minimal shim to compile VS Code extension without pulling full @types
// This avoids external downloads in air-gapped environments.
declare module 'vscode' {
  const anything: any;
  export = anything;
}
