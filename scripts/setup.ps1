# setup.ps1 — Setup Cleanly App sur Windows
# Exécuter depuis la racine du projet : .\scripts\setup.ps1

Write-Host "`n🧹 Cleanly App — Setup Windows`n" -ForegroundColor Cyan

# 1. Vérifier Node.js
Write-Host "🔍 Vérification Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "❌ Node.js non trouvé. Installez-le depuis https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js $nodeVersion" -ForegroundColor Green

# 2. Vérifier Git
$gitVersion = git --version 2>$null
if (-not $gitVersion) {
    Write-Host "❌ Git non trouvé. Installez-le depuis https://git-scm.com" -ForegroundColor Red
    exit 1
}
Write-Host "✅ $gitVersion" -ForegroundColor Green

# 3. Installer les dépendances npm
Write-Host "`n📦 Installation des dépendances npm..." -ForegroundColor Yellow
npm install
Write-Host "✅ Dépendances installées" -ForegroundColor Green

# 4. Installer les skills Antigravity
Write-Host "`n🤖 Installation des skills Antigravity..." -ForegroundColor Yellow
$skillsDest = "$env:USERPROFILE\.gemini\config\skills"
$skillsSrc  = Join-Path $PSScriptRoot "..\\.agents\\skills"

if (Test-Path $skillsSrc) {
    New-Item -ItemType Directory -Force -Path $skillsDest | Out-Null
    Copy-Item -Recurse -Force "$skillsSrc\*" "$skillsDest\"
    Write-Host "✅ Skills installées dans $skillsDest" -ForegroundColor Green
    
    Get-ChildItem $skillsDest -Directory | ForEach-Object {
        Write-Host "   📚 $($_.Name)" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Dossier .agents/skills non trouvé" -ForegroundColor Yellow
}

# 5. Copier les règles globales
Write-Host "`n📋 Configuration des règles Antigravity..." -ForegroundColor Yellow
$rulesFile = Join-Path $PSScriptRoot "..\\.agents\\GEMINI.md"
$rulesDest = "$env:USERPROFILE\.gemini\config\GEMINI.md"
if (Test-Path $rulesFile) {
    Copy-Item -Force $rulesFile $rulesDest
    Write-Host "✅ Règles copiées" -ForegroundColor Green
}

# 6. Vérifier Expo CLI
Write-Host "`n🔧 Vérification Expo CLI..." -ForegroundColor Yellow
$expoVersion = npx expo --version 2>$null
if ($expoVersion) {
    Write-Host "✅ Expo $expoVersion" -ForegroundColor Green
} else {
    Write-Host "⚠️  Expo CLI non trouvé, installation..." -ForegroundColor Yellow
    npm install -g expo-cli eas-cli
}

Write-Host "`n✅ Setup terminé ! Lancez l'app avec :" -ForegroundColor Green
Write-Host "   npx expo start" -ForegroundColor Cyan
Write-Host ""

