/** Couleurs de matière, inspirées des surligneurs. */
export const COURSE_COLORS = [
  { name: "Jaune", value: "#E3A800" },
  { name: "Orange", value: "#F07A1A" },
  { name: "Rouge", value: "#D9423A" },
  { name: "Rose", value: "#E0508A" },
  { name: "Violet", value: "#8B5CF6" },
  { name: "Bleu", value: "#2F8FE8" },
  { name: "Turquoise", value: "#12A3A3" },
  { name: "Vert", value: "#2BA86C" },
  { name: "Olive", value: "#7F9A1E" },
  { name: "Ardoise", value: "#5C6B85" },
] as const;

export const NEUTRAL_COLOR = "#8A93A6";

/** Teinte légère utilisable en fond, en clair comme en sombre. */
export function tint(color: string | null | undefined, amount = 14) {
  return `color-mix(in oklab, ${color ?? NEUTRAL_COLOR} ${amount}%, var(--surface))`;
}

export function pickColor(index: number) {
  return COURSE_COLORS[index % COURSE_COLORS.length].value;
}
