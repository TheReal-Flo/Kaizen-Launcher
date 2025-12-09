import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ColorPicker } from "./ColorPicker";
import { ThemePresets } from "./ThemePresets";
import { useCustomThemeStore } from "@/stores/customThemeStore";
import { useTranslation } from "@/i18n";

export function ThemeCustomizer() {
  const { t } = useTranslation();
  const { colors, activePresetId, setColors, setPreset, resetToDefault } =
    useCustomThemeStore();

  return (
    <div className="space-y-6">
      {/* Presets */}
      <ThemePresets
        activePresetId={activePresetId}
        onSelectPreset={setPreset}
      />

      <div className="flex items-center gap-4">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">
          {t("theme.orCustomize")}
        </span>
        <Separator className="flex-1" />
      </div>

      {/* Primary Color */}
      <ColorPicker
        label={t("theme.primaryColor")}
        hue={colors.primaryHue}
        saturation={colors.primarySaturation}
        onHueChange={(hue) => setColors({ primaryHue: hue })}
        onSaturationChange={(sat) => setColors({ primarySaturation: sat })}
      />

      {/* Secondary Color */}
      <ColorPicker
        label={t("theme.secondaryColor")}
        hue={colors.secondaryHue}
        saturation={colors.secondarySaturation}
        onHueChange={(hue) => setColors({ secondaryHue: hue })}
        onSaturationChange={(sat) => setColors({ secondarySaturation: sat })}
      />

      {/* Reset Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={resetToDefault}
        className="w-full"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        {t("theme.reset")}
      </Button>
    </div>
  );
}
