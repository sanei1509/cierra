import { exigirSesionDev } from "@/lib/dev-auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await exigirSesionDev(["sistema"]);
  return children;
}
