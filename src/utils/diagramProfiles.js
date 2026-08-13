export const DIAGRAM_OPTIONS = [
  { key: "female_front", label: "Female front", src: "/images/diagrams/female-front.png", gender: "female" },
  { key: "female_left", label: "Female left", src: "/images/diagrams/female-left.png", gender: "female" },
  { key: "female_right", label: "Female right", src: "/images/diagrams/female-right.png", gender: "female" },
  { key: "male_front", label: "Male front", src: "/images/diagrams/male-front.png", gender: "male" },
  { key: "male_left", label: "Male left", src: "/images/diagrams/male-left.png", gender: "male" },
  { key: "male_right", label: "Male right", src: "/images/diagrams/male-right.png", gender: "male" },
];

export const DIAGRAM_OPTION_BY_KEY = Object.fromEntries(
  DIAGRAM_OPTIONS.map((item) => [item.key, item]),
);

export function resolveDefaultDiagramKeyByGender(genderRaw) {
  const gender = String(genderRaw || "").trim().toLowerCase();
  if (gender.includes("female")) return "female_front";
  if (gender.includes("male")) return "male_front";
  return "female_front";
}

