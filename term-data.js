export const TERM_OFFERINGS = Object.freeze({
  "115-1": Object.freeze({
    DRAWING: { teacher: "賴悅仁", location: "水利系館 2 樓電腦教室", slots: [{ day: 5, start: 5, end: 8 }], certainty: "confirmed" },
    "PHYS-1": { teacher: "管培辰", location: "理學教學大樓 36173", slots: [{ day: 1, start: 8, end: 8 }, { day: 4, start: 5, end: 6 }], certainty: "confirmed" },
    "PHYS-LAB-1": { teacher: "游輝樟", location: "理化大樓普物實驗室", slots: [{ day: 3, start: 1, end: 3 }], certainty: "confirmed" },
    GEOLOGY: { teacher: "郭玉樹", location: "水利系館 4622", slots: [{ day: 1, start: 7, end: 8 }], certainty: "confirmed" },
    "FLUID-1": { teacher: "戴義欽", location: "水利系館 4622", slots: [{ day: 2, start: 2, end: 2 }, { day: 5, start: 3, end: 4 }], certainty: "confirmed" },
    "FLUID-LAB": { teacher: "賴悅仁", location: "水利系館 4624", slots: [{ day: 1, start: 5, end: 7 }, { day: 3, start: 5, end: 7 }], certainty: "confirmed", note: "原始課表有分組，實際選課時需確認組別。" },
    "WATER-1": { teacher: "陳憲宗", location: "水利系館 4622", slots: [{ day: 2, start: 8, end: 8 }, { day: 3, start: 3, end: 4 }], certainty: "confirmed" },
    MATERIAL: { teacher: "羅偉誠", location: "水利系館 4622", slots: [{ day: 4, start: 5, end: 6 }], certainty: "confirmed" },
    "OPEN-CHANNEL": { teacher: "詹錢登", location: "水利系館 4625", slots: [{ day: 4, start: 2, end: 4 }], certainty: "confirmed" },
    WAVE: { teacher: "吳昀達", location: "水利系館 4625", slots: [{ day: 2, start: 6, end: 6 }, { day: 3, start: 3, end: 4 }], certainty: "confirmed" },
    "RESEARCH-2": { teacher: "羅偉誠", location: "水利系館 4627", slots: [], certainty: "confirmed" },
    "DESIGN-FLOOD": { teacher: "張駿暉", location: "水利系館 4627", slots: [{ day: 5, start: 6, end: 8 }], certainty: "confirmed" },
    "DESIGN-OCEAN": { teacher: "楊瑞源", location: "水利系館 4627", slots: [{ day: 1, start: 6, end: 8 }], certainty: "confirmed" },
    "HOE-INTRO": { teacher: "孫建平", location: "水利系館 4620", slots: [{ day: 1, start: 7, end: 7 }], certainty: "confirmed" },
  }),
  "115-2": Object.freeze({
    "CALC-2": { certainty: "estimated" },
    "PHYS-2": { certainty: "estimated" },
    "PHYS-LAB-2": { certainty: "estimated" },
    HYDROLOGY: { certainty: "estimated" },
    "ENG-MECH": { certainty: "estimated" },
    "STRUCT-1": { certainty: "estimated" },
    "ENG-MATH-2": { certainty: "estimated" },
    "FLUID-2": { certainty: "estimated" },
    SURVEY: { certainty: "estimated" },
    "SURVEY-LAB": { certainty: "estimated" },
    "COASTAL-1": { certainty: "estimated" },
    STAT: { certainty: "estimated" },
    SOIL: { certainty: "estimated" },
    "SOIL-LAB": { certainty: "estimated" },
    RC: { certainty: "estimated" },
    "RESEARCH-1": { certainty: "estimated" },
    "DESIGN-WATER": { certainty: "estimated" },
    "DESIGN-COAST": { certainty: "estimated" },
  }),
});

export const TERM_DATA_META = Object.freeze({
  currentTerm: "115-1",
  nextTerm: "115-2",
  currentTermSource: "curated from the repository's prior 115-1 course schedule snapshot",
  nextTermSource: "planning estimate only; verify against the official NCKU course query before registration",
});

export function getOffering(courseCode, term) {
  return TERM_OFFERINGS[term]?.[courseCode] || null;
}

export function getDefaultOffering(courseCode, currentTerm = "115-1", nextTerm = "115-2") {
  if (TERM_OFFERINGS[currentTerm]?.[courseCode]) return { term: currentTerm, ...TERM_OFFERINGS[currentTerm][courseCode] };
  if (TERM_OFFERINGS[nextTerm]?.[courseCode]) return { term: nextTerm, ...TERM_OFFERINGS[nextTerm][courseCode] };
  return null;
}
