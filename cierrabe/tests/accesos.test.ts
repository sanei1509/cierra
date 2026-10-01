import { describe, expect, it } from "vitest";
import type { AccessContext, EmpleadoId, EmpresaId, EstudioId, UsuarioId } from "../src/datos/contexto";
import { ErrorDominio } from "../src/datos/errores";
import {
  exigirEmpleado,
  exigirEmpresa,
  puedeAccionEmpresa,
  puedeAdministrarComercial,
  puedeDarAltaEmpleado,
  puedeDarAltaEmpresa,
  puedeDarAltaEstudio,
  puedeVerEmpleado,
  puedeVerEmpresa,
} from "../src/permisos/accesos";

const estudioA = "estudio-a" as EstudioId;
const estudioB = "estudio-b" as EstudioId;
const empresaA = "empresa-a" as EmpresaId;
const empresaB = "empresa-b" as EmpresaId;
const empleadoA = "empleado-a" as EmpleadoId;
const empleadoB = "empleado-b" as EmpleadoId;
const usuario = "usuario-1" as UsuarioId;

const systemAdmin: AccessContext = { actorTipo: "sistema", usuarioId: usuario, rol: "system_admin" };
const supportAdmin: AccessContext = { actorTipo: "sistema", usuarioId: usuario, rol: "support_admin" };
const studioAdmin: AccessContext = { actorTipo: "estudio", usuarioId: usuario, estudioId: estudioA, rol: "studio_admin", empresasPermitidas: "todas" };
const payroll: AccessContext = { actorTipo: "estudio", usuarioId: usuario, estudioId: estudioA, rol: "payroll_operator", empresasPermitidas: [empresaA] };
const studioReadonly: AccessContext = { actorTipo: "estudio", usuarioId: usuario, estudioId: estudioA, rol: "studio_readonly", empresasPermitidas: "todas" };
const companyOwner: AccessContext = { actorTipo: "empresa", usuarioId: usuario, estudioId: estudioA, empresaId: empresaA, rol: "company_owner" };
const companyReadonly: AccessContext = { actorTipo: "empresa", usuarioId: usuario, estudioId: estudioA, empresaId: empresaA, rol: "company_readonly" };
const employeeSelf: AccessContext = { actorTipo: "empleado", usuarioId: usuario, estudioId: estudioA, empresaId: empresaA, empleadoId: empleadoA, rol: "employee_self" };

describe("politicas de acceso", () => {
  it("permite al admin sistema ver todo y administrar comercial", () => {
    expect(puedeVerEmpresa(systemAdmin, { estudioId: estudioB, empresaId: empresaB })).toBe(true);
    expect(puedeVerEmpleado(systemAdmin, { estudioId: estudioB, empresaId: empresaB, empleadoId: empleadoB })).toBe(true);
    expect(puedeAdministrarComercial(systemAdmin)).toBe(true);
  });

  it("no permite a soporte administrar comercial", () => {
    expect(puedeAdministrarComercial(supportAdmin)).toBe(false);
  });

  it("respeta la cadena de altas de accesos", () => {
    expect(puedeDarAltaEstudio(systemAdmin)).toBe(true);
    expect(puedeDarAltaEstudio(studioAdmin)).toBe(false);

    expect(puedeDarAltaEmpresa(studioAdmin, { estudioId: estudioA })).toBe(true);
    expect(puedeDarAltaEmpresa(companyOwner, { estudioId: estudioA })).toBe(false);

    expect(puedeDarAltaEmpleado(companyOwner, { estudioId: estudioA, empresaId: empresaA })).toBe(true);
    expect(puedeDarAltaEmpleado(studioAdmin, { estudioId: estudioA, empresaId: empresaA })).toBe(true);
    expect(puedeDarAltaEmpleado(payroll, { estudioId: estudioA, empresaId: empresaA })).toBe(true);
    expect(puedeDarAltaEmpleado(payroll, { estudioId: estudioA, empresaId: empresaB })).toBe(false);
    expect(puedeDarAltaEmpleado(studioReadonly, { estudioId: estudioA, empresaId: empresaA })).toBe(false);
  });

  it("permite al estudio operar empleados y novedades de sus empresas", () => {
    expect(puedeAccionEmpresa(studioAdmin, "cargar_novedades", { estudioId: estudioA, empresaId: empresaA })).toBe(true);
    expect(puedeVerEmpleado(studioAdmin, { estudioId: estudioA, empresaId: empresaA, empleadoId: empleadoA })).toBe(true);
    expect(() => exigirEmpleado(studioAdmin, "editar_datos", { estudioId: estudioA, empresaId: empresaA, empleadoId: empleadoA })).not.toThrow();

    expect(puedeAccionEmpresa(studioReadonly, "cargar_novedades", { estudioId: estudioA, empresaId: empresaA })).toBe(false);
  });

  it("limita al liquidador a sus empresas permitidas", () => {
    expect(puedeVerEmpresa(payroll, { estudioId: estudioA, empresaId: empresaA })).toBe(true);
    expect(puedeVerEmpresa(payroll, { estudioId: estudioA, empresaId: empresaB })).toBe(false);
  });

  it("limita al usuario empresa a su propia empresa", () => {
    expect(puedeAccionEmpresa(companyOwner, "cargar_novedades", { estudioId: estudioA, empresaId: empresaA })).toBe(true);
    expect(puedeAccionEmpresa(companyReadonly, "cargar_novedades", { estudioId: estudioA, empresaId: empresaA })).toBe(false);
    expect(puedeVerEmpresa(companyOwner, { estudioId: estudioA, empresaId: empresaB })).toBe(false);
  });

  it("limita al empleado a su propio perfil", () => {
    expect(puedeVerEmpleado(employeeSelf, { estudioId: estudioA, empresaId: empresaA, empleadoId: empleadoA })).toBe(true);
    expect(puedeVerEmpleado(employeeSelf, { estudioId: estudioA, empresaId: empresaA, empleadoId: empleadoB })).toBe(false);
  });

  it("devuelve no encontrado para recursos fuera del alcance", () => {
    expect(() => exigirEmpresa(studioAdmin, "ver", { estudioId: estudioB, empresaId: empresaB })).toThrow(ErrorDominio);
    try {
      exigirEmpresa(studioAdmin, "ver", { estudioId: estudioB, empresaId: empresaB });
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorDominio);
      expect((e as ErrorDominio).codigo).toBe("NO_ENCONTRADO");
    }
  });

  it("devuelve sin permiso cuando el recurso es visible pero la accion no corresponde", () => {
    try {
      exigirEmpleado(companyOwner, "editar_datos", { estudioId: estudioA, empresaId: empresaA, empleadoId: empleadoA });
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorDominio);
      expect((e as ErrorDominio).codigo).toBe("SIN_PERMISO");
    }
  });

  it("devuelve no autenticado sin contexto", () => {
    try {
      exigirEmpleado(null, "ver", { estudioId: estudioA, empresaId: empresaA, empleadoId: empleadoA });
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorDominio);
      expect((e as ErrorDominio).codigo).toBe("NO_AUTENTICADO");
    }
  });
});
