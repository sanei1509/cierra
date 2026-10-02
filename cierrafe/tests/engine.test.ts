import { describe, expect, it } from "vitest";
import { calcularEmpleado, calcularEmpresa } from "../src/lib/engine";
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

  it("usa los factores de la empresa para horas extra y feriados", () => {
    const empresaConReglas: Empresa = {
      ...empresaBase,
      reglasLiquidacion: { horasExtraFactor: 1.5, feriadoFactor: 2 },
    };
    const novedades: Novedad[] = [
      {
        id: "n-he",
        empresaId: empresaBase.id,
        mes: "2026-09",
        empleadoId: empleadoBase.id,
        tipo: "hora_extra",
        cantidad: 3,
        origen: "cliente",
        autor: "Cliente",
        fecha: "2026-09-20T10:00:00",
      },
      {
        id: "n-fer",
        empresaId: empresaBase.id,
        mes: "2026-09",
        empleadoId: empleadoBase.id,
        tipo: "feriado",
        cantidad: 1,
        origen: "cliente",
        autor: "Cliente",
        fecha: "2026-09-20T10:00:00",
      },
    ];

    const resultado = calcularEmpleado(empresaConReglas, empleadoBase, "2026-09", novedades);

    expect(resultado.lineas).toContainEqual(expect.objectContaining({ concepto: "Horas extra", tasa: 1.5, importe: 1125 }));
    expect(resultado.lineas).toContainEqual(expect.objectContaining({ concepto: "Feriado trabajado", tasa: 2, importe: 3333.33 }));
  });

  it("paga presentismo automatico solo si no hay novedades que lo descuenten", () => {
    const empresaConPresentismo: Empresa = {
      ...empresaBase,
      reglasLiquidacion: { presentismo: { habilitado: true, monto: 2500 } },
    };

    const resultadoOk = calcularEmpleado(empresaConPresentismo, empleadoBase, "2026-09", []);
    const resultadoConFalta = calcularEmpleado(empresaConPresentismo, empleadoBase, "2026-09", [
      {
        id: "n-falta",
        empresaId: empresaBase.id,
        mes: "2026-09",
        empleadoId: empleadoBase.id,
        tipo: "falta",
        cantidad: 1,
        origen: "cliente",
        autor: "Cliente",
        fecha: "2026-09-20T10:00:00",
      },
    ]);

    expect(resultadoOk.lineas).toContainEqual(expect.objectContaining({ concepto: "Presentismo automático", importe: 2500 }));
    expect(resultadoConFalta.lineas.some((linea) => linea.concepto === "Presentismo automático")).toBe(false);
  });

  it("calcula presentismo por porcentaje y permite pago parcial segun regla de empresa", () => {
    const empresaConPresentismo: Empresa = {
      ...empresaBase,
      reglasLiquidacion: {
        presentismo: {
          habilitado: true,
          tipoCalculo: "porcentaje_sueldo_base",
          valor: 10,
          monto: 0,
          condiciones: [{ tipo: "falta", desdeCantidad: 1, accion: "paga_mitad" }],
        },
      },
    };

    const resultadoOk = calcularEmpleado(empresaConPresentismo, empleadoBase, "2026-09", []);
    const resultadoConFalta = calcularEmpleado(empresaConPresentismo, empleadoBase, "2026-09", [
      {
        id: "n-falta",
        empresaId: empresaBase.id,
        mes: "2026-09",
        empleadoId: empleadoBase.id,
        tipo: "falta",
        cantidad: 1,
        origen: "cliente",
        autor: "Cliente",
        fecha: "2026-09-20T10:00:00",
      },
    ]);

    expect(resultadoOk.lineas).toContainEqual(expect.objectContaining({ concepto: "Presentismo automático", importe: 5000 }));
    expect(resultadoConFalta.lineas).toContainEqual(expect.objectContaining({ concepto: "Presentismo automático", importe: 2500 }));
  });

  it("solo descuenta ausencia justificada cuando la novedad lo indica", () => {
    const ausenciaBase: Novedad = {
      id: "n-aus",
      empresaId: empresaBase.id,
      mes: "2026-09",
      empleadoId: empleadoBase.id,
      tipo: "ausencia_justificada",
      cantidad: 2,
      origen: "cliente",
      autor: "Cliente",
      fecha: "2026-09-20T10:00:00",
    };

    const sinDescuento = calcularEmpleado(empresaBase, empleadoBase, "2026-09", [ausenciaBase]);
    const conDescuento = calcularEmpleado(empresaBase, empleadoBase, "2026-09", [{ ...ausenciaBase, datos: { ausenciaDescuenta: true } }]);

    expect(sinDescuento.nominalGravado).toBe(50000);
    expect(sinDescuento.lineas).toContainEqual(expect.objectContaining({ concepto: "Ausencia justificada", importe: 0 }));
    expect(conDescuento.nominalGravado).toBe(46666.67);
    expect(conDescuento.lineas).toContainEqual(expect.objectContaining({ concepto: "Ausencia justificada con descuento", importe: -3333.33 }));
    expect(conDescuento.lineas.some((linea) => linea.concepto === "Ausencia justificada" && linea.importe === 0)).toBe(false);
  });

  it("usa el cambio de categoria como nuevo sueldo base sin generar un haber extra", () => {
    const resultado = calcularEmpleado(empresaBase, empleadoBase, "2026-09", [
      {
        id: "n-cat",
        empresaId: empresaBase.id,
        mes: "2026-09",
        empleadoId: empleadoBase.id,
        tipo: "cambio_categoria",
        importe: 60000,
        datos: { nuevaCategoria: "Encargado", nuevoSueldo: 60000, aplicaDesde: "2026-09-01" },
        origen: "estudio",
        autor: "Estudio",
        fecha: "2026-09-20T10:00:00",
      },
    ]);

    expect(resultado.lineas).toContainEqual(expect.objectContaining({ concepto: "Sueldo básico", base: 60000, importe: 60000 }));
    expect(resultado.lineas.some((linea) => linea.concepto.startsWith("Cambio de categoría") && linea.importe > 0)).toBe(false);
  });

  it("calcula mes parcial y excluye meses posteriores cuando hay fecha de egreso en ficha", () => {
    const empleadoConEgreso: Empleado = { ...empleadoBase, egreso: "2026-09-10" };

    const resultado = calcularEmpleado(empresaBase, empleadoConEgreso, "2026-09", []);
    const octubre = calcularEmpresa(empresaBase, [empleadoConEgreso], "2026-10", []);

    expect(resultado.lineas).toContainEqual(expect.objectContaining({ concepto: "Sueldo básico", cantidad: 10, importe: 16666.67 }));
    expect(octubre).toHaveLength(0);
  });
});
