# Fiado - Mini Super

Sistema de fiado para la pulpería. React + Vite + Firebase Realtime Database, hospedado gratis en Vercel.

## Paso 1: Crear el proyecto en Firebase

1. Andá a https://console.firebase.google.com y entrá con la cuenta de Google que va a administrar el proyecto.
2. Click en "Agregar proyecto" (o "Add project"). Ponele un nombre, por ejemplo `pulperia-fiado`.
3. Podés desactivar Google Analytics, no hace falta para este proyecto.
4. Esperá a que se cree y entrá al panel del proyecto.

## Paso 2: Activar Authentication (el login único)

1. En el menú de la izquierda, entrá a **Build > Authentication**.
2. Click en "Get started".
3. En la pestaña "Sign-in method", activá el proveedor **Correo electrónico/contraseña** (Email/Password).
4. Andá a la pestaña "Users" y click en "Add user".
5. Ahí creás el único usuario que va a existir, por ejemplo:
   - Correo: `minisuper@fiado.app` (no tiene que ser un correo real, Firebase no lo verifica)
   - Contraseña: la que ustedes quieran usar para entrar
6. Guardá ese correo y contraseña en un lugar seguro, es lo que van a usar para entrar a la página.

## Paso 3: Activar Realtime Database

1. En el menú de la izquierda, entrá a **Build > Realtime Database**.
2. Click en "Create Database".
3. Elegí la ubicación (cualquiera cercana está bien, ej. `us-central1`).
4. Cuando pregunte por las reglas de seguridad, elegí "Start in locked mode" (empezar bloqueado).
5. Una vez creada, andá a la pestaña "Rules" y reemplazá el contenido por esto:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

Esto dice: solo alguien que haya iniciado sesión (con el correo y contraseña del Paso 2) puede leer o escribir datos. Click en "Publish" para guardar.

## Paso 4: Obtener las claves de configuración

1. Andá al ícono de engranaje (arriba a la izquierda) > **Project settings**.
2. Bajá hasta "Your apps" y click en el ícono `</>` (Web app).
3. Ponele un apodo, ej. `pulperia-web`, y click en "Register app". No hace falta marcar lo de Firebase Hosting.
4. Firebase te va a mostrar un bloque de código con un objeto `firebaseConfig`. Ahí están todos los valores que necesitás:
   - `apiKey`
   - `authDomain`
   - `databaseURL`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

Guardá esos valores, los vas a necesitar en el Paso 6.

## Paso 5: Subir el código a GitHub

1. Si no tenés cuenta en GitHub, creála en https://github.com
2. Creá un repositorio nuevo (puede ser privado), por ejemplo `pulperia-fiado`.
3. Descomprimí el ZIP de este proyecto en tu computadora.
4. Abrí una terminal dentro de esa carpeta y corré:

```bash
git init
git add .
git commit -m "Primera version del sistema de fiado"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/pulperia-fiado.git
git push -u origin main
```

(Cambiá `TU-USUARIO` por tu usuario de GitHub, y el nombre del repo si le pusiste otro).

## Paso 6: Desplegar en Vercel

1. Andá a https://vercel.com y entrá con tu cuenta de GitHub.
2. Click en "Add New" > "Project".
3. Elegí el repositorio `pulperia-fiado` que acabás de subir.
4. Vercel detecta solo que es un proyecto de Vite, no hace falta cambiar nada en "Build settings".
5. Antes de hacer click en "Deploy", abrí la sección "Environment Variables" y agregá una por una las 7 variables, usando los valores que sacaste del Paso 4:

| Nombre | Valor |
|---|---|
| `VITE_FIREBASE_API_KEY` | el `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | el `authDomain` |
| `VITE_FIREBASE_DATABASE_URL` | el `databaseURL` |
| `VITE_FIREBASE_PROJECT_ID` | el `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | el `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | el `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | el `appId` |

6. Click en "Deploy". En un par de minutos te da un link, algo como `pulperia-fiado.vercel.app`.

Ese link es el que van a usar todos los días en la caja. Podés guardarlo como acceso directo en el escritorio o como marcador en el navegador.

## Paso 7: Primer uso

1. Entrá al link que te dio Vercel.
2. Iniciá sesión con el correo y contraseña que creaste en el Paso 2.
3. Te va a pedir "¿Quién sos?". Click en "Nuevo perfil" y creá el primero (tu nombre y un PIN de 4 números).
4. Repetí para cada persona que atienda la caja.
5. Ya podés empezar a crear clientes y anotar fiado.

## Desarrollo local (opcional)

Si querés correr el proyecto en tu computadora antes de subirlo:

```bash
npm install
cp .env.example .env
# completá el archivo .env con los valores del Paso 4
npm run dev
```

## Cómo funciona por dentro (resumen)

- **Login**: un solo usuario de Firebase Authentication protege toda la base de datos. Nadie sin ese correo y contraseña puede leer ni escribir nada.
- **Perfiles**: dentro de la app, cada persona (vos, tu mamá, etc.) tiene un perfil con nombre y PIN de 4 números. Esto no es seguridad, es solo para saber quién anotó cada transacción. Después de 30 minutos sin usar la página, pide el PIN de nuevo.
- **Clientes**: nombre, teléfono opcional, y un límite de crédito editable (50,000 por defecto). Si un cliente se pasa del límite, la app muestra una alerta pero no bloquea la operación, la decisión la toma la persona en caja.
- **Transacciones**: cada fiado o pago queda guardado con fecha y hora de Costa Rica, quién lo anotó, y si se editó, quién lo editó y cuándo.
- **Resumen del día**: junta todos los movimientos de una fecha (por defecto hoy) y separa cuánto se fió y cuánto entró por cada método de pago, para que cuadrar la caja en la noche sea más fácil.
