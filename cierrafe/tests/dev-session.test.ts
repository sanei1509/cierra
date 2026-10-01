import { describe, expect, it } from "vitest";
import { ACCESOS_DESARROLLO, buscarAccesoPorEmail, resolverDestinoPorEmail } from "../src/lib/dev-session";

describe("sesion de desarrollo", () => {
  it("mantiene accesos para todos los actores del sistema", () => {
    expect(ACCESOS_DESARROLLO.map((a) => a.actor)).toEqual(["sistema", "estudio", "estudio", "estudio", "empresa", "empleado"]);
  });

  it("solo resuelve destino para mails ya registrados", () => {
    expect(resolverDestinoPorEmail("admin@cierra.local")).toBe("/admin");
    expect(resolverDestinoPorEmail("walter@tallercolon.uy")).toBe("/cliente/colon");
    expect(buscarAccesoPorEmail("nadie@example.com")).toBeUndefined();
  });
});
