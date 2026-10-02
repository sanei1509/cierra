import type { DiaHorarioLaboral, DiaSemana, HorarioLaboral } from "./types";

export const DIAS_LABORALES: Array<{ id: DiaSemana; label: string }> = [
  { id: "lunes", label: "Lunes" },
  { id: "martes", label: "Martes" },
  { id: "miercoles", label: "Miércoles" },
  { id: "jueves", label: "Jueves" },
  { id: "viernes", label: "Viernes" },
  { id: "sabado", label: "Sábado" },
  { id: "domingo", label: "Domingo" },
];

export function horarioDefault(aplicaDesde: string): HorarioLaboral {
  return {
    aplicaDesde,
    horasSemanales: 44,
    descripcion: "Lunes a viernes 9 a 18",
    dias: DIAS_LABORALES.map(({ id }) => ({
      dia: id,
      trabaja: !["sabado", "domingo"].includes(id),
      entrada: !["sabado", "domingo"].includes(id) ? "09:00" : undefined,
      salida: !["sabado", "domingo"].includes(id) ? "18:00" : undefined,
    })),
  };
}

export function normalizarHorario(horario: HorarioLaboral, fallbackDesde: string): HorarioLaboral {
  const dias = DIAS_LABORALES.map(({ id }) => {
    const dia = horario.dias.find((d) => d.dia === id);
    return {
      dia: id,
      trabaja: Boolean(dia?.trabaja),
      entrada: dia?.trabaja ? dia.entrada || undefined : undefined,
      salida: dia?.trabaja ? dia.salida || undefined : undefined,
      medioDia: dia?.trabaja ? Boolean(dia.medioDia) : undefined,
    } satisfies DiaHorarioLaboral;
  });
  return {
    aplicaDesde: horario.aplicaDesde || fallbackDesde,
    horasSemanales: Math.max(0, Number(horario.horasSemanales) || 0),
    descripcion: horario.descripcion?.trim() || resumenHorario({ ...horario, dias }),
    dias,
  };
}

export function resumenHorario(horario?: HorarioLaboral) {
  if (!horario) return "Sin horario cargado";
  const activos = DIAS_LABORALES.filter(({ id }) => horario.dias.some((d) => d.dia === id && d.trabaja));
  if (!activos.length) return horario.descripcion || "Sin días laborales";
  const dias = activos.map((d) => d.label.slice(0, 3)).join(", ");
  return `${dias} · ${horario.horasSemanales || 0} h semanales${horario.descripcion ? ` · ${horario.descripcion}` : ""}`;
}
