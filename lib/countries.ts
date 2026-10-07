export interface Country {
  iso: string;
  name: string;
  code: string;
}

export const COUNTRIES: Country[] = [
  { iso: "ve", name: "Venezuela",      code: "+58"   },
  { iso: "mx", name: "México",         code: "+52"   },
  { iso: "us", name: "EE.UU.",         code: "+1"    },
  { iso: "co", name: "Colombia",       code: "+57"   },
  { iso: "ar", name: "Argentina",      code: "+54"   },
  { iso: "cl", name: "Chile",          code: "+56"   },
  { iso: "pe", name: "Perú",           code: "+51"   },
  { iso: "ec", name: "Ecuador",        code: "+593"  },
  { iso: "bo", name: "Bolivia",        code: "+591"  },
  { iso: "py", name: "Paraguay",       code: "+595"  },
  { iso: "uy", name: "Uruguay",        code: "+598"  },
  { iso: "pa", name: "Panamá",         code: "+507"  },
  { iso: "cr", name: "Costa Rica",     code: "+506"  },
  { iso: "do", name: "R. Dominicana",  code: "+1809" },
  { iso: "cu", name: "Cuba",           code: "+53"   },
  { iso: "gt", name: "Guatemala",      code: "+502"  },
  { iso: "hn", name: "Honduras",       code: "+504"  },
  { iso: "sv", name: "El Salvador",    code: "+503"  },
  { iso: "ni", name: "Nicaragua",      code: "+505"  },
  { iso: "br", name: "Brasil",         code: "+55"   },
  { iso: "es", name: "España",         code: "+34"   },
  { iso: "gb", name: "Reino Unido",    code: "+44"   },
  { iso: "de", name: "Alemania",       code: "+49"   },
  { iso: "fr", name: "Francia",        code: "+33"   },
  { iso: "it", name: "Italia",         code: "+39"   },
  { iso: "pt", name: "Portugal",       code: "+351"  },
  { iso: "ca", name: "Canadá",         code: "+1"    },
];

export function flagUrl(iso: string): string {
  return `https://flagcdn.com/w20/${iso}.png`;
}

export function filterCountries(query: string): Country[] {
  if (!query) return COUNTRIES;
  const q = query.toLowerCase();
  return COUNTRIES.filter(
    (c) => c.name.toLowerCase().includes(q) || c.code.includes(q)
  );
}
