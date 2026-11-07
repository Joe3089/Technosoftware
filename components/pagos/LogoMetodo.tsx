/* eslint-disable @next/next/no-img-element */
import { MARCA, type MetodoId } from "@/lib/pagos";
import { cn } from "@/lib/utils";

/** Brand tile: official SVG when available (/public/pagos), otherwise a wordmark. */
export default function LogoMetodo({ id, nombre, size = "md" }: { id: MetodoId; nombre: string; size?: "sm" | "md" }) {
  const m = MARCA[id];
  const dim = size === "sm" ? "w-9 h-9 rounded-lg" : "w-12 h-12 rounded-xl";
  return (
    <span className={cn("shrink-0 flex items-center justify-center overflow-hidden shadow-sm", dim)} style={{ background: m?.bg ?? "#152040" }}
      role="img" aria-label={nombre}>
      {m?.logo ? (
        <img src={m.logo} alt="" className={size === "sm" ? "w-5 h-5" : "w-7 h-7"} />
      ) : (
        <span className={cn("font-ui font-extrabold leading-none text-center px-0.5", size === "sm" ? "text-[8px]" : "text-[10px]")}
          style={{ color: m?.color ?? "#fff" }}>
          {m?.texto ?? nombre}
        </span>
      )}
    </span>
  );
}
