# Changelog

All notable changes to Kaizen Launcher will be documented in this file.

## [0.2.1] - 2025-12-10

### Added
- Full self-hosted runner support (macOS, Linux, Windows)

### Fixed
- Corrected reqwest dependency version (0.12 instead of 0.2.0)
- Fixed self-hosted runner labels for standard GitHub format

## [0.2.0] - 2025-12-10

### Added
- Docker-based cross-platform build system
  - Dockerfile for Linux builds (Ubuntu 22.04, Node 20, Rust)
  - Dockerfile for Windows cross-compilation using cargo-xwin
  - docker-compose.yml with volume caching for faster rebuilds
  - release-docker.sh script for building all platforms locally
- npm scripts for Docker builds: `docker:build`, `docker:linux`, `docker:windows`, `docker:release`
- Self-hosted runner support for faster CI/CD builds
- Local release script with auto-versioning and signing

### Fixed
- npm optional dependencies bug with @tauri-apps/cli (cross-platform clean)
- Window dragging on custom title bar
- Modpack installation notification tracking

### Technical
- Optimized GitHub Actions workflows with better caching
- Added cargo-xwin for MSVC-compatible Windows cross-compilation

## [0.1.18] - 2025-12-10

### Added
- Docker-based cross-platform build system
  - Dockerfile for Linux builds (Ubuntu 22.04, Node 20, Rust)
  - Dockerfile for Windows cross-compilation using cargo-xwin
  - docker-compose.yml with volume caching for faster rebuilds
  - release-docker.sh script for building all platforms locally
- npm scripts for Docker builds: `docker:build`, `docker:linux`, `docker:windows`, `docker:release`
- Support for parallel builds with `--parallel` flag
- GitHub release integration with `--push` flag

### Technical
- Added cargo-xwin for MSVC-compatible Windows cross-compilation from Linux
- Docker volumes cache cargo registry and build targets for incremental builds
- Optimized CI/CD workflows with better caching and concurrency

## [0.1.18] - 2025-12-10

### Added
- Global installation notification system for modpacks
  - Non-blocking floating notification in top-right corner
  - Shows real-time progress for both modpack download (0-50%) and Minecraft installation (50-100%)
  - Click to navigate to instance details
  - Auto-dismisses 3 seconds after completion
- Installation state synchronization across all pages
- Window dragging support via title bar (Tauri 2 capability)

### Changed
- Modpack installation no longer blocks the UI with a modal dialog
- Users can browse and perform other actions while modpacks install
- Improved progress tracking with smooth transitions between installation steps

### Fixed
- Fixed "instance not found" error when clicking on modpack installation notification
- Fixed installation notification not auto-closing after completion
- Fixed progress percentage jumping during modpack installation transitions
- Fixed window not being draggable on custom title bar

### Technical
- Added `installationStore` (Zustand) for global installation state management
- Added `InstallationNotification` component for persistent progress display
- Added `migrateInstallation` method to handle tracking ID changes
- Backend now emits `instance_id` in progress events for proper tracking
- Added `core:window:allow-start-dragging` capability for Tauri 2
