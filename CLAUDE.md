# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kaizen Launcher is a modern Minecraft launcher built with Tauri 2, React 19, and TypeScript. It supports multiple modloaders (Fabric, Forge, NeoForge, Quilt) and server types (Paper, Velocity, BungeeCord, Waterfall).

## Development Commands

```bash
# Start development server (runs both Vite and Tauri)
npm start              # or: npm run tauri dev

# Restart (kills existing processes then starts)
npm run restart

# Stop all dev processes
npm run stop

# Build for production
npm run tauri build

# Frontend only (Vite dev server)
npm run dev

# Type check TypeScript
npm run type-check

# Run Vite + Rust type checking in parallel (requires cargo-watch)
npm run dev:all

# Linting
npm run lint           # Check for issues
npm run lint:fix       # Auto-fix issues

# Testing
npm run test           # Run tests once
npm run test:watch     # Watch mode
```

## Architecture

### Backend (Rust/Tauri) - `src-tauri/`

The Rust backend is organized into modules in `src-tauri/src/`:

- **`lib.rs`** - Entry point, registers all Tauri commands via `invoke_handler`
- **`state.rs`** - Application state with SQLite database (via sqlx), HTTP client, and data directory. Contains inline migrations for schema management
- **`error.rs`** - Centralized error types using `thiserror`. All commands return `AppResult<T>`

**Core modules:**
- **`auth/`** - Microsoft OAuth flow: `microsoft.rs` -> `xbox.rs` -> `minecraft.rs` chain for authentication
- **`instance/`** - Instance management (create, delete, settings, mods). Each instance has its own `game_dir`
- **`launcher/`** - Java detection (`java.rs`) and game launching (`runner.rs`)
- **`minecraft/`** - Version manifest fetching (`versions.rs`) and client installation (`installer.rs`)
- **`modloader/`** - Individual loaders: `fabric.rs`, `forge.rs`, `neoforge.rs`, `quilt.rs`, `paper.rs`. Each implements version fetching from their respective APIs
- **`modrinth/`** - Modrinth API integration for mod browsing and installation
- **`download/`** - Download queue management with progress tracking
- **`tunnel/`** - Server tunneling integrations (Cloudflare, Playit, Ngrok, Bore) for exposing local servers
- **`db/`** - Database operations split by entity: `accounts.rs`, `instances.rs`, `settings.rs`
- **`crypto.rs`** - AES-256-GCM encryption for storing tokens securely at rest

**Command pattern:** Each module has a `commands.rs` with Tauri commands that are registered in `lib.rs`.

### Frontend (React/TypeScript) - `src/`

- **`App.tsx`** - React Router setup with routes: `/`, `/instances`, `/instances/:instanceId`, `/browse`, `/downloads`, `/accounts`, `/settings`
- **`pages/`** - Page components matching routes
- **`components/ui/`** - Radix UI-based components (shadcn/ui pattern)
- **`components/layout/`** - App layout: `MainLayout.tsx` (outlet wrapper), `Sidebar.tsx`, `TitleBar.tsx` (custom window controls since `decorations: false`)
- **`stores/`** - Zustand stores with persist middleware (`onboardingStore.ts`, `customThemeStore.ts`)
- **`hooks/`** - Custom hooks (e.g., `useTheme.ts`)
- **`i18n/`** - Internationalization with type-safe translation keys (French, English)
- **`lib/`** - Utilities and theme definitions

### Database Schema

SQLite database at `{data_dir}/kaizen.db` with tables:
- `accounts` - Microsoft/offline accounts with encrypted tokens
- `instances` - Game instances with loader config and JVM settings
- `instance_mods` - Mods per instance with enable/disable state
- `settings` - Key-value app settings
- `tunnel_configs` - Server tunnel configurations per instance

### Data Storage

App data stored at platform-specific location (via `directories` crate):
- macOS: `~/Library/Application Support/com.kaizen.launcher/`
- Contains: database, Java installations, game instances, version manifests

## Key Patterns

### Tauri Command Structure
```rust
#[tauri::command]
pub async fn command_name(
    state: tauri::State<'_, SharedState>,
    // other params
) -> AppResult<ReturnType> {
    let state = state.read().await;
    // use state.db, state.http_client, state.data_dir
}
```

### Frontend-Backend Communication
Frontend uses `@tauri-apps/api` invoke pattern:
```typescript
import { invoke } from "@tauri-apps/api/core";
const result = await invoke<Type>("command_name", { param: value });
```

### Modloader Support
`LoaderType` enum distinguishes client loaders (Fabric, Forge, NeoForge, Quilt) from servers (Paper) and proxies (Velocity, BungeeCord, Waterfall). Each has dedicated module for API interaction.
