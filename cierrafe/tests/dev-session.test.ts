import { describe, expect, it } from "vitest";
import { ACCESOS_DESARROLLO, buscarAccesoPorEmail, resolverDestinoPorEmail } from "../src/lib/dev-session";

describe("sesion de desarrollo", () => {
  it("mantiene accesos para todos los actores del sistema", () => {
    expect(ACCESOS_DESARROLLO.map((a) => a.actor)).toEqual(["sistema", "estudio", "estudio", "estudio", "estudio", "empresa", "empleado"]);
  });

  it("solo resuelve destino para mails ya registrados", () => {
    expect(resolverDestinoPorEmail("admin@cierra.local")).toBe("/admin");
    expect(resolverDestinoPorEmail("admin+estudio@cierra.local")).toBe("/");
    expect(resolverDestinoPorEmail("walter@tallercolon.uy")).toBe("/cliente/colon");
    expect(buscarAccesoPorEmail("nadie@example.com")).toBeUndefined();
  });

  it("distingue cuando el admin esta actuando como estudio", () => {
    const delegado = ACCESOS_DESARROLLO.find((a) => a.id === "admin_as_study");

    expect(delegado).toMatchObject({
      actor: "estudio",
      delegadoPor: { email: "admin@cierra.local" },
    });
  });
});
