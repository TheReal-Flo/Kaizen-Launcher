import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  CustomThemeColors,
  DEFAULT_COLORS,
  THEME_PRESETS,
} from "@/lib/customTheme";

interface CustomThemeState {
  colors: CustomThemeColors;
  activePresetId: string | null;
  setColors: (colors: Partial<CustomThemeColors>) => void;
  setPreset: (presetId: string) => void;
  resetToDefault: () => void;
}

export const useCustomThemeStore = create<CustomThemeState>()(
  persist(
    (set) => ({
      colors: DEFAULT_COLORS,
      activePresetId: "default",

      setColors: (newColors) =>
        set((state) => ({
          colors: { ...state.colors, ...newColors },
          activePresetId: null, // Passe en mode custom
        })),

      setPreset: (presetId) => {
        const preset = THEME_PRESETS.find((p) => p.id === presetId);
        if (preset) {
          set({ colors: { ...preset.colors }, activePresetId: presetId });
        }
      },

      resetToDefault: () =>
        set({
          colors: { ...DEFAULT_COLORS },
          activePresetId: "default",
        }),
    }),
    {
      name: "kaizen-custom-theme",
    }
  )
);
