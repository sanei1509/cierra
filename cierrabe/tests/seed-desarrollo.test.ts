import { describe, expect, it } from "vitest";
import { DEV_IDS_DEFAULT, resolverSeedDesarrollo } from "../src/dev/seed-config";

describe("seed de desarrollo", () => {
  it("usa ids y datos por defecto compatibles con .env.example", () => {
    const config = resolverSeedDesarrollo({});

    expect(config.adminId).toBe(DEV_IDS_DEFAULT.adminId);
    expect(config.estudioId).toBe(DEV_IDS_DEFAULT.estudioId);
    expect(config.usuarioEstudioId).toBe(DEV_IDS_DEFAULT.usuarioEstudioId);
    expect(config.liquidadorId).toBe(DEV_IDS_DEFAULT.liquidadorId);
    expect(config.soloLecturaId).toBe(DEV_IDS_DEFAULT.soloLecturaId);
    expect(config.empresaUsuarioId).toBe(DEV_IDS_DEFAULT.empresaUsuarioId);
    expect(config.empleadoUsuarioId).toBe(DEV_IDS_DEFAULT.empleadoUsuarioId);
    expect(config.adminEmail).toBe("admin@cierra.local");
    expect(config.estudioEmail).toBe("lucia@estudiopereira.uy");
    expect(config.liquidadorEmail).toBe("martin@estudiopereira.uy");
    expect(config.soloLecturaEmail).toBe("sofia@estudiopereira.uy");
    expect(config.empresaEmail).toBe("walter@tallercolon.uy");
    expect(config.empleadoEmail).toBe("valentina.correa@gmail.com");
    expect(config.password).toBe("CierraDemo123");
  });

  it("permite sobreescribir ids y nombres por entorno", () => {
    const config = resolverSeedDesarrollo({
      CIERRA_DEV_ADMIN_ID: "00000000-0000-4000-8000-000000000101",
      CIERRA_DEV_ESTUDIO_ID: "00000000-0000-4000-8000-000000000102",
      CIERRA_DEV_USUARIO_ID: "00000000-0000-4000-8000-000000000103",
      CIERRA_DEV_ADMIN_EMAIL: "cesar@cierra.local",
      CIERRA_DEV_USUARIO_EMAIL: "contador@estudio.uy",
      CIERRA_DEV_PASSWORD: "OtraClave123",
      CIERRA_DEV_ESTUDIO_NOMBRE: "Estudio Demo",
      CIERRA_DEV_USUARIO_NOMBRE: "Contador Demo",
    });

    expect(config).toMatchObject({
      adminId: "00000000-0000-4000-8000-000000000101",
      estudioId: "00000000-0000-4000-8000-000000000102",
      usuarioEstudioId: "00000000-0000-4000-8000-000000000103",
      adminEmail: "cesar@cierra.local",
      estudioEmail: "contador@estudio.uy",
      password: "OtraClave123",
      estudioNombre: "Estudio Demo",
      usuarioEstudioNombre: "Contador Demo",
    });
  });
});
