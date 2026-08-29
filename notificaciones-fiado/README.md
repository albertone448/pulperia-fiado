# Notificaciones automáticas - Minisúper El Puente

Este es un programa aparte de la página web. Vive solo en la computadora del súper y manda un aviso automático al cliente cada vez que se le anota un fiado o registra un pago, por WhatsApp, por correo, o por ambos, según lo que tenga configurado cada cliente.

**No hay que tocar nada del proyecto web ni de Vercel para esto.** Es 100% independiente.

> Esta carpeta se llamaba `whatsapp-fiado`. Se renombró a `notificaciones-fiado` porque ahora también manda correos, no solo WhatsApp.

## Cómo decide qué mandarle a cada cliente

Cada cliente tiene, en la página web (dentro de "Editar datos del cliente"), dos casillas independientes:

- **Avisar por WhatsApp**: solo se puede activar si el cliente tiene teléfono guardado.
- **Avisar por correo**: solo se puede activar si el cliente tiene correo guardado.

Un cliente puede tener las dos activadas, una sola, o ninguna. Si tiene teléfono guardado pero la casilla de WhatsApp está apagada, no se le manda WhatsApp aunque tenga el número. Lo mismo aplica al correo.

## Los mensajes

Cada compra o pago genera un recibo corto (cliente, fecha, monto y saldo pendiente), con el mismo contenido por WhatsApp y por correo, aunque con formato distinto: por WhatsApp sale en un bloque de texto alineado en columnas, y por correo sale con una cabecera de color y una tabla.

Además, una vez por semana se manda un recordatorio de saldo pendiente a todo cliente que deba algo (sin importar si está suspendido o no), con el mismo formato de recibo, mostrando las últimas 5 transacciones y el saldo total. Si un cliente no debe nada, no recibe nada.

Por defecto se manda los **sábados a las 4:00am** (configurable con `RECORDATORIO_DIA_SEMANA` y `RECORDATORIO_HORA` en el `.env`, ver `.env.example`). El programa no depende de que la computadora esté encendida exactamente a esa hora: revisa "¿ya pasó la hora que toca y todavía no mandé el de esta semana?" apenas arranca, y de ahí en adelante cada hora. Si la compu estuvo apagada justo a las 4am por cualquier motivo, lo manda en cuanto se prenda (aunque sea más tarde ese mismo día), y si nunca se prende ese día, simplemente espera al sábado siguiente sin mandar nada atrasado.

## Qué necesitás antes de empezar

- La computadora del súper (Windows), la que se queda prendida durante el horario de atención.
- El celular con el número de WhatsApp dedicado (el que "solo sirve para eso").
- Acceso a la consola de Firebase del proyecto (con la cuenta de Google que lo administra).
- Si vas a usar el correo: una cuenta de correo (Gmail, por ejemplo) con verificación en dos pasos activada, para poder generar una "contraseña de aplicación".

---

## Instalación desde cero

Si ya tenías `whatsapp-fiado` corriendo y solo querés agregarle el correo, saltate a la sección **"Actualizar una instalación existente"** más abajo.

### Paso 1: Instalar Node.js en la computadora del súper

1. Andá a https://nodejs.org
2. Descargá la versión "LTS" (la recomendada, no la más nueva).
3. Instalala con las opciones que vienen por defecto (siguiente, siguiente, siguiente).
4. Para confirmar que quedó instalado, abrí el "Símbolo del sistema" (buscá `cmd` en el menú de inicio) y escribí:

```
node --version
```

Si te muestra un número de versión (ej. `v20.x.x`), ya quedó instalado.

### Paso 2: Sacar la clave de cuenta de servicio de Firebase

Esta es una clave distinta a la que ya usa la página web, con más permisos, así que hay que cuidarla.

1. Andá a https://console.firebase.google.com y entrá al proyecto `pulperia-fiado`.
2. Click en el ícono de engranaje (arriba a la izquierda) > **Project settings**.
3. Andá a la pestaña **Service accounts**.
4. Click en **Generate new private key**, y confirmá.
5. Se descarga un archivo `.json` con un nombre largo tipo `pulperia-fiado-firebase-adminsdk-xxxxx.json`.
6. Guardá ese archivo, lo vas a necesitar en el Paso 4. **Nunca lo compartás ni lo subís a ningún lado público.**

### Paso 3: Copiar el proyecto a la computadora del súper

1. Copiá la carpeta `notificaciones-fiado` (la que te compartí en el ZIP) a la computadora del súper, por ejemplo dentro de `Documentos`.
2. Abrí el "Símbolo del sistema" (`cmd`) y navegá hasta esa carpeta, por ejemplo:

```
cd C:\Users\TU-USUARIO\Documents\notificaciones-fiado
```

3. Instalá las dependencias:

```
npm install
```

Esto se demora un par de minutos la primera vez.

### Paso 4: Configurar las variables de entorno

1. Copiá el archivo `.env.example` y renombralo a `.env` (en Windows: copiar, pegar, y cambiarle el nombre).
2. Copiá el archivo `.json` que descargaste en el Paso 2 dentro de esta misma carpeta, y renombralo a `firebase-credenciales.json` (para que coincida con lo que espera el `.env`).
3. Abrí el `.env` con el Bloc de Notas y completá:

```
FIREBASE_DATABASE_URL=https://tu-proyecto-default-rtdb.firebaseio.com
FIREBASE_CREDENTIALS_PATH=./firebase-credenciales.json
```

(El `FIREBASE_DATABASE_URL` es el mismo `databaseURL` que ya usás en el proyecto web, lo encontrás en el `.env` de esa carpeta o en la consola de Firebase).

4. Si vas a usar el correo, completá también las variables de SMTP. Ver la sección **"Configurar el envío de correo"** más abajo. Si no las completás, el programa igual funciona, solo que no manda correos (como si ningún cliente tuviera esa casilla activada).

### Paso 5: Primer arranque y escaneo del código QR

1. Desde el "Símbolo del sistema", parado en la carpeta `notificaciones-fiado`, corré:

```
npm start
```

2. Va a aparecer un código QR dibujado con caracteres en la misma ventana.
3. En el celular con el número dedicado del súper, abrí WhatsApp > los tres puntos (o Configuración) > **Dispositivos vinculados** > **Vincular un dispositivo**.
4. Escaneá el código QR que salió en la ventana.
5. Debería aparecer el mensaje `Conectado a WhatsApp correctamente.` en la ventana. Con eso ya quedó conectado.

Esta conexión se guarda en una carpeta llamada `auth_info` que se crea sola. Mientras esa carpeta exista, no hay que volver a escanear el QR (salvo que la sesión se cierre desde el celular).

### Paso 6: Probar que funcione

1. Con el programa corriendo (ventana abierta con `npm start`), entrá a la página web normal del sistema de fiado.
2. Anotale una compra de prueba a un cliente que tenga teléfono o correo cargado y la casilla correspondiente activada (puede ser tu propio número o correo, para probar).
3. En unos segundos debería llegarte el aviso.
4. Revisá la ventana del "Símbolo del sistema", debería decir algo como `WhatsApp enviado a [nombre] (50688881234)` o `Correo enviado a [nombre] (correo@ejemplo.com)`.

Si algo falla, la ventana va a mostrar el error ahí mismo, pero el programa no se detiene, sigue esperando la siguiente transacción.

### Paso 7: Que arranque solo cuando se prende la computadora

Por ahora, cada vez que se prende la compu del súper, alguien tendría que abrir el "Símbolo del sistema" y correr `npm start` a mano. Para automatizarlo, usamos **PM2**, que mantiene el programa corriendo en segundo plano (sin ventana visible) y lo reinicia solo si llegara a fallar.

1. Instalá PM2 de forma global:

```
npm install -g pm2
npm install -g pm2-windows-startup
```

2. Configurá que PM2 se enganche al arranque de Windows:

```
pm2-startup install
```

3. Parado en la carpeta `notificaciones-fiado`, arrancá el programa con PM2 (en vez de `npm start`):

```
pm2 start index.js --name notificaciones-fiado
```

4. Guardá esta configuración para que sobreviva a un reinicio:

```
pm2 save
```

Con esto, la próxima vez que se prenda la computadora del súper, el servicio va a arrancar solo, sin que nadie tenga que abrir nada.

### Comandos útiles de PM2 (por si hace falta revisar algo después)

```
pm2 list                        # ver si está corriendo
pm2 logs notificaciones-fiado   # ver los mensajes/errores en vivo
pm2 restart notificaciones-fiado
pm2 stop notificaciones-fiado
```

---

## Actualizar una instalación existente

Si ya tenías `whatsapp-fiado` corriendo con PM2 y solo querés subir esta versión con correo, no hace falta repetir todo desde cero. Los pasos son:

1. En la computadora del súper, detené el proceso viejo:

```
pm2 stop whatsapp-fiado
```

2. En la carpeta del proyecto, reemplazá `index.js`, `package.json`, `.env.example` y `README.md` por los nuevos que te compartí. **No toques** `.env`, `firebase-credenciales.json`, ni la carpeta `auth_info`: ahí está la sesión de WhatsApp ya vinculada y las credenciales, no hace falta tocarlos.

3. Si también renombraste la carpeta de `whatsapp-fiado` a `notificaciones-fiado`, mové el contenido a la carpeta con el nombre nuevo (los archivos `.env`, `firebase-credenciales.json` y `auth_info` se mueven junto con todo lo demás).

4. Instalá la dependencia nueva (nodemailer, para mandar correos):

```
npm install
```

5. Abrí el `.env` existente con el Bloc de Notas y agregale, al final, las variables de SMTP (ver la sección de abajo). No hace falta borrar lo que ya tenía.

6. Borrá el proceso viejo de PM2 y arrancá el nuevo con el nombre actualizado:

```
pm2 delete whatsapp-fiado
pm2 start index.js --name notificaciones-fiado
pm2 save
```

7. Confirmá que quedó bien:

```
pm2 logs notificaciones-fiado
```

No hace falta volver a escanear el código QR de WhatsApp: como la carpeta `auth_info` no se tocó, la sesión sigue conectada igual que antes.

### Actualización puntual: recibos con formato y recordatorio semanal

Si ya tenías la versión con WhatsApp + correo corriendo (la carpeta ya se llama `notificaciones-fiado`) y solo estás subiendo el cambio de los mensajes tipo recibo y el recordatorio semanal, es más simple todavía, **no hay ninguna dependencia nueva que instalar**:

1. `pm2 stop notificaciones-fiado`
2. Reemplazá únicamente `index.js` y `.env.example` por los nuevos (`package.json` no cambió).
3. Si querés cambiar el día/hora del recordatorio semanal del valor por defecto (sábado 4am), agregá al `.env` existente:

```
RECORDATORIO_DIA_SEMANA=6
RECORDATORIO_HORA=4
```

Si no las agregás, el programa usa esos mismos valores por defecto de todas formas.

4. `pm2 restart notificaciones-fiado`
5. Confirmá con `pm2 logs notificaciones-fiado` que dice `Conectado a WhatsApp correctamente.` y no hay errores.

No hace falta tocar nada en Firebase: el programa crea solo, la primera vez que corre el chequeo semanal, un dato nuevo en la base (`configuracion/recordatorioSemanal/ultimoEnviado`) para llevar la cuenta de cuándo mandó el último recordatorio. Como este programa usa la clave de administrador (no las reglas normales de lectura/escritura), no hace falta cambiar ninguna regla de seguridad para que pueda escribir ahí.

---

## Configurar el envío de correo

El correo se manda por SMTP con una **contraseña de aplicación**, no con tu contraseña normal de correo. Con Gmail, por ejemplo:

1. Entrá a https://myaccount.google.com/security con la cuenta de Gmail que va a mandar los correos.
2. Activá la **Verificación en dos pasos** si todavía no la tenés activada (es un requisito para poder generar contraseñas de aplicación).
3. Buscá **Contraseñas de aplicaciones** (dentro de la misma sección de seguridad), creá una nueva (podés nombrarla "Fiado" o algo así), y copiá el código de 16 caracteres que te da.
4. En el `.env`, completá:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-correo@gmail.com
SMTP_PASS=la-contraseña-de-16-caracteres-que-copiaste
SMTP_FROM="Minisúper El Puente <tu-correo@gmail.com>"
```

Si usás otro proveedor de correo en vez de Gmail (Outlook, Zoho, un correo de tu propio dominio, etc.), cambiá `SMTP_HOST` y `SMTP_PORT` por los datos SMTP que te dé ese proveedor; el resto funciona igual.

**Si dejás `SMTP_HOST` vacío o sin completar, el programa arranca igual y sigue mandando WhatsApp con normalidad; simplemente no manda ningún correo** hasta que completes esas variables.

---

## Preguntas frecuentes

**¿Qué pasa si la compu está apagada?**
Simplemente no se manda ningún aviso en ese rato. Como la página tampoco se usa si la compu está apagada, no hay ningún fiado que notificar de todas formas.

**¿Qué pasa si un cliente no tiene teléfono ni correo guardado, o tiene las casillas de notificación apagadas?**
No se le manda nada, y no genera ningún error. El sistema sigue funcionando normal para el resto.

**¿Qué pasa si falla el envío de un mensaje o correo puntual?**
Se anota el error en los logs (`pm2 logs notificaciones-fiado`), pero el programa sigue corriendo y sigue esperando la próxima transacción. El WhatsApp y el correo son independientes entre sí: si uno falla, el otro se intenta igual.

**¿Qué pasa si la sesión de WhatsApp se desconecta?**
Va a aparecer en los logs un mensaje de que se cerró la sesión y hay que volver a escanear el QR. Si eso pasa, hay que correr `pm2 logs notificaciones-fiado` (o entrar directo con `npm start` para ver el QR en pantalla), volver a vincular el dispositivo, y ya sigue funcionando. Esto no afecta el envío de correos, que sigue funcionando aparte.

**¿Hay que tocar algo en la laptop donde tenés GitHub y Vercel?**
No, nada. Este servicio es completamente aparte, solo vive en la compu del súper, y solo necesita que la base de datos de Firebase sea la misma (que ya lo es).

**¿Qué pasa si cambio el día/hora del recordatorio semanal en el `.env` después de que ya se mandó uno esa semana?**
Se aplica desde la próxima revisión: si el nuevo horario todavía no pasó esta semana, espera a que pase (no manda uno extra de inmediato); si el nuevo horario ya pasó esta semana y no coincide con el último enviado, lo manda en la siguiente revisión (dentro de la próxima hora, como máximo).
