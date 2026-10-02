import { describe, expect, it } from "vitest";
import { calcularEmpleado } from "../src/lib/engine";
import type { Empleado, Empresa, Novedad } from "../src/lib/types";

const empresaBase: Empresa = {
  id: "empresa-test",
  nombre: "Empresa Test",
  rut: "212345670018",
  nroBps: "1234567",
  actividad: "Comercio",
  grupo: 10,
  subgrupo: "01",
  responsableId: "u1",
  requiereAprobacion: true,
  contacto: { nombre: "Cliente", email: "cliente@example.com" },
  tono: "menta",
};

const empleadoBase: Empleado = {
  id: "empleado-test",
  empresaId: empresaBase.id,
  nombre: "Ana",
  apellido: "Silva",
  ci: "1.234.567-8",
  email: "ana@example.com",
  cargo: "Vendedora",
  categoria: "Vendedor",
  modalidad: "mensual",
  ingreso: "2025-01-01",
  sueldos: [{ desde: "2026-07-01", monto: 50000 }],
  hijos: 0,
  conyugeFonasa: false,
};

describe("motor de liquidacion", () => {
  it("calcula sueldo mensual y bono informado como haber gravado", () => {
    const novedades: Novedad[] = [
      {
        id: "n1",
        empresaId: empresaBase.id,
        mes: "2026-09",
        empleadoId: empleadoBase.id,
        tipo: "bono",
        importe: 5000,
        nota: "Comision ventas",
        origen: "cliente",
        autor: "Cliente",
        fecha: "2026-09-20T10:00:00",
      },
    ];

    const resultado = calcularEmpleado(empresaBase, empleadoBase, "2026-09", novedades);

    expect(resultado.fueraDeAlcance).toBeUndefined();
    expect(resultado.totalHaberes).toBe(55000);
    expect(resultado.nominalGravado).toBe(55000);
    expect(resultado.lineas.some((l) => l.concepto === "Bono / comisión · Comision ventas" && l.importe === 5000)).toBe(true);
  });

  it("bloquea construccion en vez de estimar una liquidacion", () => {
    const empresaConstruccion: Empresa = { ...empresaBase, grupo: 9, actividad: "Construccion" };

    const resultado = calcularEmpleado(empresaConstruccion, empleadoBase, "2026-09", []);

    expect(resultado.fueraDeAlcance).toContain("Industria de la construcción");
    expect(resultado.lineas).toHaveLength(0);
    expect(resultado.liquido).toBe(0);
  });

  it("descuenta suspensiones sin goce del nominal gravado", () => {
    const novedades: Novedad[] = [
      {
        id: "n-susp",
        empresaId: empresaBase.id,
        mes: "2026-09",
        empleadoId: empleadoBase.id,
        tipo: "suspension",
        cantidad: 2,
        nota: "Sancion disciplinaria",
        origen: "estudio",
        autor: "Estudio",
        fecha: "2026-09-18T10:00:00",
      },
    ];

    const resultado = calcularEmpleado(empresaBase, empleadoBase, "2026-09", novedades);

    expect(resultado.lineas).toContainEqual(expect.objectContaining({ concepto: "Suspensión sin goce", importe: -3333.33 }));
    expect(resultado.nominalGravado).toBe(46666.67);
  });

  it("separa viaticos no gravados y descuentos manuales", () => {
    const novedades: Novedad[] = [
      {
        id: "n-viatico",
        empresaId: empresaBase.id,
        mes: "2026-09",
        empleadoId: empleadoBase.id,
        tipo: "viatico",
        importe: 3000,
        origen: "cliente",
        autor: "Cliente",
        fecha: "2026-09-20T10:00:00",
      },
      {
        id: "n-desc",
        empresaId: empresaBase.id,
        mes: "2026-09",
        empleadoId: empleadoBase.id,
        tipo: "descuento_manual",
        importe: 1200,
        nota: "Ajuste acordado",
        origen: "estudio",
        autor: "Estudio",
        fecha: "2026-09-20T10:00:00",
      },
    ];

    const resultado = calcularEmpleado(empresaBase, empleadoBase, "2026-09", novedades);

    expect(resultado.lineas).toContainEqual(expect.objectContaining({ concepto: "Viático", gravadoBps: false, importe: 3000 }));
    expect(resultado.lineas).toContainEqual(expect.objectContaining({ concepto: "Descuento manual · Ajuste acordado", tipo: "descuento", importe: 1200 }));
    expect(resultado.nominalGravado).toBe(50000);
    expect(resultado.totalHaberes).toBe(53000);
  });
});
