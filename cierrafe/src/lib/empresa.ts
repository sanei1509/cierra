import type { Empresa, PortalEmpresaConfig } from "./types";

export const PORTAL_EMPRESA_DEFAULTS: PortalEmpresaConfig = {
  novedadesWeb: true,
  altasEmpleados: true,
  portalEmpleadoRecibos: true,
  solicitudAprobacionLiquidacion: true,
  aprobacionSueldos: true,
};

export function portalEmpresaConfig(empresa: Pick<Empresa, "portalConfig">): PortalEmpresaConfig {
  return { ...PORTAL_EMPRESA_DEFAULTS, ...empresa.portalConfig };
}

export function nombreEmpresaVisible(empresa: Pick<Empresa, "nombre" | "nombreVisible">) {
  return empresa.nombreVisible?.trim() || empresa.nombre;
}

export function razonSocialEmpresa(empresa: Pick<Empresa, "nombre" | "razonSocial">) {
  return empresa.razonSocial?.trim() || empresa.nombre;
}

export function datosEmpresaRecibo(empresa: Empresa) {
  return {
    nombre: nombreEmpresaVisible(empresa),
    razonSocial: razonSocialEmpresa(empresa),
    rut: empresa.rut,
    bps: empresa.nroBps,
    direccion: empresa.direccion,
    actividad: empresa.actividad,
    grupoSubgrupo: `${empresa.grupo}.${empresa.subgrupo}`,
  };
}
