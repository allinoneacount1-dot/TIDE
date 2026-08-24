<#
  TIDE local devnet — one command, Windows.

    powershell -ExecutionPolicy Bypass -File scripts\devnet.ps1

  Starts Anvil, deploys the contracts and a complete simulated market, funds a
  test account, points the frontend at it, and opens the app.

  Everything it stands up is real: real contracts, real transactions, real
  balances. Only the *market* is simulated — Robinhood Chain testnet has no
  stock tokens, no DEX aggregator and no price feeds, so the deploy script
  publishes mocks and every screen that shows them says SIMULATED.
#>

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$foundry = Join-Path $HOME ".foundry\bin"
$anvilExe = Join-Path $foundry "anvil.exe"
$forgeExe = Join-Path $foundry "forge.exe"
$castExe  = Join-Path $foundry "cast.exe"

# Anvil's first account. Public, deterministic, worthless outside a devnet.
$DEPLOYER = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
$RPC = "http://127.0.0.1:8545"

foreach ($exe in @($anvilExe, $forgeExe, $castExe)) {
  if (-not (Test-Path $exe)) { throw "Foundry not found at $foundry. Install it: https://book.getfoundry.sh" }
}

Write-Host "`n[1/5] starting anvil (chain 31337)" -ForegroundColor Cyan
# Reuse a node that is already listening rather than killing processes by name.
$up = $false
try { & $castExe chain-id --rpc-url $RPC 2>$null | Out-Null; $up = $LASTEXITCODE -eq 0 } catch { $up = $false }
if ($up) {
  Write-Host "      a node is already listening on 8545 - reusing it"
} else {
  Start-Process -FilePath $anvilExe -ArgumentList "--chain-id","31337","--block-time","1","--silent" -WindowStyle Hidden
  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 500
    try { & $castExe chain-id --rpc-url $RPC 2>$null | Out-Null; if ($LASTEXITCODE -eq 0) { break } } catch {}
  }
}

Write-Host "[2/5] deploying contracts + simulated market" -ForegroundColor Cyan
Push-Location (Join-Path $root "contracts")
& $forgeExe script "script/DeploySimulated.s.sol:DeploySimulated" --rpc-url $RPC --broadcast --private-key $DEPLOYER | Out-Null
$dep = Get-Content "deployments/31337.json" | ConvertFrom-Json
Pop-Location
Write-Host "      registry $($dep.registry)"
Write-Host "      quote    $($dep.quote)"

Write-Host "[3/5] funding the first Anvil account with 100,000 USDG" -ForegroundColor Cyan
$acct = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
& $castExe send $dep.quote "mint(address,uint256)" $acct 100000000000 --rpc-url $RPC --private-key $DEPLOYER | Out-Null

Write-Host "[4/5] pointing the frontend at the devnet" -ForegroundColor Cyan
$env_path = Join-Path $root "frontend\.env.local"
@"
# Written by scripts/devnet.ps1. Local devnet only.
NEXT_PUBLIC_DEFAULT_CHAIN_ID=31337
NEXT_PUBLIC_ROBINHOOD_TESTNET_RPC_URL=$RPC
"@ | Set-Content -Path $env_path -Encoding UTF8

Write-Host "[5/5] starting the app" -ForegroundColor Cyan
Push-Location (Join-Path $root "frontend")
if (-not (Test-Path "node_modules")) { npx --yes pnpm@11.22.0 install }
Write-Host "`n  Import this key into your wallet and add network 31337 at $RPC" -ForegroundColor Yellow
Write-Host "  $DEPLOYER`n" -ForegroundColor Yellow
Write-Host "  http://localhost:3000/app`n" -ForegroundColor Green
npx --yes pnpm@11.22.0 dev
Pop-Location
