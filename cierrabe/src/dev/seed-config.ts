export const DEV_IDS_DEFAULT = {
  adminId: "00000000-0000-4000-8000-000000000001",
  estudioId: "00000000-0000-4000-8000-000000000002",
  usuarioEstudioId: "00000000-0000-4000-8000-000000000003",
  liquidadorId: "00000000-0000-4000-8000-000000000004",
  soloLecturaId: "00000000-0000-4000-8000-000000000005",
  adminComoEstudioId: "00000000-0000-4000-8000-000000000006",
  empresaUsuarioId: "00000000-0000-4000-8000-000000000007",
  empleadoUsuarioId: "00000000-0000-4000-8000-000000000008",
  empresaColonId: "00000000-0000-4000-8000-000000000101",
  empresaEspigaId: "00000000-0000-4000-8000-000000000102",
  empleadoValentinaId: "00000000-0000-4000-8000-000000000201",
};

export const DEV_EMAILS_DEFAULT = {
  admin: "admin@cierra.local",
  estudio: "lucia@estudiopereira.uy",
  liquidador: "martin@estudiopereira.uy",
  soloLectura: "sofia@estudiopereira.uy",
  adminComoEstudio: "admin+estudio@cierra.local",
  empresa: "walter@tallercolon.uy",
  empleado: "valentina.correa@gmail.com",
};

export interface SeedDesarrolloConfig {
  adminId: string;
  estudioId: string;
  usuarioEstudioId: string;
  liquidadorId: string;
  soloLecturaId: string;
  adminComoEstudioId: string;
  empresaUsuarioId: string;
  empleadoUsuarioId: string;
  empresaColonId: string;
  empresaEspigaId: string;
  empleadoValentinaId: string;
  adminEmail: string;
  estudioEmail: string;
  liquidadorEmail: string;
  soloLecturaEmail: string;
  adminComoEstudioEmail: string;
  empresaEmail: string;
  empleadoEmail: string;
  password: string;
  estudioNombre: string;
  usuarioEstudioNombre: string;
  liquidadorNombre: string;
  soloLecturaNombre: string;
  empresaUsuarioNombre: string;
  empleadoUsuarioNombre: string;
}

export function resolverSeedDesarrollo(env: NodeJS.ProcessEnv): SeedDesarrolloConfig {
  return {
    adminId: env.CIERRA_DEV_ADMIN_ID ?? DEV_IDS_DEFAULT.adminId,
    estudioId: env.CIERRA_DEV_ESTUDIO_ID ?? DEV_IDS_DEFAULT.estudioId,
    usuarioEstudioId: env.CIERRA_DEV_USUARIO_ID ?? DEV_IDS_DEFAULT.usuarioEstudioId,
    liquidadorId: env.CIERRA_DEV_LIQUIDADOR_ID ?? DEV_IDS_DEFAULT.liquidadorId,
    soloLecturaId: env.CIERRA_DEV_SOLO_LECTURA_ID ?? DEV_IDS_DEFAULT.soloLecturaId,
    adminComoEstudioId: env.CIERRA_DEV_ADMIN_COMO_ESTUDIO_ID ?? DEV_IDS_DEFAULT.adminComoEstudioId,
    empresaUsuarioId: env.CIERRA_DEV_EMPRESA_USUARIO_ID ?? DEV_IDS_DEFAULT.empresaUsuarioId,
    empleadoUsuarioId: env.CIERRA_DEV_EMPLEADO_USUARIO_ID ?? DEV_IDS_DEFAULT.empleadoUsuarioId,
    empresaColonId: env.CIERRA_DEV_EMPRESA_COLON_ID ?? DEV_IDS_DEFAULT.empresaColonId,
    empresaEspigaId: env.CIERRA_DEV_EMPRESA_ESPIGA_ID ?? DEV_IDS_DEFAULT.empresaEspigaId,
    empleadoValentinaId: env.CIERRA_DEV_EMPLEADO_VALENTINA_ID ?? DEV_IDS_DEFAULT.empleadoValentinaId,
    adminEmail: env.CIERRA_DEV_ADMIN_EMAIL ?? DEV_EMAILS_DEFAULT.admin,
    estudioEmail: env.CIERRA_DEV_USUARIO_EMAIL ?? DEV_EMAILS_DEFAULT.estudio,
    liquidadorEmail: env.CIERRA_DEV_LIQUIDADOR_EMAIL ?? DEV_EMAILS_DEFAULT.liquidador,
    soloLecturaEmail: env.CIERRA_DEV_SOLO_LECTURA_EMAIL ?? DEV_EMAILS_DEFAULT.soloLectura,
    adminComoEstudioEmail: env.CIERRA_DEV_ADMIN_COMO_ESTUDIO_EMAIL ?? DEV_EMAILS_DEFAULT.adminComoEstudio,
    empresaEmail: env.CIERRA_DEV_EMPRESA_EMAIL ?? DEV_EMAILS_DEFAULT.empresa,
    empleadoEmail: env.CIERRA_DEV_EMPLEADO_EMAIL ?? DEV_EMAILS_DEFAULT.empleado,
    password: env.CIERRA_DEV_PASSWORD ?? "CierraDemo123",
    estudioNombre: env.CIERRA_DEV_ESTUDIO_NOMBRE ?? "Estudio Pereira & Asociados",
    usuarioEstudioNombre: env.CIERRA_DEV_USUARIO_NOMBRE ?? "Lucia Pereira",
    liquidadorNombre: env.CIERRA_DEV_LIQUIDADOR_NOMBRE ?? "Martin Suarez",
    soloLecturaNombre: env.CIERRA_DEV_SOLO_LECTURA_NOMBRE ?? "Sofia Mendez",
    empresaUsuarioNombre: env.CIERRA_DEV_EMPRESA_USUARIO_NOMBRE ?? "Walter Gomez",
    empleadoUsuarioNombre: env.CIERRA_DEV_EMPLEADO_USUARIO_NOMBRE ?? "Valentina Correa",
  };
}
