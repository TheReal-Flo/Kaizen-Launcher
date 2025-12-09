/**
 * Utilitaires pour la gestion des couleurs HSL
 */

/**
 * Calcule la luminosité perçue d'une couleur HSL (0-1)
 * Utilise la formule de luminosité relative
 */
export function getPerceivedLightness(hue: number, saturation: number, lightness: number): number {
  // Convertir HSL en RGB
  const s = saturation / 100;
  const l = lightness / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  const r = f(0);
  const g = f(8);
  const b = f(4);

  // Calcul de la luminosité relative (WCAG)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance;
}

/**
 * Détermine si le texte doit être clair ou sombre sur une couleur donnée
 */
export function shouldUseDarkText(hue: number, saturation: number, lightness: number): boolean {
  const luminance = getPerceivedLightness(hue, saturation, lightness);
  // Seuil de 0.5 pour décider si le texte doit être sombre
  return luminance > 0.5;
}

/**
 * Génère les variantes de couleur primaire pour light/dark mode
 */
export function generatePrimaryVariants(
  hue: number,
  saturation: number,
  mode: "light" | "dark"
) {
  if (mode === "light") {
    const baseLightness = 53;
    const useDarkText = shouldUseDarkText(hue, saturation, baseLightness);
    return {
      base: `${hue} ${saturation}% ${baseLightness}%`,
      foreground: useDarkText
        ? `${hue} ${Math.min(saturation, 30)}% 10%`  // Texte sombre
        : `${hue} ${Math.max(saturation - 40, 10)}% 98%`, // Texte clair
    };
  } else {
    const baseLightness = 60;
    const useDarkText = shouldUseDarkText(hue, saturation, baseLightness);
    return {
      base: `${hue} ${Math.min(saturation + 8, 100)}% ${baseLightness}%`,
      foreground: useDarkText
        ? `${hue} ${Math.min(saturation, 30)}% 10%`  // Texte sombre
        : `${hue} ${Math.max(saturation - 35, 10)}% 98%`, // Texte clair
    };
  }
}

/**
 * Génère les variantes de couleur secondaire pour light/dark mode
 */
export function generateSecondaryVariants(
  hue: number,
  saturation: number,
  mode: "light" | "dark"
) {
  if (mode === "light") {
    return {
      base: `${hue} ${Math.max(saturation, 30)}% 96%`,
      foreground: `${hue} ${Math.min(saturation + 7, 60)}% 11%`,
    };
  } else {
    return {
      base: `${hue} ${Math.max(saturation - 8, 20)}% 17%`,
      foreground: `${hue} ${Math.max(saturation, 30)}% 98%`,
    };
  }
}

/**
 * Génère les couleurs de fond basées sur la teinte secondaire
 */
export function generateBackgroundVariants(
  hue: number,
  saturation: number,
  mode: "light" | "dark"
) {
  // Saturation très réduite pour le fond
  const bgSat = Math.min(saturation * 0.5, 20);

  if (mode === "light") {
    return {
      background: `${hue} ${bgSat}% 100%`,
      foreground: `${hue} ${Math.min(saturation, 50)}% 5%`,
      card: `${hue} ${bgSat}% 100%`,
      cardForeground: `${hue} ${Math.min(saturation, 50)}% 5%`,
      popover: `${hue} ${bgSat}% 100%`,
      popoverForeground: `${hue} ${Math.min(saturation, 50)}% 5%`,
      border: `${hue} ${Math.min(saturation, 30)}% 91%`,
      input: `${hue} ${Math.min(saturation, 30)}% 91%`,
      mutedForeground: `${hue} ${Math.min(saturation, 20)}% 47%`,
    };
  } else {
    return {
      background: `${hue} ${bgSat}% 5%`,
      foreground: `${hue} ${Math.min(saturation, 40)}% 98%`,
      card: `${hue} ${bgSat}% 5%`,
      cardForeground: `${hue} ${Math.min(saturation, 40)}% 98%`,
      popover: `${hue} ${bgSat}% 5%`,
      popoverForeground: `${hue} ${Math.min(saturation, 40)}% 98%`,
      border: `${hue} ${Math.min(saturation - 8, 30)}% 17%`,
      input: `${hue} ${Math.min(saturation - 8, 30)}% 17%`,
      mutedForeground: `${hue} ${Math.min(saturation, 20)}% 65%`,
    };
  }
}

/**
 * Applique les couleurs personnalisées au document
 */
export function applyCustomColors(
  colors: {
    primaryHue: number;
    primarySaturation: number;
    secondaryHue: number;
    secondarySaturation: number;
  },
  mode: "light" | "dark"
) {
  const root = document.documentElement;

  const primary = generatePrimaryVariants(
    colors.primaryHue,
    colors.primarySaturation,
    mode
  );
  const secondary = generateSecondaryVariants(
    colors.secondaryHue,
    colors.secondarySaturation,
    mode
  );
  const background = generateBackgroundVariants(
    colors.secondaryHue,
    colors.secondarySaturation,
    mode
  );

  // Primary
  root.style.setProperty("--primary", primary.base);
  root.style.setProperty("--primary-foreground", primary.foreground);

  // Secondary
  root.style.setProperty("--secondary", secondary.base);
  root.style.setProperty("--secondary-foreground", secondary.foreground);

  // Accent et muted suivent secondary
  root.style.setProperty("--accent", secondary.base);
  root.style.setProperty("--accent-foreground", secondary.foreground);
  root.style.setProperty("--muted", secondary.base);
  root.style.setProperty("--muted-foreground", background.mutedForeground);

  // Background, card, popover
  root.style.setProperty("--background", background.background);
  root.style.setProperty("--foreground", background.foreground);
  root.style.setProperty("--card", background.card);
  root.style.setProperty("--card-foreground", background.cardForeground);
  root.style.setProperty("--popover", background.popover);
  root.style.setProperty("--popover-foreground", background.popoverForeground);

  // Border et input
  root.style.setProperty("--border", background.border);
  root.style.setProperty("--input", background.input);

  // Ring suit primary
  root.style.setProperty("--ring", primary.base);
}

/**
 * Convertit HSL en Hex
 */
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Convertit Hex en HSL
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  // Retirer le # si présent
  hex = hex.replace(/^#/, "");

  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}
