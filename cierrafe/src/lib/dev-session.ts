import { USUARIOS } from "./seed";

export const DEV_SESSION_COOKIE = "cierra_dev_session";

export type DevAccessId = "system_admin" | "studio_admin" | "payroll_operator" | "studio_readonly" | "company_owner" | "employee_self";

export interface DevAccess {
  id: DevAccessId;
  label: string;
  detalle: string;
  email: string;
  actor: "sistema" | "estudio" | "empresa" | "empleado";
  usuarioId?: string;
  href: string;
}

export const ACCESOS_DESARROLLO: DevAccess[] = [
  {
    id: "system_admin",
    label: "Admin sistema",
    detalle: "Ve estudios, modulos, precios, cobros y actividad global.",
    email: "admin@cierra.local",
    actor: "sistema",
    href: "/admin",
  },
  {
    id: "studio_admin",
    label: "Estudio admin",
    detalle: "Administra empresas, empleados, liquidaciones y permisos del estudio.",
    email: "lucia@estudiopereira.uy",
    actor: "estudio",
    usuarioId: "u1",
    href: "/",
  },
  {
    id: "payroll_operator",
    label: "Liquidador",
    detalle: "Trabaja liquidaciones y novedades de las empresas asignadas.",
    email: "martin@estudiopereira.uy",
    actor: "estudio",
    usuarioId: "u2",
    href: "/",
  },
  {
    id: "studio_readonly",
    label: "Solo lectura",
    detalle: "Consulta datos del estudio sin cambiar informacion.",
    email: "sofia@estudiopereira.uy",
    actor: "estudio",
    usuarioId: "u3",
    href: "/",
  },
  {
    id: "company_owner",
    label: "Empresa",
    detalle: "Carga novedades, revisa empleados y aprueba recibos propios.",
    email: "walter@tallercolon.uy",
    actor: "empresa",
    href: "/cliente/colon",
  },
  {
    id: "employee_self",
    label: "Empleado",
    detalle: "Ve sus recibos y datos personales publicados por su empresa.",
    email: "valentina.correa@gmail.com",
    actor: "empleado",
    href: "/portal/espiga-3",
  },
];

export function buscarAccesoPorEmail(email: string) {
  const limpio = email.trim().toLowerCase();
  return ACCESOS_DESARROLLO.find((a) => a.email.toLowerCase() === limpio) ?? USUARIOS.find((u) => u.email.toLowerCase() === limpio);
}

export function resolverDestinoPorEmail(email: string) {
  const acceso = ACCESOS_DESARROLLO.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
  if (acceso) return acceso.href;
  const usuario = USUARIOS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  return usuario ? "/" : null;
}

export function serializarSesionDev(acceso: DevAccess) {
  return JSON.stringify({ accesoId: acceso.id, email: acceso.email, usuarioId: acceso.usuarioId ?? null, actor: acceso.actor });
}
