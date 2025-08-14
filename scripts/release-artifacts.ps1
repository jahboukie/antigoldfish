param(
  [string]$DistDir = "dist",
  [string]$OutDir = ".artifacts",
  [switch]$Sign
)

$ErrorActionPreference = 'Stop'

# Prepare output dir
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

# Copy artifacts (dist + package.json + LICENSE)
Copy-Item -Recurse -Force $DistDir "$OutDir/dist"
Copy-Item -Force package.json "$OutDir/package.json"
if (Test-Path LICENSE) { Copy-Item -Force LICENSE "$OutDir/LICENSE" }

# Checksums
$checksumFile = Join-Path $OutDir 'SHA256SUMS.txt'
Get-ChildItem $OutDir -Recurse | Where-Object { -not $_.PSIsContainer } | ForEach-Object {
  $hash = Get-FileHash -Algorithm SHA256 -Path $_.FullName
  "$($hash.Hash)  $($_.FullName.Substring((Resolve-Path $OutDir).Path.Length + 1))" | Add-Content $checksumFile
}

# Optional ed25519 detached signatures (requires age/openssl-like tooling not guaranteed)
if ($Sign) {
  # Prefer .securamem/keys with legacy .antigoldfishmode fallback. Generate new key in .securamem if none exist.
  $privNew = Join-Path ".securamem/keys" "release_ed25519"
  $privLegacy = Join-Path ".antigoldfishmode/keys" "release_ed25519"
  $priv = $null
  if (Test-Path $privNew) { $priv = $privNew }
  elseif (Test-Path $privLegacy) { $priv = $privLegacy }
  else {
    New-Item -ItemType Directory -Force -Path (Split-Path $privNew) | Out-Null
    try { ssh-keygen -t ed25519 -N "" -f $privNew | Out-Null } catch {}
    $priv = $privNew
  }
  Get-ChildItem $OutDir -Recurse | Where-Object { -not $_.PSIsContainer } | ForEach-Object {
    $sig = "${($_.FullName)}.sig"
    # Use ssh-keygen -Y sign requires OpenSSH 8.2+
    try { ssh-keygen -Y sign -f $priv -n file $_.FullName > $sig 2>$null } catch {}
  }
  Write-Host "Signed artifacts with $priv (if ssh-keygen -Y available)."
}

Write-Host "Artifacts prepared under $OutDir"
