import { describe, expect, it } from "vitest";
import { datosEmpresaRecibo, nombreEmpresaVisible, razonSocialEmpresa } from "../src/lib/empresa";
import type { Empresa } from "../src/lib/types";

const empresa: Empresa = {
  id: "empresa-test",
  nombre: "Empresa Legal SA",
  nombreVisible: "La Empresa",
  razonSocial: "Empresa Legal Sociedad Anonima",
  rut: "212345670018",
  nroBps: "1234567",
  actividad: "Comercio",
  grupo: 10,
  subgrupo: "01",
  responsableId: "u1",
  requiereAprobacion: true,
  contacto: { nombre: "Cliente", email: "cliente@example.com" },
  direccion: "Av. Uruguay 1234",
  tono: "menta",
};

describe("marca de empresa", () => {
  it("usa nombre visible para pantallas y razon social para datos legales del recibo", () => {
    expect(nombreEmpresaVisible(empresa)).toBe("La Empresa");
    expect(razonSocialEmpresa(empresa)).toBe("Empresa Legal Sociedad Anonima");
    expect(datosEmpresaRecibo(empresa)).toMatchObject({
      nombre: "La Empresa",
      razonSocial: "Empresa Legal Sociedad Anonima",
      rut: "212345670018",
      bps: "1234567",
      direccion: "Av. Uruguay 1234",
    });
  });

  it("vuelve al nombre base cuando no hay marca personalizada", () => {
    const simple = { ...empresa, nombreVisible: undefined, razonSocial: undefined };

    expect(nombreEmpresaVisible(simple)).toBe("Empresa Legal SA");
    expect(razonSocialEmpresa(simple)).toBe("Empresa Legal SA");
  });
});
