// Multi-tone subject color system — the palette shifts by subject context.
export const SUBJECT_TONES = {
  matematik: { hex: "#4F46E5", soft: "#EEF0FE", ring: "#C7CCFB", name: "Matematik" },
  turkce: { hex: "#F43F5E", soft: "#FEECEF", ring: "#FBC5CF", name: "Türkçe" },
  fen: { hex: "#10B981", soft: "#E6F8F1", ring: "#B4EBD7", name: "Fen" },
  sosyal: { hex: "#F59E0B", soft: "#FEF4E2", ring: "#FBDFA6", name: "Sosyal" },
  ai: { hex: "#EC4899", soft: "#FDECF5", ring: "#F9C2DF", name: "AI Koç" },
  general: { hex: "#0F172A", soft: "#EEF0F3", ring: "#CBD2DC", name: "Genel" },
};

export function tone(slug) {
  return SUBJECT_TONES[slug] || SUBJECT_TONES.general;
}

export function statusColor(status) {
  if (status === "İyi") return "#10B981";
  if (status === "Geliştirilmeli") return "#F59E0B";
  return "#F43F5E";
}
