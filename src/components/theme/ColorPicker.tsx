import { Slider } from "@/components/ui/slider";
import { hslToHex, hexToHsl } from "@/lib/colorUtils";
import { useTranslation } from "@/i18n";

interface ColorPickerProps {
  label: string;
  hue: number;
  saturation: number;
  onHueChange: (hue: number) => void;
  onSaturationChange: (saturation: number) => void;
}

export function ColorPicker({
  label,
  hue,
  saturation,
  onHueChange,
  onSaturationChange,
}: ColorPickerProps) {
  const { t } = useTranslation();

  // Preview color at 50% lightness
  const previewHex = hslToHex(hue, saturation, 50);

  const handleColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    const hsl = hexToHsl(hex);
    onHueChange(hsl.h);
    onSaturationChange(hsl.s);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-md border border-border shadow-sm"
            style={{ backgroundColor: previewHex }}
          />
          <input
            type="color"
            value={previewHex}
            onChange={handleColorInput}
            className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
          />
        </div>
      </div>

      {/* Hue Slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{t("theme.hue")}</span>
          <span>{Math.round(hue)}°</span>
        </div>
        <div className="relative">
          <div
            className="absolute inset-0 h-2 rounded-full pointer-events-none"
            style={{
              background:
                "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
            }}
          />
          <Slider
            value={[hue]}
            onValueChange={([value]) => onHueChange(value)}
            min={0}
            max={360}
            step={1}
            className="[&_[data-radix-slider-track]]:bg-transparent [&_[data-radix-slider-range]]:bg-transparent"
          />
        </div>
      </div>

      {/* Saturation Slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{t("theme.saturation")}</span>
          <span>{Math.round(saturation)}%</span>
        </div>
        <div className="relative">
          <div
            className="absolute inset-0 h-2 rounded-full pointer-events-none"
            style={{
              background: `linear-gradient(to right, hsl(${hue}, 0%, 50%), hsl(${hue}, 100%, 50%))`,
            }}
          />
          <Slider
            value={[saturation]}
            onValueChange={([value]) => onSaturationChange(value)}
            min={0}
            max={100}
            step={1}
            className="[&_[data-radix-slider-track]]:bg-transparent [&_[data-radix-slider-range]]:bg-transparent"
          />
        </div>
      </div>
    </div>
  );
}
