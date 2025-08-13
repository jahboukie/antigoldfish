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
  # Try to use ssh-keygen style ed25519 if available (Windows OpenSSH)
  $priv = Join-Path ".antigoldfishmode/keys" "release_ed25519"
  if (-not (Test-Path $priv)) {
    New-Item -ItemType Directory -Force -Path (Split-Path $priv) | Out-Null
    ssh-keygen -t ed25519 -N "" -f $priv | Out-Null
  }
  Get-ChildItem $OutDir -Recurse | Where-Object { -not $_.PSIsContainer } | ForEach-Object {
    $sig = "$($_.FullName).sig"
    # Use ssh-keygen -Y sign requires OpenSSH 8.2+
    try { ssh-keygen -Y sign -f $priv -n file $_.FullName > $sig 2>$null } catch {}
  }
  Write-Host "Signed artifacts with $priv (if ssh-keygen -Y available)."
}

Write-Host "Artifacts prepared under $OutDir"
