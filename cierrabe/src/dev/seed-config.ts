export const DEV_IDS_DEFAULT = {
  adminId: "00000000-0000-4000-8000-000000000001",
  estudioId: "00000000-0000-4000-8000-000000000002",
  usuarioEstudioId: "00000000-0000-4000-8000-000000000003",
};

export const DEV_EMAILS_DEFAULT = {
  admin: "admin@cierra.local",
  estudio: "lucia@estudiopereira.uy",
};

export interface SeedDesarrolloConfig {
  adminId: string;
  estudioId: string;
  usuarioEstudioId: string;
  adminEmail: string;
  estudioEmail: string;
  password: string;
  estudioNombre: string;
  usuarioEstudioNombre: string;
}

export function resolverSeedDesarrollo(env: NodeJS.ProcessEnv): SeedDesarrolloConfig {
  return {
    adminId: env.CIERRA_DEV_ADMIN_ID ?? DEV_IDS_DEFAULT.adminId,
    estudioId: env.CIERRA_DEV_ESTUDIO_ID ?? DEV_IDS_DEFAULT.estudioId,
    usuarioEstudioId: env.CIERRA_DEV_USUARIO_ID ?? DEV_IDS_DEFAULT.usuarioEstudioId,
    adminEmail: env.CIERRA_DEV_ADMIN_EMAIL ?? DEV_EMAILS_DEFAULT.admin,
    estudioEmail: env.CIERRA_DEV_USUARIO_EMAIL ?? DEV_EMAILS_DEFAULT.estudio,
    password: env.CIERRA_DEV_PASSWORD ?? "CierraDemo123",
    estudioNombre: env.CIERRA_DEV_ESTUDIO_NOMBRE ?? "Estudio Pereira & Asociados",
    usuarioEstudioNombre: env.CIERRA_DEV_USUARIO_NOMBRE ?? "Lucia Pereira",
  };
}
