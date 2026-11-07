// Supported languages. Spanish is the source; the rest are translated automatically.
// Each language carries the time zone of the region it represents (used by the clock).

export const IDIOMAS = [
  { id: "es",    nombre: "Español",               bandera: "🇻🇪", zona: "America/Caracas",   ciudad: "Caracas" },
  { id: "en-US", nombre: "English (US)",          bandera: "🇺🇸", zona: "America/New_York",  ciudad: "New York" },
  { id: "en-GB", nombre: "English (UK)",          bandera: "🇬🇧", zona: "Europe/London",     ciudad: "London" },
  { id: "pt-BR", nombre: "Português (Brasil)",    bandera: "🇧🇷", zona: "America/Sao_Paulo", ciudad: "São Paulo" },
  { id: "pt-PT", nombre: "Português (Portugal)",  bandera: "🇵🇹", zona: "Europe/Lisbon",     ciudad: "Lisboa" },
  { id: "it",    nombre: "Italiano",              bandera: "🇮🇹", zona: "Europe/Rome",       ciudad: "Roma" },
] as const;

export type IdiomaId = (typeof IDIOMAS)[number]["id"];
export const IDIOMA_BASE: IdiomaId = "es";
export const esIdioma = (v: unknown): v is IdiomaId => IDIOMAS.some((i) => i.id === v);
export const idiomaInfo = (id: IdiomaId) => IDIOMAS.find((i) => i.id === id)!;

/** Instructions for the translator model, so each regional variant reads natural. */
export const VARIANTE: Record<Exclude<IdiomaId, "es">, string> = {
  "en-US": "American English (US spelling and vocabulary: color, organize, cell phone, check).",
  "en-GB": "British English (UK spelling and vocabulary: colour, organise, mobile phone, cheque).",
  "pt-BR": "Brazilian Portuguese (você, celular, aplicativo, cadastro, equipe).",
  "pt-PT": "European Portuguese from Portugal (telemóvel, aplicação, registo, equipa; formal 'o senhor/você' tone, never Brazilian forms).",
  "it": "Italian (standard, professional tone).",
};
