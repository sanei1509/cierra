# Branding Cierra

Este documento es la fuente de verdad visual de Cierra. Toda interfaz nueva o modificada debe consultar estas reglas antes de implementar componentes, pantallas, modales, formularios, tablas o layouts.

## Identidad

Cierra es un SaaS para estudios contables de Uruguay. Centraliza empresas, empleados, novedades mensuales, liquidaciones, recibos, BPS / CESS, IRPF, tareas, documentos, reportes, auditoria y portales de empresas y empleados.

La identidad debe transmitir orden, claridad, confianza, control, modernidad, simplicidad, profesionalismo, tecnologia y cercania. Debe sentirse moderna y profesional, pero no fria. No debe parecer software contable antiguo, ERP viejo, sistema estatal ni aplicacion empresarial gris y pesada.

Usar la marca como `cierra`, preferentemente en minuscula.

## Logo

La identidad principal esta compuesta por una C redondeada con degradado azul, un acento dorado y el wordmark `cierra` en navy. El isotipo puede utilizarse como favicon, avatar del sistema, icono de app, sidebar contraido o loader.

No redibujar un logo alternativo cuando exista un asset oficial disponible. Si se optimiza para web, mantener intacta la identidad.

## Assets Oficiales De Marca

### Logo Principal

Archivo: `cierrafe/public/brand/cierra-logo.png`

Uso:

- Pantalla de login y portada.
- Superficies claras.
- Comunicaciones principales.
- Lugares donde exista espacio horizontal suficiente.

El logo principal contiene el isotipo oficial y el wordmark `cierra` en navy. Debe usarse sin filtros de color, sin recorte, sin deformacion y manteniendo su relacion de aspecto.

### Isotipo

Archivo: `cierrafe/public/brand/cierra-symbol.png`

Uso:

- Favicon.
- App icon.
- Sidebar contraido.
- Avatar de producto.
- Espacios reducidos.
- Loader o elementos compactos de identidad.

No recrear el isotipo de Cierra con CSS, HTML, iconos genericos ni formas aproximadas. Utilizar siempre los assets oficiales.

En superficies oscuras donde el logo completo no tenga contraste suficiente, usar el isotipo oficial junto a texto `cierra` en Inter, peso 700 u 800, color claro `#F5F8FF`.
## Paleta Oficial

Color principal:

- Cierra Blue: `#2F6BFF`
- Cierra Blue Hover: `#2459E6`
- Cierra Blue Soft: `#DCE9FF`

Navy:

- Cierra Navy: `#102247`
- Cierra Navy Secondary: `#1B315F`

Acento dorado:

- Cierra Gold: `#F5B633`

Fondos y superficies:

- Background principal: `#F7FAFF`
- Surface: `#FFFFFF`
- Surface secundaria: `#F1F5FC`
- Border: `#D8E1F0`

Textos:

- Text Primary: `#102247`
- Text Secondary: `#667592`
- Text Muted: `#97A3BA`

Colores semanticos:

- Success: `#1FA971`
- Warning: `#F2A93B`
- Error: `#E25555`
- Info: `#3D7CFF`

Los estados funcionales no deben confundirse con la marca. Usar fondos suaves y texto/iconos fuertes siempre que sea posible.

## Gradientes

El gradiente principal va de `#2F6BFF` a `#6CB3FF`. Fondos e ilustraciones pueden usar `#EAF2FF`, `#DCE9FF` y `#CFE4FF`.

Evitar degradados multicolor, neon, brillo excesivo y efectos saturados.

## Tipografia

Usar Inter como tipografia principal. Pesos sugeridos: 400, 500, 600, 700 y 800.

Jerarquia:

- H1: 700 / 800
- H2: 700
- H3: 600 / 700
- Body: 400 / 500
- Labels: 500 / 600
- Buttons: 600

Mantener alta legibilidad y no introducir tipografias alternativas sin actualizar este documento.

## Design Tokens

Los colores, radios, sombras, fondos y estados deben estar centralizados en tokens. No repetir hexadecimales por componentes.

Tokens conceptuales:

- `--cierra-blue`
- `--cierra-blue-hover`
- `--cierra-blue-soft`
- `--cierra-navy`
- `--cierra-navy-2`
- `--cierra-gold`
- `--cierra-bg`
- `--cierra-surface`
- `--cierra-surface-soft`
- `--cierra-border`
- `--cierra-text`
- `--cierra-text-secondary`
- `--cierra-text-muted`
- `--cierra-success`
- `--cierra-warning`
- `--cierra-error`
- `--cierra-info`

Radios:

- Small: `10px`
- Input: `14px`
- Button: `14px`
- Card: `20px`
- Large: `24px`

Sombra suave: `0 8px 24px rgba(16, 34, 71, 0.08)`.

## Componentes

Cards y superficies deben ser limpias, luminosas, con bordes sutiles y sombras suaves. Evitar sombras negras pesadas, glassmorphism exagerado, contornos gruesos y cajas excesivamente marcadas.

Botones:

- Primary: fondo Cierra Blue, texto blanco, hover Cierra Blue Hover.
- Secondary: fondo claro/blanco, borde Cierra Border, texto Navy.
- Ghost: sin fondo dominante, texto azul/navy.
- Danger: solo para acciones destructivas, basado en Error.

Todos los botones deben compartir altura, radios, tipografia, hover, active, focus, disabled y loading.

Inputs y formularios:

- Fondo blanco.
- Borde suave.
- Altura comoda.
- Radio 12-14px.
- Labels claros.
- Placeholders suaves.
- Focus visible azul.
- Errores diferenciados.

Nunca eliminar el indicador de foco.

Iconografia: lineal, limpia, moderna, consistente y de formas redondeadas. Preferir lucide-react cuando aplique.

## Login

La pantalla de login es una expresion principal de la marca. Debe usar una composicion de dos columnas en desktop:

Izquierda:

- Logo Cierra.
- Titulo: `Todo el trabajo mensual de tu estudio, en un solo lugar.`
- Texto: `Empresas, empleados, novedades, liquidaciones y recibos organizados en una plataforma clara, segura y moderna.`
- Conceptos visuales: Empresas, Empleados, Liquidaciones, Recibos.
- Ondas azules suaves, tarjetas flotantes, previews simples del sistema, curvas decorativas y pequenos acentos dorados.

Derecha:

- Card de login.
- `ACCESO`
- `Entrar a Cierra`
- `Accede con el email habilitado para tu cuenta.`
- Campos Email y Contrasena.
- Boton Entrar.
- Separador `o`.
- Boton Entrar con Google.
- `Necesitas acceso? Contacta a tu administrador.`

Los accesos rapidos de desarrollo no deben aparecer en produccion y deben respetar el nuevo estilo.

En mobile se prioriza el formulario, se mantiene el logo visible, se reduce la ilustracion y no debe existir scroll horizontal.

## Layout General

La interfaz general debe ser clara. El sidebar debe sentirse moderno y liviano, con logo visible arriba y estado activo en Cierra Blue. Dashboards, tablas, cards, KPIs, filtros, paginaciones, modales, alerts, badges y empty states deben compartir la misma paleta, radios, sombras y tipografia.

Las tablas deben priorizar claridad, escaneo, buen espaciado, hover suave, acciones claras y responsive razonable.

Los badges deben usar fondo suave + texto fuerte. No usar fondos saturados salvo casos necesarios.

## Dark Mode

No eliminar modo oscuro. Adaptar la identidad con tonos navy:

- Background dark: `#0B1220`
- Surface dark: `#121C2F`
- Surface elevated: `#18243A`
- Border dark: `#283650`
- Text dark primary: `#F5F8FF`
- Text dark secondary: `#AAB7CF`
- Cierra Blue dark: `#4B7DFF`
- Gold: `#F5B633`

No usar negro puro.

## Documentos e Impresion

Los documentos formales de Cierra, incluyendo recibos de sueldo, comprobantes, reportes imprimibles y PDFs, utilizan una superficie clara independiente del tema activo de la aplicacion.

El modo oscuro de la aplicacion NO debe alterar la representacion del documento. Un recibo descargado o impreso desde dark mode debe verse igual que uno generado desde light mode.

Tokens de documento:

- Document Background: `#FFFFFF`
- Document Text: `#102247`
- Document Secondary: `#667592`
- Document Muted: `#97A3BA`
- Document Border: `#D8E1F0`
- Document Primary: Cierra Blue `#2F6BFF`

Todo componente que represente lectura formal, descarga, impresion o PDF debe usar una superficie de documento que controle explicitamente su fondo, texto, bordes, estados de impresion y jerarquia tipografica. No debe heredar accidentalmente colores del tema global.

## Personalizacion

Estudios contables y empresas pueden tener nombre, logo/foto, personalizacion basica y modo claro u oscuro. Esa personalizacion no debe destruir el sistema visual base de Cierra: layout, tipografia, componentes, espaciado, estados y estructura pertenecen a Cierra.

## Accesibilidad

Mantener o mejorar contraste, navegacion por teclado, focus visible, labels accesibles, `aria-label` donde corresponda, botones identificados, estados disabled claros y mensajes de error comprensibles.

## Animaciones

Se permiten microanimaciones suaves de 150ms a 250ms para hover, modales, menus, cards y sidebar. Evitar animaciones excesivas.

## No Usar

No usar como identidad principal turquesa, verde, violeta, naranja ni negro puro. No usar calculadoras, signos `$`, edificios corporativos, iconografia contable antigua, oficinistas genericos, exceso decorativo, sombras pesadas, neon, glassmorphism excesivo, gradientes multicolor, colores aleatorios por modulo ni estilos distintos por pantalla.

## Directiva Para Desarrollo Futuro

Antes de crear o modificar cualquier interfaz de Cierra, consultar este documento. Reutilizar componentes existentes y design tokens. Solo crear una variante visual nueva cuando sea realmente necesaria. No introducir nuevos colores principales, radios, sombras, tipografias ni estilos de botones sin actualizar explicitamente `BRANDING_CIERRA.md`.

