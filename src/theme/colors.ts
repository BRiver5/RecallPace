// Палитра приложения. Это единственный файл, где должны жить цветовые значения —
// компоненты и экраны берут цвета только отсюда, магические hex-коды в JSX запрещены.
//
// Акцент #358239 — глубокий лесной зелёный (hue ~123°, S ~42%, L ~36%). По
// DESIGN_REGISTRY.md это середина самого широкого свободного промежутка:
// соседи PantryMatch (96°, оливковый) и PackSmart (150°, яркий мятный) — по
// 27° в обе стороны, и оба заметно другого характера (оливково-жёлтый и
// кислотно-мятный против спокойного лесного). onAccent — белый: контраст
// посчитан, 4.77:1, проходит WCAG AA для обычного текста.
//
// Фон — ХОЛОДНАЯ бумага #EEF1EF, намеренно против тёплых кремов трёх прошлых
// приложений (BrewDial #EFE8DC, EnvelopeFlow #F7F6EC, BreathEasy #F8F4EC):
// рядом они выглядели бы одним продуктом. Чернила — тёмный графит с зеленцой.
export const light = {
  background: "#EEF1EF",
  backgroundAlt: "#E5EAE6",
  surface: "#FBFCFB",
  surfaceAlt: "#E3E8E4",
  border: "#D3DAD5",
  ink: "#17251C",
  inkMuted: "#5C6960",
  inkFaint: "#93A098",
  onAccent: "#FFFFFF",
  accent: "#358239",
  danger: "#C0392B",
  warning: "#B8761C",
  success: "#2F7D4F",
};

// Тёмные значения существуют только ради типа Palette — переключателя тем в
// этом приложении нет (осознанно, см. PLAN.md).
export const dark = {
  background: "#101713",
  backgroundAlt: "#161E19",
  surface: "#1C2620",
  surfaceAlt: "#243029",
  border: "#2F3C35",
  ink: "#E8EFEA",
  inkMuted: "#A3B1A8",
  inkFaint: "#6B7A72",
  onAccent: "#FFFFFF",
  accent: "#5AA85E",
  danger: "#E06A5C",
  warning: "#D79A45",
  success: "#5BA87A",
};

export type Palette = typeof light;
