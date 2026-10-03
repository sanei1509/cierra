import { cookies } from "next/headers";
import { exigirSesionDev } from "@/lib/dev-auth";
import { DEV_SESSION_COOKIE, parsearSesionDev } from "@/lib/dev-session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sesionDev = parsearSesionDev((await cookies()).get(DEV_SESSION_COOKIE)?.value);
  if (sesionDev && sesionDev.actor !== "sistema" && sesionDev.delegadoPor) {
    return children;
  }
  await exigirSesionDev(["sistema"]);
  return children;
}
