import { useState, useEffect, useCallback } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { invoke } from "@tauri-apps/api/core";

export interface UpdateInfo {
  version: string;
  date?: string;
  body?: string;
}

export interface UseUpdateCheckerReturn {
  checking: boolean;
  updateAvailable: boolean;
  updateInfo: UpdateInfo | null;
  downloadProgress: number;
  installing: boolean;
  error: string | null;
  checkForUpdates: () => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  dismissUpdate: () => void;
}

export function useUpdateChecker(autoCheck = true): UseUpdateCheckerReturn {
  const [checking, setChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [update, setUpdate] = useState<Update | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const checkForUpdates = useCallback(async () => {
    setChecking(true);
    setError(null);
    setDismissed(false);

    try {
      const result = await check();

      if (result) {
        setUpdate(result);
        setUpdateAvailable(true);
        setUpdateInfo({
          version: result.version,
          date: result.date,
          body: result.body,
        });
      } else {
        setUpdateAvailable(false);
        setUpdateInfo(null);
      }
    } catch (err) {
      console.error("Failed to check for updates:", err);
      setError(err instanceof Error ? err.message : "Failed to check for updates");
    } finally {
      setChecking(false);
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    if (!update) return;

    setInstalling(true);
    setDownloadProgress(0);
    setError(null);

    try {
      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength ?? 0;
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setDownloadProgress(Math.round((downloaded / contentLength) * 100));
            }
            break;
          case "Finished":
            setDownloadProgress(100);
            break;
        }
      });

      // Relaunch the app after install
      await relaunch();
    } catch (err) {
      console.error("Failed to install update:", err);
      setError(err instanceof Error ? err.message : "Failed to install update");
      setInstalling(false);
    }
  }, [update]);

  const dismissUpdate = useCallback(() => {
    setDismissed(true);
    setUpdateAvailable(false);
  }, []);

  // Auto-check on mount if enabled
  useEffect(() => {
    if (autoCheck) {
      // Check if auto-updates are enabled in settings
      const checkSetting = async () => {
        try {
          const settings = await invoke<[string, string][]>("get_all_settings");
          const checkUpdates = settings.find(([key]) => key === "check_updates");
          if (checkUpdates && checkUpdates[1] === "true") {
            checkForUpdates();
          }
        } catch {
          // If we can't get settings, check anyway
          checkForUpdates();
        }
      };
      checkSetting();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCheck]);

  return {
    checking,
    updateAvailable: updateAvailable && !dismissed,
    updateInfo,
    downloadProgress,
    installing,
    error,
    checkForUpdates,
    downloadAndInstall,
    dismissUpdate,
  };
}

// Command to get all settings (if not already defined)
declare module "@tauri-apps/api/core" {
  function invoke(cmd: "get_all_settings"): Promise<[string, string][]>;
}
