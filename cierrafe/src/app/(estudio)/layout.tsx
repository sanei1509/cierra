import { Shell } from "@/components/shell";
import { exigirSesionDev } from "@/lib/dev-auth";

export default async function EstudioLayout({ children }: { children: React.ReactNode }) {
  await exigirSesionDev(["estudio"]);
  return <Shell>{children}</Shell>;
}
