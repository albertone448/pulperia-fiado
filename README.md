# Sistema de Fiado — Minisúper El Puente

Aplicación web para llevar el control del crédito informal ("fiado") en una pulpería familiar en Costa Rica, reemplazando el clásico cuaderno de anotaciones en papel por un sistema digital simple, con trazabilidad completa y pensado para que lo use gente sin experiencia técnica.

## El problema

En una pulpería de barrio es común que los clientes de confianza se lleven productos y los paguen después. Tradicionalmente esto se anota en un cuaderno físico, con los problemas de siempre: se puede perder, es difícil de auditar, no hay control de límites por cliente y no queda registro claro de quién anotó qué.

Este proyecto digitaliza ese flujo manteniendo la misma simplicidad operativa del cuaderno, pero agregando control de límites de crédito, trazabilidad por persona, reportes y estadísticas.

## Funcionalidades principales

- **Clientes**: alta con nombre, teléfono opcional, correo electrónico opcional y límite de crédito editable (50,000 colones por defecto). Cada cliente decide, con dos casillas independientes, si quiere que se le avise por WhatsApp, por correo, por ambos o por ninguno cuando se le registra una compra o un pago (ver [`notificaciones-fiado/`](./notificaciones-fiado)). Los clientes nunca se borran físicamente. Hay dos estados reversibles, gestionables desde "Editar datos del cliente":
  - **Eliminado**: solo si el saldo está en cero. Desaparece de la lista principal y se restaura en cualquier momento desde "Clientes eliminados".
  - **Suspendido**: para clientes que dejaron de venir pero podrían volver, tengan o no deuda pendiente. No desaparece de la lista de clientes: queda en una sección aparte al final, debajo de una línea divisoria, con el nombre atenuado y una etiqueta de "Suspendido", así el buscador de arriba también los encuentra si alguien viene a pagar. Se puede seguir abriendo su ficha, ver su historial y registrarle pagos con normalidad; lo único que se bloquea es anotarle compras nuevas, hasta que se reactive.
- **Ventas esporádicas**: para alguien que deja algo fiado una sola vez, sin ser cliente habitual (no tiene sentido crearle un perfil completo). Se registran desde un botón aparte, "+ Nueva", en su propia sección de la lista de clientes, pidiendo nombre, teléfono opcional, correo opcional y el monto de la compra en un solo paso (la compra queda anotada de inmediato). Si se deja teléfono o correo, el aviso automático por ese medio queda activado directamente, sin casillas que marcar. Es una transacción única: no se le pueden anotar más compras, solo registrarle pagos (completos o parciales) hasta saldarla. En cuanto el saldo llega a cero se cierra sola (sin que nadie tenga que eliminarla a mano) y pasa a "Clientes eliminados", donde queda accesible por si hace falta revisarla o revertirla.
- **Registro de compras a crédito (fiado)** y **pagos**, estos últimos divisibles entre varios métodos (efectivo, tarjeta, SINPE) dentro de una misma transacción.
- **Control de límite de crédito con margen de tolerancia**: además del límite configurado por cliente, se permite un margen del 5% antes de bloquear la operación de verdad. Por debajo del límite no hay aviso; entre el límite y el límite+5% se muestra una alerta pero se permite guardar; por encima de ese margen la operación queda bloqueada. Esta validación aplica tanto al registrar una compra nueva como al editar una existente.
- **Historial editable con trazabilidad**: cada transacción registra quién la creó y, si se modifica, quién la editó y cuándo. En el perfil de cada cliente, cada movimiento muestra además cuánto quedó debiendo justo después de él.
- **Perfiles con PIN**: en vez de una cuenta por persona, hay un único login para la tienda y perfiles internos (nombre + PIN de 4 dígitos) para identificar quién hizo cada acción, con cierre automático de perfil tras 5 minutos de inactividad.
- **Resumen del día**: totales de fiado y de pagos por método, con selector de fecha, para cuadrar caja.
- **Estadísticas**: ranking de clientes con deuda pendiente, con un selector para ordenar por distintos criterios (tiempo sin pagar, tiempo sin dejar la cuenta en cero) y un botón para invertir el orden (ascendente/descendente), pensado para agregar más criterios fácilmente en el futuro. Los clientes suspendidos no entran en este ranking (para no distorsionar el promedio con cuentas que ya se sabe que están detenidas); si tienen saldo pendiente aparecen aparte, en un bloque separado. Las ventas esporádicas tampoco entran (ya son bien visibles desde la lista principal). Incluye además un resumen por semanas (lunes a domingo, últimas 8) con lo anotado a crédito, lo pagado y la diferencia, comparando la semana en curso contra la anterior a esa misma altura; las ventas esporádicas no cuentan ahí. También incluye estadísticas individuales por cliente (total histórico fiado, total pagado, última vez que la cuenta quedó en cero, saldo más bajo de los últimos 30 días y de los últimos 3 meses, que solo se muestra mientras sea mayor a cero, etc.).
- **Impresión y envío por WhatsApp**: tanto el resumen del día como el detalle de un cliente se pueden imprimir en una impresora térmica de 80mm, o copiar como texto formateado para compartir manualmente por WhatsApp.
- **Etiquetas de precio**: pestaña aparte para imprimir las etiquetas de los estantes (nombre y precio en letra grande) en la misma impresora de 80mm. Ver la sección de abajo.

## Etiquetas de precio

La pestaña **Etiquetas** guarda los productos de la tienda (nombre, precio y códigos de barras) y imprime etiquetas para los estantes, varias seguidas en una sola impresión para desperdiciar menos papel. Cada etiqueta lleva una sola copia por producto.

Cada producto tiene dos nombres: el **nombre en el sistema** (el que viene en la factura y en el XML, útil para revisar precios) y el **nombre para el público**, que es el que se imprime. Al importar un producto nuevo los dos son iguales; después el nombre para el público se puede cambiar desde la app y las importaciones posteriores no lo tocan. La búsqueda encuentra el producto por cualquiera de los dos.

Uso diario:

1. Buscar por nombre o por código de barras en la misma caja (con el lector, el producto escaneado se agrega solo a "Para imprimir").
2. Marcar los productos y tocar "Imprimir etiquetas".
3. Al cerrar el diálogo de impresión, la app pregunta si salieron bien. Si sí, se quitan de pendientes; si no, quedan para reintentar.

**Pendientes**: son los productos que necesitan etiqueta nueva. Un producto nuevo queda pendiente, y uno que ya se imprimió alguna vez vuelve a quedar pendiente si cambia su precio. Los productos que nunca se imprimieron (por ejemplo, un refresco de la nevera) no se marcan al cambiar de precio. Cualquier pendiente se puede descartar con la X.

**Importar del sistema de ventas**: se sube el XML de productos exportado por el sistema. Se usa el `Id` del sistema como identificador (se guarda con la llave `s{Id}`), así que un cambio de nombre o de código no duplica el producto: si el nombre cambió en el sistema se actualiza el nombre del sistema, nunca el nombre para el público. Se omiten los que no tienen nombre o tienen precio cero. La primera importación no deja nada pendiente; las siguientes agregan los productos nuevos y actualizan los precios. Los productos creados a mano desde la app no se tocan al importar.

Los productos se guardan en el nodo `/productos` de Firebase (no necesita reglas nuevas) y solo se descargan al abrir la pestaña. Cada producto tiene `nombre` (del sistema), `nombrePublico`, `precio`, `codigos`, `idSistema` (vacío si se creó a mano), `pendiente`, `impresoAlgunaVez`, `precioActualizadoEn`, `actualizadoPor` y `creado`.

Detalles de impresión: la etiqueta mide 71.5 mm de ancho, pensada para una impresora con 72 mm de área imprimible. En el diálogo de impresión hay que elegir ese papel y escala 100 por ciento, sin márgenes. El precio y el nombre se achican solos si no caben (precios de cinco dígitos y nombres largos). Estas etiquetas no interfieren con la impresión de tickets de clientes.

## Arquitectura

Aplicación 100% *serverless*: no hay backend propio. El frontend habla directamente con Firebase, que hace de base de datos y de sistema de autenticación al mismo tiempo.

```
┌─────────────────────┐        ┌──────────────────────────┐
│  React + Vite (SPA)  │ ─────► │ Firebase Realtime DB       │
│  hosteado en Vercel  │ ◄───── │ + Firebase Authentication  │
└─────────────────────┘        └──────────────────────────┘
```

- **Autenticación**: un único usuario de Firebase Auth (correo/contraseña) protege toda la base de datos. Las reglas de seguridad de Realtime Database exigen `auth != null` para leer o escribir.
- **Perfiles**: son un dato más dentro de la base (no son cuentas de Firebase Auth), usados únicamente para trazabilidad interna una vez que ya hay sesión iniciada.
- **Sincronización en tiempo real**: la app se suscribe a los nodos de Firebase con `onValue`, así que los cambios se reflejan al instante en cualquier sesión abierta, sin recargar.
- **Sin costo operativo**: Firebase (plan Spark) y Vercel (plan Hobby) se usan en sus niveles gratuitos.

## Componentes del sistema

Este ecosistema está compuesto por dos partes con ciclos de vida completamente independientes:

### 1. Aplicación principal (este repositorio)

La SPA de React descrita arriba: gestión de clientes, transacciones, estadísticas e impresión. Es lo único que se despliega en Vercel.

### 2. [`notificaciones-fiado/`](./notificaciones-fiado) — Notificador de WhatsApp y correo

Un programa de Node.js **completamente aparte**, que no se ejecuta como parte de esta aplicación ni está desplegado en Vercel. Corre de forma local en la computadora de la tienda, escucha directamente los cambios en la misma base de datos de Firebase (usando credenciales de administrador) y avisa automáticamente al cliente cuando se le registra una compra o un pago, por WhatsApp, por correo (SMTP), o por ambos, según lo que tenga activado cada cliente. También manda, una vez por semana (configurable, sábados 4am por defecto), un recordatorio de saldo pendiente a quien deba algo, con las últimas transacciones.

No hay integración a nivel de código entre ambos: comparten únicamente la base de datos de Firebase como punto de contacto. Ver [`notificaciones-fiado/README.md`](./notificaciones-fiado/README.md) para el detalle completo de cómo funciona y cómo se instala.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18, Vite |
| Estilos | CSS puro, sin frameworks de UI |
| Backend / base de datos | Firebase Realtime Database |
| Autenticación | Firebase Authentication |
| Hosting | Vercel (despliegue automático desde GitHub) |

## Estructura del proyecto

```
pulperia-fiado/
├── src/
│   ├── components/       # Componentes de React (una vista o modal cada uno)
│   ├── utils/             # Lógica de negocio pura: cálculo de deudas, tickets, fechas, productos
│   ├── firebase.js        # Inicialización de Firebase a partir de variables de entorno
│   ├── App.jsx             # Enrutamiento de alto nivel, sesión, perfiles e inactividad
│   └── index.css           # Estilos globales
├── notificaciones-fiado/   # Componente independiente (ver sección de arriba)
├── index.html
├── package.json
└── vite.config.js
```

## Requisitos

- Node.js 18 o superior
- Un proyecto de Firebase con Authentication (correo/contraseña) y Realtime Database activados

## Instalación

```bash
git clone https://github.com/<tu-usuario>/pulperia-fiado.git
cd pulperia-fiado
npm install
cp .env.example .env
```

## Variables de entorno

Completá `.env` con los datos de tu proyecto de Firebase (Configuración del proyecto → tus apps → configuración del SDK):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Reglas de seguridad de Firebase

Dado que la app usa un único login compartido en vez de cuentas individuales por usuario, las reglas de Realtime Database son intencionalmente simples:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

Cualquier sesión autenticada (siempre la misma cuenta) tiene acceso completo a la base. La capa de "quién hizo qué" se resuelve a nivel de aplicación con los perfiles internos, no con reglas de Firebase por usuario.

## Respaldo de datos

Realtime Database tiene habilitada la copia de seguridad automática diaria, configurada directamente desde la consola de Firebase (Realtime Database → Copias de seguridad), no desde código ni desde este repositorio. Cada backup exporta los datos y las reglas a un bucket de Google Cloud Storage (`pulperia-fiado-default-rtdb-backups`). También se puede disparar una copia manual desde la misma pantalla en cualquier momento.

## Ejecución en desarrollo

```bash
npm run dev
```

## Build de producción

```bash
npm run build
```

## Despliegue

El proyecto está pensado para desplegarse en Vercel con despliegue automático: cada push a la rama principal dispara un build nuevo. Las variables de entorno se configuran igual que en local, pero desde el panel de Environment Variables de Vercel.
