# Sistema de Fiado — Minisúper El Puente

Aplicación web para llevar el control del crédito informal ("fiado") en una pulpería familiar en Costa Rica, reemplazando el clásico cuaderno de anotaciones en papel por un sistema digital simple, con trazabilidad completa y pensado para que lo use gente sin experiencia técnica.

## El problema

En una pulpería de barrio es común que los clientes de confianza se lleven productos y los paguen después. Tradicionalmente esto se anota en un cuaderno físico, con los problemas de siempre: se puede perder, es difícil de auditar, no hay control de límites por cliente y no queda registro claro de quién anotó qué.

Este proyecto digitaliza ese flujo manteniendo la misma simplicidad operativa del cuaderno, pero agregando control de límites de crédito, trazabilidad por persona, reportes y estadísticas.

## Funcionalidades principales

- **Clientes**: alta con nombre, teléfono opcional y límite de crédito editable (50,000 colones por defecto). Los clientes nunca se eliminan, solo se editan, para preservar el historial completo.
- **Registro de compras a crédito (fiado)** y **pagos**, estos últimos divisibles entre varios métodos (efectivo, tarjeta, SINPE) dentro de una misma transacción.
- **Control de límite de crédito con margen de tolerancia**: además del límite configurado por cliente, se permite un margen del 5% antes de bloquear la operación de verdad. Por debajo del límite no hay aviso; entre el límite y el límite+5% se muestra una alerta pero se permite guardar; por encima de ese margen la operación queda bloqueada. Esta validación aplica tanto al registrar una compra nueva como al editar una existente.
- **Historial editable con trazabilidad**: cada transacción registra quién la creó y, si se modifica, quién la editó y cuándo.
- **Perfiles con PIN**: en vez de una cuenta por persona, hay un único login para la tienda y perfiles internos (nombre + PIN de 4 dígitos) para identificar quién hizo cada acción, con cierre automático de perfil tras 5 minutos de inactividad.
- **Resumen del día**: totales de fiado y de pagos por método, con selector de fecha, para cuadrar caja.
- **Estadísticas**: ranking de clientes con deuda pendiente, con un selector para ordenar por distintos criterios (tiempo sin pagar, tiempo sin dejar la cuenta en cero), pensado para agregar más criterios fácilmente en el futuro. También incluye estadísticas individuales por cliente (total histórico fiado, total pagado, última vez que la cuenta quedó en cero, etc.).
- **Impresión y envío por WhatsApp**: tanto el resumen del día como el detalle de un cliente se pueden imprimir en una impresora térmica de 80mm, o copiar como texto formateado para compartir manualmente por WhatsApp.

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

### 2. [`whatsapp-fiado/`](./whatsapp-fiado) — Notificador de WhatsApp

Un programa de Node.js **completamente aparte**, que no se ejecuta como parte de esta aplicación ni está desplegado en Vercel. Corre de forma local en la computadora de la tienda, escucha directamente los cambios en la misma base de datos de Firebase (usando credenciales de administrador) y envía un mensaje de WhatsApp automático al cliente cuando se le registra una compra o un pago.

No hay integración a nivel de código entre ambos: comparten únicamente la base de datos de Firebase como punto de contacto. Ver [`whatsapp-fiado/README.md`](./whatsapp-fiado/README.md) para el detalle completo de cómo funciona y cómo se instala.

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
│   ├── utils/             # Lógica de negocio pura: cálculo de deudas, tickets, fechas
│   ├── firebase.js        # Inicialización de Firebase a partir de variables de entorno
│   ├── App.jsx             # Enrutamiento de alto nivel, sesión, perfiles e inactividad
│   └── index.css           # Estilos globales
├── whatsapp-fiado/         # Componente independiente (ver sección de arriba)
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
