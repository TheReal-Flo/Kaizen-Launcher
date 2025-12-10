# Self-Hosted Runners Setup Guide

Ce guide explique comment configurer vos machines comme self-hosted runners pour GitHub Actions.

## Vos Machines

| Machine | OS | Label Runner | Usage |
|---------|-----|--------------|-------|
| Mac M4 Pro 48GB | macOS | `macos-arm64` | macOS ARM + x86 builds |
| Intel i9 14900K | Windows/Linux | `windows-x64` ou `linux-x64` | Windows builds |
| Ryzen 9 7950X 64GB | Linux | `linux-x64` | Linux builds |

## Configuration Rapide

### 1. Aller sur GitHub

1. Ouvrez: https://github.com/KaizenCore/Kaizen-Launcher/settings/actions/runners
2. Cliquez sur **"New self-hosted runner"**
3. Sélectionnez votre OS

### 2. Mac M4 Pro (macOS)

```bash
# Créer un dossier pour le runner
mkdir ~/actions-runner && cd ~/actions-runner

# Télécharger le runner (vérifiez la dernière version sur GitHub)
curl -o actions-runner-osx-arm64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-osx-arm64-2.311.0.tar.gz

# Extraire
tar xzf ./actions-runner-osx-arm64-2.311.0.tar.gz

# Configurer (utilisez le token de GitHub)
./config.sh --url https://github.com/KaizenCore/Kaizen-Launcher --token YOUR_TOKEN --labels macos-arm64

# Installer comme service (optionnel mais recommandé)
sudo ./svc.sh install
sudo ./svc.sh start
```

**Prérequis macOS:**
```bash
# Installer Xcode Command Line Tools
xcode-select --install

# Installer Homebrew si pas déjà fait
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Installer les dépendances
brew install node@20
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add x86_64-apple-darwin  # Pour cross-compile Intel
```

### 3. Linux (Ryzen 9)

```bash
# Créer un dossier pour le runner
mkdir ~/actions-runner && cd ~/actions-runner

# Télécharger le runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz

# Extraire
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Configurer
./config.sh --url https://github.com/KaizenCore/Kaizen-Launcher --token YOUR_TOKEN --labels linux-x64

# Installer comme service
sudo ./svc.sh install
sudo ./svc.sh start
```

**Prérequis Linux (Ubuntu/Debian):**
```bash
# Installer les dépendances système
sudo apt-get update
sudo apt-get install -y build-essential curl wget git \
    libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf \
    libssl-dev pkg-config

# Installer Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installer Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### 4. Windows (Intel i9)

```powershell
# Créer un dossier
mkdir C:\actions-runner ; cd C:\actions-runner

# Télécharger
Invoke-WebRequest -Uri https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-win-x64-2.311.0.zip -OutFile actions-runner-win-x64.zip

# Extraire
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory("$PWD\actions-runner-win-x64.zip", "$PWD")

# Configurer
.\config.cmd --url https://github.com/KaizenCore/Kaizen-Launcher --token YOUR_TOKEN --labels windows-x64

# Installer comme service
.\svc.cmd install
.\svc.cmd start
```

**Prérequis Windows:**
- Visual Studio 2022 avec C++ build tools
- Node.js 20 (https://nodejs.org)
- Rust (https://rustup.rs)

## Utilisation

### Via GitHub Actions

Dans l'onglet Actions de votre repo:
1. Sélectionnez le workflow "Release"
2. Cliquez sur "Run workflow"
3. Choisissez `use_self_hosted: true`
4. Lancez le build

### Build Local (Plus Rapide)

Sur votre Mac M4 Pro:
```bash
# Build macOS ARM natif
./scripts/build-local.sh macos-arm

# Build macOS ARM + Intel (universal)
./scripts/build-local.sh macos

# Build tous les targets possibles sur cette machine
./scripts/build-local.sh all
```

## Comparaison des Temps de Build

| Plateforme | GitHub Hosted | Self-Hosted (vos machines) |
|------------|---------------|---------------------------|
| Linux | ~8-10 min | ~2-3 min (Ryzen 9) |
| macOS ARM | ~10-12 min | ~2-3 min (M4 Pro) |
| macOS x86 | ~10-12 min | ~3-4 min (M4 Pro cross) |
| Windows | ~12-15 min | ~4-5 min (i9) |
| **Total** | ~45 min | ~12-15 min |

## Sécurité

- Les runners self-hosted ont accès à vos secrets GitHub
- Ne les utilisez que sur des machines de confiance
- Les runners s'exécutent avec les permissions de l'utilisateur qui les a installés
- Utilisez un utilisateur dédié sans droits admin si possible

## Dépannage

### Le runner ne démarre pas
```bash
# Vérifier les logs
cd ~/actions-runner
cat _diag/Runner_*.log
```

### Problème de permissions (macOS)
```bash
# Donner les permissions full disk access à Terminal/iTerm
# Préférences Système > Sécurité > Confidentialité > Accès complet au disque
```

### Cache Rust
Pour accélérer encore plus les builds, gardez le cache Rust:
```bash
# Le cache est dans ~/.cargo et target/
# Ces dossiers sont réutilisés entre les builds
```
