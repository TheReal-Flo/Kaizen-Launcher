import { Check } from "lucide-react";
import { THEME_PRESETS, ThemePreset } from "@/lib/customTheme";
import { hslToHex } from "@/lib/colorUtils";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";

interface ThemePresetsProps {
  activePresetId: string | null;
  onSelectPreset: (presetId: string) => void;
}

const PRESET_NAMES: Record<string, "theme.presetDefault" | "theme.presetOcean" | "theme.presetForest" | "theme.presetSunset" | "theme.presetPurple" | "theme.presetMonochrome"> = {
  default: "theme.presetDefault",
  ocean: "theme.presetOcean",
  forest: "theme.presetForest",
  sunset: "theme.presetSunset",
  purple: "theme.presetPurple",
  monochrome: "theme.presetMonochrome",
};

function PresetCard({
  preset,
  isActive,
  onClick,
}: {
  preset: ThemePreset;
  isActive: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const primaryColor = hslToHex(
    preset.colors.primaryHue,
    preset.colors.primarySaturation,
    50
  );
  const secondaryColor = hslToHex(
    preset.colors.secondaryHue,
    preset.colors.secondarySaturation,
    60
  );

  const nameKey = PRESET_NAMES[preset.id];

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
        "hover:border-primary/50 hover:bg-accent/50",
        isActive
          ? "border-primary bg-primary/10"
          : "border-border bg-card"
      )}
    >
      {isActive && (
        <div className="absolute top-1 right-1">
          <Check className="w-4 h-4 text-primary" />
        </div>
      )}
      <div className="flex gap-1">
        <div
          className="w-6 h-6 rounded-full border border-border/50 shadow-sm"
          style={{ backgroundColor: primaryColor }}
        />
        <div
          className="w-6 h-6 rounded-full border border-border/50 shadow-sm"
          style={{ backgroundColor: secondaryColor }}
        />
      </div>
      <span className="text-xs font-medium">
        {nameKey ? t(nameKey) : preset.name}
      </span>
    </button>
  );
}

export function ThemePresets({
  activePresetId,
  onSelectPreset,
}: ThemePresetsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">{t("theme.presets")}</label>
      <div className="grid grid-cols-3 gap-2">
        {THEME_PRESETS.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            isActive={activePresetId === preset.id}
            onClick={() => onSelectPreset(preset.id)}
          />
        ))}
      </div>
    </div>
  );
}
