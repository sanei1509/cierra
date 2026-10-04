/**
 * Inventario de funciones de la versión actual, con el mismo orden que la lista
 * que se comparte con los contadores. Mantener al día cuando cambie el sistema.
 */
export type Cobertura = "si" | "parcial" | "no";

export interface Funcion {
  nombre: string;
  estado: Cobertura;
  nota?: string;
  pasos?: string[];
  probar?: { href: string; label: string };
  nueva?: boolean;
}

export interface GrupoFunciones {
  id: string;
  titulo: string;
  funciones: Funcion[];
}

export const FUNCIONES: GrupoFunciones[] = [
  {
    id: "empresas",
    titulo: "Empresas y clientes",
    funciones: [
      {
        nombre: "Gestión de múltiples empresas desde una misma cuenta",
        estado: "si",
        pasos: [
          "Entrá a Inicio: la tabla “Cartera del mes” lista las 12 empresas con su estado.",
          "Filtrá por “Falta info del cliente”, “Con alertas” o “Para trabajar ahora”, o por responsable.",
          "En Empresas ves cada cliente como tarjeta, con personas y líquido del mes.",
        ],
        probar: { href: "/empresas", label: "Abrir Empresas" },
      },
      {
        nombre: "Ficha de cada empresa",
        estado: "parcial",
        nota: "Muestra RUT, número BPS, grupo y subgrupo, contacto y logo. Todavía no se puede dar de alta ni editar los datos de la empresa.",
        pasos: ["Entrá a Empresas y tocá una tarjeta.", "Los datos están en el encabezado, junto al contacto del cliente."],
        probar: { href: "/empresas/brio", label: "Ver Café Brío" },
      },
      {
        nombre: "Usuarios y permisos por empresa",
        estado: "parcial",
        nota: "Hay roles (Administradora, Liquidador, Solo lectura) y un responsable por empresa. Todavía no se puede limitar a un usuario a ciertas empresas.",
        pasos: [
          "Tocá tu nombre arriba a la derecha y elegí “Martín Suárez · Liquidador”: puede calcular y cerrar, pero no rectificar.",
          "Elegí “Sofía Méndez · Solo lectura”: todos los botones de acción quedan deshabilitados.",
          "En Inicio, filtrá las empresas del mes por responsable.",
        ],
        probar: { href: "/", label: "Ir a Inicio" },
      },
      { nombre: "Documentación de cada cliente centralizada", estado: "no" },
      {
        nombre: "Historial de actividad",
        estado: "si",
        pasos: ["Dentro de una empresa, abrí la pestaña “Actividad”.", "Para ver todo el estudio, entrá a Auditoría y filtrá por empresa o tipo."],
        probar: { href: "/empresas/atlantida?tab=actividad", label: "Ver actividad de Atlántida" },
      },
    ],
  },
  {
    id: "empleados",
    titulo: "Empleados",
    funciones: [
      {
        nombre: "Alta, baja y modificación de empleados",
        estado: "parcial",
        nota: "Modificación desde la ficha y alta por importación. No hay alta manual individual ni baja.",
        pasos: ["Empresa → pestaña “Empleados” → tocá una persona.", "Cambiá sueldo, categoría, cédula o hijos y tocá “Guardar cambios”."],
        probar: { href: "/empresas/palacio?tab=empleados&emp=palacio-3", label: "Editar a Ignacio Rey" },
      },
      {
        nombre: "Legajo completo del trabajador",
        estado: "parcial",
        nota: "Cédula, email, cargo, categoría, sueldo, ingreso, hijos, cónyuge FONASA y cuenta de cobro.",
      },
      { nombre: "Cargo, categoría, sueldo, fecha de ingreso y horario", estado: "si", nota: "La ficha permite cargar días, horario, medio día y horas semanales." },
      {
        nombre: "Historial salarial",
        estado: "si",
        nota: "Cada sueldo queda con su fecha de vigencia y el cálculo usa el vigente en cada mes. Los cambios de categoría no quedan en el historial.",
        pasos: ["Abrí la ficha de una persona.", "Abajo, “Historia de sueldo” muestra cada monto con su vigencia (por ejemplo, el aumento de julio)."],
        probar: { href: "/empresas/delprado?tab=empleados&emp=delprado-1", label: "Ver a Pablo Techera" },
      },
      { nombre: "Documentación del empleado", estado: "no" },
      {
        nombre: "Importación masiva desde Excel",
        estado: "si",
        nueva: true,
        pasos: [
          "Empresa → pestaña “Empleados” → “Importar desde Excel”.",
          "Descargá la plantilla o tocá “probar con uno de ejemplo”.",
          "Revisá la vista previa: las filas con error (cédula faltante o repetida, sueldo o fecha inválidos) no se importan.",
          "Tocá “Importar N personas”. Quedan en la ficha y en Auditoría.",
        ],
        probar: { href: "/empresas/pocitos?tab=empleados", label: "Importar en Clínica Pocitos" },
      },
    ],
  },
  {
    id: "liquidacion",
    titulo: "Liquidación de sueldos",
    funciones: [
      {
        nombre: "Sueldos mensuales",
        estado: "si",
        nota: "Mes completo o proporcional si ingresó o egresó en el mes. Por empresa se puede usar regla de 30 días o jornada laboral.",
        pasos: ["Entrá a una empresa lista para liquidar y tocá “Calcular borrador”.", "En la pestaña “Liquidación” ves totales y el detalle por persona."],
        probar: { href: "/empresas/pocitos", label: "Calcular Clínica Pocitos" },
      },
      { nombre: "Jornaleros", estado: "no", nota: "Se bloquean a propósito: el sistema avisa que no los calcula en vez de estimar (ver Construcciones Rocha)." },
      { nombre: "Horas extra", estado: "si", nota: "Valor hora = sueldo ÷ 200, con recargo del 100%." },
      { nombre: "Faltas", estado: "si" },
      { nombre: "Llegadas tarde", estado: "si", nueva: true, nota: "Se cargan en minutos y se descuentan a valor hora." },
      { nombre: "Feriados trabajados", estado: "si", nueva: true, nota: "Regla configurable por empresa. El cálculo por jornada puede excluir feriados no laborables fijos de Uruguay; faltan feriados móviles." },
      { nombre: "Certificaciones médicas", estado: "si", nueva: true, nota: "Descuenta los días certificados (los cubre el subsidio). Avisa si falta el comprobante." },
      { nombre: "Nocturnidad", estado: "no" },
      { nombre: "Comisiones, primas y partidas especiales", estado: "parcial", nota: "Un solo tipo, “Bono o comisión”, con comentario libre." },
      { nombre: "Adelantos y descuentos", estado: "parcial", nota: "Adelantos sí. Otros descuentos (préstamos, retenciones judiciales) no." },
      {
        nombre: "Aportes legales, FONASA e IRPF",
        estado: "si",
        nota: "Jubilatorio con tope, FONASA según BPC, hijos y cónyuge, FRL, IRPF por franjas con deducciones. Valores de ejemplo. Sin ajuste anual de IRPF.",
        pasos: ["Liquidación → tocá una persona.", "Tocá cualquier línea para ver fórmula, base, tasa y parámetro usado.", "IRPF muestra el cálculo por franjas."],
        probar: { href: "/empresas/ferrari?tab=liquidacion&calc=ferrari-2", label: "Ver cálculo de Nicolás Pereyra" },
      },
      { nombre: "Aguinaldo", estado: "parcial", nota: "Junio y diciembre, solo sobre sueldo básico (sin variables). Visible en el recibo de junio." },
      { nombre: "Licencia", estado: "parcial", nota: "Se pagan los días gozados. No lleva saldo de días generados." },
      { nombre: "Salario vacacional", estado: "si", nota: "No gravado BPS. Simplificado." },
      { nombre: "Liquidaciones por egreso", estado: "no" },
      {
        nombre: "Retroactividades y ajustes",
        estado: "parcial",
        nota: "Se puede rectificar un mes cerrado y ver qué cambió por persona. No hay retroactivos de laudo.",
        pasos: [
          "Con usuario Administradora, entrá a una empresa cerrada.",
          "Tocá “Rectificar”, escribí el motivo y confirmá.",
          "Cambiá una novedad y recalculá: la tabla muestra “vs. versión cerrada”.",
        ],
        probar: { href: "/empresas/delprado", label: "Rectificar Ferretería Del Prado" },
      },
      {
        nombre: "Comparación con meses anteriores",
        estado: "si",
        nota: "Por persona y total, con alerta si varía más del 15%.",
        probar: { href: "/empresas/ferrari?tab=liquidacion", label: "Ver Estudio Ferrari" },
      },
      {
        nombre: "Dispersión de sueldos y control de transferencias",
        estado: "no",
        nueva: true,
        nota: "Módulo agregado al catálogo comercial. Falta construir la pantalla operativa para preparar órdenes de pago, marcar transferencias enviadas y conciliar liquidación contra banco.",
      },
    ],
  },
  {
    id: "novedades",
    titulo: "Novedades mensuales",
    funciones: [
      {
        nombre: "La empresa carga directamente las novedades",
        estado: "si",
        pasos: [
          "Abrí el portal del cliente (barra lateral → “Cliente y empleado”, o el botón “Portal cliente” en la empresa).",
          "Tocá “+ Hora extra”, “+ Falta”, etc. al lado de cada persona, completá la cantidad y agregá.",
          "Tocá “Enviar novedades”, o “No hubo novedades este mes”.",
          "Volvé al estudio: la empresa pasa a “Lista para liquidar” y las novedades tienen la marca “cliente”.",
        ],
        probar: { href: "/cliente/colon", label: "Portal de Taller Colón" },
      },
      {
        nombre: "Horas extra, faltas, suspensiones, licencias, subsidios y variables",
        estado: "si",
        nota: "También viáticos, presentismo, productividad, descuentos manuales, préstamos/retenciones, retroactivos, adelantos y cambios de sueldo/categoría.",
      },
      {
        nombre: "Adjuntar documentación",
        estado: "si",
        nueva: true,
        nota: "Guarda comprobantes livianos junto con la novedad; para producción falta moverlos a storage dedicado.",
        pasos: ["Al agregar una novedad, tocá “Adjuntar certificado, foto o PDF”.", "La novedad muestra un clip. Si una certificación no tiene comprobante, aparece una advertencia."],
        probar: { href: "/empresas/pocitos?tab=novedades", label: "Ver novedades de Pocitos" },
      },
      {
        nombre: "El estudio revisa las novedades antes de liquidar",
        estado: "parcial",
        nota: "El sistema valida solo (mínimos, cédula, variaciones) y el estudio puede corregir o quitar novedades. No hay un “aprobar” por cada novedad.",
      },
      { nombre: "Estados de las novedades", estado: "parcial", nota: "El estado es por empresa y mes (no pedidas, pedidas, abiertas, recibidas), no por cada novedad." },
      { nombre: "Recordatorios automáticos a empresas", estado: "no", nota: "Hay botones “Pedir novedades” y “Reenviar pedido”, pero no envían email real ni son automáticos." },
    ],
  },
  {
    id: "recibos",
    titulo: "Recibos",
    funciones: [
      {
        nombre: "Generación de recibos en PDF",
        estado: "si",
        nota: "Se generan al cerrar el mes. El PDF sale con “Imprimir → Guardar como PDF”.",
        pasos: ["Recibos y BPS → tocá un recibo.", "Tocá “Imprimir o guardar PDF”."],
        probar: { href: "/documentos", label: "Abrir Recibos y BPS" },
      },
      {
        nombre: "Descarga individual o masiva",
        estado: "si",
        nueva: true,
        pasos: ["Recibos y BPS → en una empresa cerrada, tocá “Todos en PDF”.", "Se abre un documento con un recibo por página: “Descargar todos en PDF”."],
        probar: { href: "/recibos/espiga/2026-09", label: "Recibos de La Espiga" },
      },
      { nombre: "Publicación automática", estado: "si", nota: "Al cerrar el período se publican en el portal del empleado. El envío por email no está." },
      { nombre: "Historial completo de recibos", estado: "si", nota: "Recibos y BPS permite elegir cualquier mes desde enero." },
      {
        nombre: "Personalización con datos y logo de la empresa",
        estado: "si",
        nueva: true,
        pasos: ["Entrá a una empresa y tocá su logo (círculo con iniciales).", "Elegí una imagen: aparece en el recibo, el portal del cliente y el del empleado."],
        probar: { href: "/empresas/espiga", label: "Subir logo a La Espiga" },
      },
    ],
  },
  {
    id: "portal",
    titulo: "Portal del empleado",
    funciones: [
      { nombre: "Acceso individual para cada trabajador", estado: "parcial", nota: "Cada persona tiene su portal, pero se entra por link directo, sin usuario ni contraseña." },
      {
        nombre: "Ver y descargar recibos, con historial",
        estado: "si",
        pasos: ["Barra lateral → “Cliente y empleado” → elegí una persona.", "Arriba está el último recibo con “Ver” y “Descargar”; abajo, los meses anteriores."],
        probar: { href: "/portal/pocitos-1", label: "Portal de Silvana Martínez" },
      },
      { nombre: "Aguinaldo, salario vacacional y otras liquidaciones", estado: "si", nota: "Incluidos en el recibo del mes; junio se marca “Incluye aguinaldo”." },
      { nombre: "Consulta de licencia y saldo", estado: "no" },
      { nombre: "Documentos laborales", estado: "no" },
      { nombre: "Aviso de nuevo recibo", estado: "no" },
      {
        nombre: "Confirmación de visualización",
        estado: "si",
        nueva: true,
        nota: "Registra cuándo el empleado abrió su recibo. No equivale a firma.",
        pasos: [
          "Abrí el portal de un empleado de una empresa cerrada y tocá “Ver”.",
          "Volvé a Recibos y BPS: ese recibo figura “Visto” con la fecha, y el evento queda en Auditoría.",
        ],
        probar: { href: "/portal/espiga-3", label: "Portal de Valentina Correa" },
      },
      { nombre: "Aceptación o firma electrónica", estado: "no" },
    ],
  },
  {
    id: "panel",
    titulo: "Panel del estudio",
    funciones: [
      {
        nombre: "Dashboard con todas las empresas",
        estado: "si",
        pasos: ["Inicio muestra cuántas empresas cerraste, una barra con el estado de cada una y la tabla de la cartera.", "Cada fila tiene el botón con el siguiente paso."],
        probar: { href: "/", label: "Ir a Inicio" },
      },
      { nombre: "Empresas pendientes de enviar novedades", estado: "si", nota: "Tarjeta “Esperan al cliente” y botón para pedirlas a todas juntas." },
      { nombre: "Empresas pendientes de liquidar", estado: "si", nota: "Tarjeta “Listas para avanzar”." },
      { nombre: "Liquidaciones terminadas", estado: "si", nota: "Filtro “Cerradas” y estado BPS por empresa." },
      {
        nombre: "Alertas y tareas pendientes",
        estado: "si",
        pasos: ["Entrá a una empresa “Con alertas”.", "Cada alerta explica el problema y lleva a la ficha a corregir.", "Las advertencias se aceptan con una nota."],
        probar: { href: "/empresas/palacio", label: "Resolver Librería Palacio" },
      },
      { nombre: "Calendario de vencimientos", estado: "parcial", nota: "Tres fechas fijas en Inicio: límite de novedades, pago de sueldos y nómina BPS." },
      { nombre: "Reportes por empresa y empleado", estado: "no" },
      { nombre: "Exportación a Excel o PDF", estado: "parcial", nota: "Recibos en PDF y archivo de nómina BPS (formato de ejemplo). No hay reportes en Excel." },
    ],
  },
  {
    id: "automatizaciones",
    titulo: "Automatizaciones",
    funciones: [
      { nombre: "Recordatorios automáticos por email o WhatsApp", estado: "no" },
      { nombre: "Aviso de novedades pendientes", estado: "parcial", nota: "Se ven en el dashboard; no se envía ningún aviso." },
      { nombre: "Aviso a empleados cuando se publica un recibo", estado: "no" },
      { nombre: "Recordatorios de vencimientos", estado: "no" },
      { nombre: "Alertas ante documentación faltante", estado: "parcial", nota: "Cédula faltante, email faltante y certificación sin comprobante." },
    ],
  },
  {
    id: "seguridad",
    titulo: "Administración y seguridad",
    funciones: [
      { nombre: "Diferentes usuarios dentro del estudio", estado: "si", nota: "Tres usuarios de ejemplo; se cambia desde el menú superior." },
      { nombre: "Roles y permisos", estado: "si", nota: "Administradora, Liquidador y Solo lectura." },
      {
        nombre: "Registro de quién hizo cada cambio y auditoría",
        estado: "si",
        pasos: ["Entrá a Auditoría.", "Cada evento tiene quién, cuándo, empresa y, en cambios de datos, el antes y después."],
        probar: { href: "/auditoria", label: "Abrir Auditoría" },
      },
      { nombre: "Copias de seguridad", estado: "no", nota: "La base local persiste en PostgreSQL; faltan respaldos automáticos del ambiente desplegado." },
      { nombre: "Acceso seguro desde celular o computadora", estado: "parcial", nota: "Funciona en celular (los portales están pensados para eso), pero no hay inicio de sesión." },
    ],
  },
  {
    id: "integraciones",
    titulo: "Integraciones",
    funciones: [
      { nombre: "Importación y exportación Excel", estado: "parcial", nota: "Importación de empleados sí; exportación no." },
      { nombre: "Integración con sistemas contables", estado: "no" },
      {
        nombre: "BPS / DGI",
        estado: "parcial",
        nota: "Descarga de un archivo de nómina con formato de ejemplo (marcado “NO PRESENTAR”) y registro de presentada.",
        pasos: ["Entrá a una empresa cerrada con BPS pendiente.", "Tocá “Descargar archivo BPS” y después “Marcar como presentada”."],
        probar: { href: "/empresas/delprado", label: "BPS de Ferretería Del Prado" },
      },
      { nombre: "API para otros sistemas", estado: "no" },
    ],
  },
  {
    id: "extras",
    titulo: "Incluido y no estaba en la lista",
    funciones: [
      {
        nombre: "Aprobación del cliente antes de cerrar",
        estado: "si",
        pasos: [
          "En una empresa con borrador, tocá “Enviar a aprobación”.",
          "Abrí su portal del cliente: ve totales y variaciones, y aprueba o devuelve con comentario.",
          "Si devuelve, el comentario aparece en “Próximo paso” del estudio.",
        ],
        probar: { href: "/cliente/visionsur", label: "Aprobar como Óptica Visión Sur" },
      },
      { nombre: "“¿Cómo se calculó?” línea por línea", estado: "si", probar: { href: "/empresas/ferrari?tab=liquidacion&calc=ferrari-2", label: "Ver un cálculo" } },
      { nombre: "Versiones de la liquidación y aviso de versión desactualizada", estado: "si", nota: "Si cambiás algo después de calcular, avisa y pide recalcular antes de enviar." },
      { nombre: "Bloqueo de casos no soportados", estado: "si", nota: "Construcción y jornaleros se bloquean en lugar de calcularse mal.", probar: { href: "/empresas/rocha", label: "Ver Construcciones Rocha" } },
      { nombre: "Control de mínimos por categoría (laudos)", estado: "si", nota: "Si el sueldo queda por debajo del laudo, bloquea el cálculo." },
    ],
  },
];

export const RECORRIDO = [
  { t: "¿Qué empresas tenés que atender hoy?", href: "/" },
  { t: "Cargá 6 horas extra de Fabián Suárez como si fueras el cliente de Taller Colón", href: "/cliente/colon" },
  { t: "Librería Palacio no deja calcular: encontrá por qué y arreglalo", href: "/empresas/palacio" },
  { t: "¿Por qué Nicolás Pereyra cobra $ 74.072?", href: "/empresas/ferrari?tab=liquidacion" },
  { t: "Distribuidora Atlántida devolvió la liquidación: resolvelo", href: "/empresas/atlantida" },
  { t: "Aprobá como cliente de Óptica Visión Sur y cerrá el mes", href: "/cliente/visionsur" },
  { t: "Sos Silvana: buscá tu recibo de junio", href: "/portal/pocitos-1" },
];
