import { useState, useCallback } from "react";

export interface PersonalData {
  nombre: string;
  apellido: string;
  cedula: string;
  dirHab: string;
  dirEmp: string;
  telHab: string;
  telEmp: string;
  telMov: string;
  empresa: string;
  cargo: string;
  profesion: string;
  correo: string;
}

const EMPTY: PersonalData = {
  nombre: "", apellido: "", cedula: "",
  dirHab: "", dirEmp: "",
  telHab: "", telEmp: "", telMov: "",
  empresa: "", cargo: "", profesion: "", correo: "",
};

function load(): PersonalData {
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem("ts_personal_data") ?? "{}") };
  } catch {
    return { ...EMPTY };
  }
}

export function isProfileComplete(d: PersonalData) {
  return !!(d.nombre && d.apellido && d.cedula && d.correo);
}

export function completionPercent(d: PersonalData): number {
  const fields: (keyof PersonalData)[] = [
    "nombre", "apellido", "cedula", "dirHab", "dirEmp",
    "telHab", "telEmp", "telMov", "empresa", "cargo", "profesion", "correo",
  ];
  const filled = fields.filter((k) => !!d[k]).length;
  return Math.round((filled / fields.length) * 100);
}

export function usePersonalData() {
  const [data, setData] = useState<PersonalData>(() =>
    typeof window !== "undefined" ? load() : { ...EMPTY }
  );
  const [avatar, setAvatarState] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("ts_avatar") : null
  );

  const save = useCallback((next: PersonalData) => {
    setData(next);
    localStorage.setItem("ts_personal_data", JSON.stringify(next));
  }, []);

  const saveAvatar = useCallback((base64: string) => {
    setAvatarState(base64);
    localStorage.setItem("ts_avatar", base64);
  }, []);

  return { data, save, avatar, saveAvatar };
}
