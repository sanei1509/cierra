import type { AuditEvent, Empleado, Empresa, Etapa, Novedad, Periodo, Usuario } from "./types";

export const ESTUDIO = { nombre: "Estudio Pereira & Asociados", ciudad: "Montevideo" };

export const USUARIOS: Usuario[] = [
  { id: "u1", nombre: "Lucía Pereira", rol: "admin", email: "lucia@estudiopereira.uy" },
  { id: "u2", nombre: "Martín Suárez", rol: "liquidador", email: "martin@estudiopereira.uy" },
  { id: "u3", nombre: "Sofía Méndez", rol: "lectura", email: "sofia@estudiopereira.uy" },
];

type EmpSeed = [nombre: string, cargo: string, categoria: string, sueldo: number, ingreso: string, hijos?: number, extra?: Partial<Empleado>];

interface EmpresaSeed extends Omit<Empresa, "id"> {
  id: string;
  empleados: EmpSeed[];
}

const EMPRESAS_SEED: EmpresaSeed[] = [
  {
    id: "excelrrhh", nombre: "Empresa xxxxxxxxx SA", rut: "xxxxxxxxxxxx", nroBps: "pendiente", actividad: "Administración de crédito",
    grupo: 14, subgrupo: "02", responsableId: "u1", requiereAprobacion: false, tono: "menta",
    contacto: { nombre: "Administración RRHH", email: "rrhh@empresa.example" },
    empleados: [
      [
        "Juan Antonio Perez",
        "Jefe Comercial",
        "Jefe Comercial",
        65000,
        "2025-01-14",
        1,
        {
          id: "excelrrhh-1",
          ci: "-",
          email: "juan.perez@hotmail.com",
          area: "Comercial",
          tipoContrato: "Indefinido",
          telefono: "59899606501",
          direccion: "Gabriel Pereira 3125, Montevideo - Uruguay",
          licenciaDisponible: 20,
          cuenta: "BROU: 12345968869-00001",
        },
      ],
    ],
  },
  {
    id: "espiga", nombre: "Panadería La Espiga", rut: "215478330012", nroBps: "4521877", actividad: "Elaboración y venta de pan",
    grupo: 1, subgrupo: "06", responsableId: "u1", requiereAprobacion: true, tono: "crema",
    contacto: { nombre: "Graciela Núñez", email: "graciela@laespiga.uy" },
    empleados: [
      ["Jorge Bentancur", "Maestro panadero", "Panadero", 58200, "2015-03-02", 2],
      ["Ana Rodríguez", "Ayudante de cuadra", "Ayudante", 39800, "2021-08-16", 1],
      ["Valentina Correa", "Atención al público", "Vendedor", 40200, "2023-02-01"],
      ["Diego Ferreira", "Ayudante de cuadra", "Ayudante", 38100, "2024-11-04"],
    ],
  },
  {
    id: "delprado", nombre: "Ferretería Del Prado", rut: "217893440011", nroBps: "3985120", actividad: "Venta de artículos de ferretería",
    grupo: 10, subgrupo: "01", responsableId: "u2", requiereAprobacion: true, tono: "cielo",
    contacto: { nombre: "Ricardo Olivera", email: "ricardo@ferredelprado.uy" },
    empleados: [
      ["Pablo Techera", "Encargado de local", "Encargado", 64500, "2012-05-10", 1],
      ["Lorena Silva", "Administrativa", "Administrativo", 47300, "2019-09-02", 2],
      ["Matías Acosta", "Vendedor", "Vendedor", 43900, "2022-01-17"],
      ["Bruno Cabrera", "Vendedor", "Vendedor", 42600, "2023-06-05"],
      ["Emiliano Díaz", "Cadete", "Cadete", 35200, "2025-10-01"],
    ],
  },
  {
    id: "brio", nombre: "Café Brío", rut: "219004560018", nroBps: "5102334", actividad: "Cafetería",
    grupo: 12, subgrupo: "03", responsableId: "u2", requiereAprobacion: true, tono: "rosa",
    contacto: { nombre: "Camila Fagúndez", email: "camila@cafebrio.uy" },
    empleados: [
      ["Florencia Pintos", "Barista", "Cajero", 41500, "2022-03-14"],
      ["Rodrigo Méndez", "Cocinero", "Cocinero", 46800, "2021-07-01", 1],
      ["Julieta Sosa", "Moza", "Mozo", 39400, "2024-04-22"],
      ["Tomás Olivera", "Mozo", "Mozo", 39400, "2025-02-10"],
      ["Micaela Vidal", "Moza", "Mozo", 39400, "2026-09-15"],
    ],
  },
  {
    id: "visionsur", nombre: "Óptica Visión Sur", rut: "214433220019", nroBps: "4011293", actividad: "Óptica y contactología",
    grupo: 10, subgrupo: "01", responsableId: "u1", requiereAprobacion: true, tono: "lila",
    contacto: { nombre: "Andrea Castro", email: "andrea@visionsur.uy" },
    empleados: [
      ["Carolina Ramos", "Óptica técnica", "Encargado", 68900, "2016-02-01", 1, { conyugeFonasa: true }],
      ["Federico Luna", "Vendedor", "Vendedor", 44800, "2020-10-05"],
      ["Paula Giménez", "Administrativa", "Administrativo", 46100, "2023-03-20", 1],
    ],
  },
  {
    id: "ferrari", nombre: "Estudio Jurídico Ferrari", rut: "212298770014", nroBps: "3877410", actividad: "Servicios jurídicos",
    grupo: 19, subgrupo: "01", responsableId: "u1", requiereAprobacion: false, tono: "menta",
    contacto: { nombre: "Dr. Gustavo Ferrari", email: "gferrari@ferrari.com.uy" },
    empleados: [
      ["Mariana Álvarez", "Asistente legal", "Asistente", 58300, "2017-04-03", 2],
      ["Nicolás Pereyra", "Procurador", "Técnico", 72400, "2014-08-11", 1, { conyugeFonasa: true }],
      ["Laura Benítez", "Recepcionista", "Recepcionista", 41200, "2024-07-01"],
    ],
  },
  {
    id: "atlantida", nombre: "Distribuidora Atlántida", rut: "216650980017", nroBps: "4390055", actividad: "Distribución mayorista de alimentos",
    grupo: 10, subgrupo: "01", responsableId: "u2", requiereAprobacion: true, tono: "cielo",
    contacto: { nombre: "Sergio Machado", email: "smachado@atlantida.com.uy" },
    empleados: [
      ["Gonzalo Rivero", "Encargado de depósito", "Encargado", 61200, "2013-01-07", 3],
      ["Andrés Moreira", "Chofer repartidor", "Vendedor", 48700, "2018-06-18", 1],
      ["Cecilia Barrios", "Administrativa", "Administrativo", 49900, "2019-11-04"],
      ["Joaquín Suárez", "Repartidor", "Cadete", 37200, "2022-09-12"],
      ["Santiago Ledesma", "Repartidor", "Cadete", 36800, "2024-02-26"],
      ["Natalia Píriz", "Vendedora", "Vendedor", 46500, "2021-05-03", 1],
    ],
  },
  {
    id: "pocitos", nombre: "Clínica Dental Pocitos", rut: "213377110016", nroBps: "3701882", actividad: "Odontología",
    grupo: 19, subgrupo: "01", responsableId: "u1", requiereAprobacion: true, tono: "menta",
    contacto: { nombre: "Dra. Verónica Sánchez", email: "vsanchez@dentalpocitos.uy" },
    empleados: [
      ["Silvana Martínez", "Asistente dental", "Asistente", 52800, "2018-03-12", 1],
      ["Lucas Da Silva", "Asistente dental", "Asistente", 48200, "2023-08-01"],
      ["Agustina Pérez", "Recepcionista", "Recepcionista", 42300, "2022-12-05"],
    ],
  },
  {
    id: "palacio", nombre: "Librería Palacio", rut: "211155440013", nroBps: "3544011", actividad: "Librería y papelería",
    grupo: 10, subgrupo: "01", responsableId: "u2", requiereAprobacion: true, tono: "crema",
    contacto: { nombre: "Beatriz Lemos", email: "beatriz@libreriapalacio.uy" },
    empleados: [
      ["Hugo Ortiz", "Encargado", "Encargado", 59100, "2010-09-01", 0, { conyugeFonasa: true }],
      ["Romina Cardozo", "Vendedora", "Vendedor", 42100, "2024-03-18"],
      ["Ignacio Rey", "Cadete", "Cadete", 33800, "2025-06-02", 0, { ci: "" }],
    ],
  },
  {
    id: "colon", nombre: "Taller Mecánico Colón", rut: "218844660015", nroBps: "4880213", actividad: "Reparación de automotores",
    grupo: 10, subgrupo: "01", responsableId: "u2", requiereAprobacion: true, tono: "lila",
    contacto: { nombre: "Walter Gómez", email: "walter@tallercolon.uy" },
    empleados: [
      ["Fabián Suárez", "Mecánico", "Encargado", 62700, "2011-02-14", 2],
      ["Leandro Castro", "Ayudante", "Cadete", 36900, "2023-10-09"],
      ["Mauricio Bello", "Administrativo", "Administrativo", 45100, "2020-04-06", 1],
    ],
  },
  {
    id: "bolivar", nombre: "Heladería Bolívar", rut: "219977330010", nroBps: "5230098", actividad: "Heladería artesanal",
    grupo: 12, subgrupo: "03", responsableId: "u1", requiereAprobacion: true, tono: "rosa",
    contacto: { nombre: "Marcelo Duarte", email: "marcelo@heladeriabolivar.uy" },
    empleados: [
      ["Victoria Núñez", "Cajera", "Cajero", 40600, "2023-11-01"],
      ["Emilia Rocha", "Heladera", "Cocinero", 44100, "2022-10-17"],
    ],
  },
  {
    id: "nube", nombre: "Agencia Nube Digital", rut: "220012340019", nroBps: "5311467", actividad: "Marketing digital",
    grupo: 19, subgrupo: "01", responsableId: "u1", requiereAprobacion: true, tono: "lila",
    contacto: { nombre: "Federica Aguirre", email: "fede@nubedigital.uy" },
    empleados: [
      ["Martina Costa", "Diseñadora", "Técnico", 78500, "2021-02-01"],
      ["Joaquín Varela", "Community manager", "Asistente", 52400, "2023-05-15"],
      ["Sol Fernández", "Desarrolladora", "Técnico", 96200, "2020-09-07", 1],
      ["Bruno Laens", "Administrativo", "Administrativo", 44800, "2025-03-03"],
    ],
  },
  {
    id: "rocha", nombre: "Construcciones Rocha", rut: "215566770012", nroBps: "4102987", actividad: "Obras y reformas",
    grupo: 9, subgrupo: "01", responsableId: "u2", requiereAprobacion: true, tono: "crema",
    contacto: { nombre: "Alberto Rocha", email: "arocha@construccionesrocha.uy" },
    empleados: [
      ["Oscar Delgado", "Oficial albañil", "Oficial", 0, "2019-05-06", 1, { modalidad: "jornalero" }],
      ["Raúl Viera", "Medio oficial", "Medio oficial", 0, "2022-08-22", 0, { modalidad: "jornalero" }],
    ],
  },
];

function ci(seed: number) {
  const n = 1_000_000 + ((seed * 7919) % 5_000_000);
  return `${String(n).slice(0, 1)}.${String(n).slice(1, 4)}.${String(n).slice(4, 7)}-${seed % 10}`;
}

function slug(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, ".");
}

export function crearSeed() {
  const empresas: Empresa[] = [];
  const empleados: Empleado[] = [];
  let k = 1;
  for (const e of EMPRESAS_SEED) {
    const { empleados: es, ...emp } = e;
    empresas.push(emp);
    es.forEach(([nombreCompleto, cargo, categoria, sueldo, ingreso, hijos = 0, extra], i) => {
      const [nombre, ...ap] = nombreCompleto.split(" ");
      // Aumento de julio (Consejos de Salarios): sueldo previo ~4% menor
      const sueldos =
        sueldo > 0
          ? ingreso < "2026-07"
            ? [
                { desde: ingreso < "2026-01-01" ? "2026-01-01" : ingreso, monto: Math.round(sueldo / 1.04 / 100) * 100 },
                { desde: "2026-07-01", monto: sueldo },
              ]
            : [{ desde: ingreso, monto: sueldo }]
          : [];
      empleados.push({
        id: `${e.id}-${i + 1}`,
        empresaId: e.id,
        nombre,
        apellido: ap.join(" "),
        ci: ci(k++),
        email: `${slug(nombre)}.${slug(ap[0])}@gmail.com`.replace(/\.+/g, "."),
        cargo,
        categoria,
        modalidad: "mensual",
        ingreso,
        sueldos,
        hijos,
        conyugeFonasa: false,
        cuenta: `BROU ···${String(1000 + k * 37).slice(-4)}`,
        ...extra,
      });
    });
  }

  // Sueldo por debajo del laudo: Librería Palacio, cadete (33.800 < 34.500)
  // Cambios del mes y novedades
  const novedades: Novedad[] = [];
  let nid = 1;
  const nov = (empresaId: string, mes: string, empleadoId: string, tipo: Novedad["tipo"], o: Partial<Novedad> = {}) =>
    novedades.push({
      id: `n${nid++}`,
      empresaId,
      mes,
      empleadoId,
      tipo,
      origen: "cliente",
      autor: "Cliente",
      fecha: `${mes}-26T09:00:00`,
      ...o,
    });

  // Historial: horas extra recurrentes en la distribuidora y la ferretería
  for (const mes of ["2026-06", "2026-07", "2026-08"]) {
    nov("atlantida", mes, "atlantida-2", "hora_extra", { cantidad: 12 });
    nov("atlantida", mes, "atlantida-4", "hora_extra", { cantidad: 8 });
    nov("delprado", mes, "delprado-3", "hora_extra", { cantidad: 6 });
    nov("espiga", mes, "espiga-1", "hora_extra", { cantidad: 10 });
  }
  nov("brio", "2026-08", "brio-3", "licencia", { cantidad: 10 });
  nov("espiga", "2026-08", "espiga-1", "feriado", { cantidad: 1, nota: "25 de agosto" });
  nov("brio", "2026-08", "brio-2", "feriado", { cantidad: 1, nota: "25 de agosto" });
  nov("nube", "2026-08", "nube-3", "bono", { importe: 15000, nota: "Proyecto Q2" });

  // Septiembre
  const S = "2026-09";
  const est = { origen: "estudio" as const, autor: "Martín Suárez" };
  nov("excelrrhh", S, "excelrrhh-1", "bono", { importe: 1500, nota: "Presentismo según planilla RRHH", ...est, autor: "Lucía Pereira" });
  nov("espiga", S, "espiga-1", "hora_extra", { cantidad: 10 });
  nov("espiga", S, "espiga-2", "falta", { cantidad: 1, nota: "Sin certificado" });
  nov("delprado", S, "delprado-3", "hora_extra", { cantidad: 8 });
  nov("delprado", S, "delprado-2", "adelanto", { importe: 8000 });
  nov("brio", S, "brio-2", "hora_extra", { cantidad: 14 });
  nov("brio", S, "brio-1", "bono", { importe: 4000, nota: "Presentismo" });
  nov("visionsur", S, "visionsur-2", "bono", { importe: 6500, nota: "Comisión ventas" });
  nov("visionsur", S, "visionsur-3", "licencia", { cantidad: 5 });
  nov("ferrari", S, "ferrari-2", "bono", { importe: 32000, nota: "Honorarios caso Rivas", ...est, autor: "Lucía Pereira" });
  nov("ferrari", S, "ferrari-3", "cambio_salarial", { importe: 43500, nota: "Recategorización", ...est, autor: "Lucía Pereira" });
  nov("atlantida", S, "atlantida-2", "hora_extra", { cantidad: 22 });
  nov("atlantida", S, "atlantida-5", "falta", { cantidad: 2 });
  nov("atlantida", S, "atlantida-6", "bono", { importe: 12000, nota: "Comisión ventas" });
  nov("pocitos", S, "pocitos-1", "hora_extra", { cantidad: 4 });
  nov("pocitos", S, "pocitos-3", "licencia", { cantidad: 7 });
  nov("pocitos", S, "pocitos-2", "certificacion", { cantidad: 2, nota: "Gripe", adjunto: { nombre: "certificado-lucas-dasilva.pdf", tipo: "application/pdf", tamano: 184320 } });
  nov("palacio", S, "palacio-2", "llegada_tarde", { cantidad: 40, ...est });
  nov("palacio", S, "palacio-1", "certificacion", { cantidad: 1, ...est });
  nov("palacio", S, "palacio-2", "hora_extra", { cantidad: 6, ...est });

  const periodo = (empresaId: string, etapa: Etapa, o: Partial<Periodo> = {}): Periodo => ({
    id: `${empresaId}-${S}`,
    empresaId,
    mes: S,
    etapa,
    fechaObjetivo: "2026-10-02",
    sinNovedades: false,
    versiones: [],
    advertenciasAceptadas: {},
    bps: "pendiente",
    rectificaciones: [],
    notas: [],
    ...o,
  });

  const periodos: Periodo[] = [
    periodo("excelrrhh", "cerrada", {
      bps: "generado",
      solicitud: { enviada: "2026-09-25T09:00:00", respondida: "2026-09-30T17:31:00" },
      notas: [
        { fecha: "2026-09-30T17:31:00", por: "Lucía Pereira", texto: "Importado desde Copia de RRHH. - Empresa_ xxxxxxxxx.xlsx: hoja madre, nómina, recibo, licencias y asiento." },
        { fecha: "2026-09-30T17:32:00", por: "Lucía Pereira", texto: "La hoja madre trae sueldo nominal 100.000 y la nómina mensual usa 65.000 + presentismo 1.500; el demo toma la nómina mensual como base vigente." },
        { fecha: "2026-09-30T17:33:00", por: "Lucía Pereira", texto: "El Excel muestra CI '-' y BPS/RUT sin completar; se conservan como pendientes para que la ficha exponga el faltante." },
      ],
    }),
    periodo("espiga", "cerrada", { bps: "presentado", solicitud: { enviada: "2026-09-18T09:00:00", abierta: "2026-09-18T11:20:00", respondida: "2026-09-19T08:40:00" } }),
    periodo("delprado", "cerrada", { solicitud: { enviada: "2026-09-18T09:00:00", abierta: "2026-09-19T10:00:00", respondida: "2026-09-20T15:10:00" } }),
    periodo("brio", "aprobada", { solicitud: { enviada: "2026-09-18T09:00:00", abierta: "2026-09-18T19:02:00", respondida: "2026-09-21T09:30:00" } }),
    periodo("visionsur", "enviada", { solicitud: { enviada: "2026-09-18T09:00:00", abierta: "2026-09-22T13:00:00", respondida: "2026-09-22T13:40:00" } }),
    periodo("ferrari", "borrador", { solicitud: { enviada: "2026-09-18T09:00:00", respondida: "2026-09-23T12:00:00" } }),
    periodo("atlantida", "devuelta", { solicitud: { enviada: "2026-09-18T09:00:00", abierta: "2026-09-19T08:00:00", respondida: "2026-09-20T17:00:00" } }),
    periodo("pocitos", "recibidas", { solicitud: { enviada: "2026-09-18T09:00:00", abierta: "2026-09-23T09:10:00", respondida: "2026-09-24T18:25:00" } }),
    periodo("palacio", "recibidas", { solicitud: { enviada: "2026-09-18T09:00:00", abierta: "2026-09-22T10:00:00", respondida: "2026-09-24T11:00:00" } }),
    periodo("colon", "novedades", { solicitud: { enviada: "2026-09-22T09:00:00" } }),
    periodo("bolivar", "novedades"),
    periodo("nube", "novedades", { solicitud: { enviada: "2026-09-22T09:00:00", abierta: "2026-09-24T16:45:00" } }),
    periodo("rocha", "recibidas", { sinNovedades: true, solicitud: { enviada: "2026-09-18T09:00:00", respondida: "2026-09-19T09:00:00" } }),
  ];

  const audit: AuditEvent[] = [
    { id: "a0", fecha: "2026-09-30T17:31:00", actor: "Lucía Pereira", empresaId: "excelrrhh", entidad: "Excel RRHH", accion: "Importó la planilla de RRHH de Empresa xxxxxxxxx", detalle: "Empleado Juan Antonio Perez, nómina mensual, recibo, historia, licencias y reglas CESS/IRPF." },
    { id: "a1", fecha: "2026-09-24T18:25:00", actor: "Dra. Verónica Sánchez (cliente)", empresaId: "pocitos", entidad: "Novedades", accion: "Envió novedades de septiembre", detalle: "2 novedades por portal" },
    { id: "a2", fecha: "2026-09-24T16:45:00", actor: "Federica Aguirre (cliente)", empresaId: "nube", entidad: "Solicitud", accion: "Abrió la solicitud de novedades" },
    { id: "a3", fecha: "2026-09-24T11:00:00", actor: "Beatriz Lemos (cliente)", empresaId: "palacio", entidad: "Novedades", accion: "Envió novedades de septiembre" },
    { id: "a4", fecha: "2026-09-23T17:10:00", actor: "Sergio Machado (cliente)", empresaId: "atlantida", entidad: "Aprobación", accion: "Devolvió la liquidación v1", detalle: "Falta la comisión de Natalia: son $ 18.000, no $ 12.000." },
    { id: "a5", fecha: "2026-09-23T12:00:00", actor: "Lucía Pereira", empresaId: "ferrari", entidad: "Empleado", accion: "Cambió sueldo de Laura Benítez", antes: "$ 41.200", despues: "$ 43.500" },
    { id: "a6", fecha: "2026-09-22T13:40:00", actor: "Lucía Pereira", empresaId: "visionsur", entidad: "Aprobación", accion: "Envió la liquidación v1 a aprobación" },
    { id: "a7", fecha: "2026-09-22T09:00:00", actor: "Martín Suárez", empresaId: "colon", entidad: "Solicitud", accion: "Solicitó novedades de septiembre" },
    { id: "a8", fecha: "2026-09-21T15:20:00", actor: "Camila Fagúndez (cliente)", empresaId: "brio", entidad: "Aprobación", accion: "Aprobó la liquidación v1" },
    { id: "a9", fecha: "2026-09-21T10:00:00", actor: "Martín Suárez", empresaId: "delprado", entidad: "Período", accion: "Cerró septiembre y publicó 5 recibos" },
    { id: "a10", fecha: "2026-09-20T09:00:00", actor: "Lucía Pereira", empresaId: "espiga", entidad: "BPS", accion: "Marcó la nómina como presentada" },
  ];

  return { empresas, empleados, novedades, periodos, audit };
}
