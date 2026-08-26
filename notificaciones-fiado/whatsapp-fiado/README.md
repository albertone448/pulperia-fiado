# Notificaciones automáticas por WhatsApp - Minisúper El Puente

Este es un programa aparte de la página web. Vive solo en la computadora del súper y manda un WhatsApp automático al cliente cada vez que se le anota un fiado o registra un pago.

**No hay que tocar nada del proyecto web ni de Vercel para esto.** Es 100% independiente.

## Qué necesitás antes de empezar

- La computadora del súper (Windows), la que se queda prendida durante el horario de atención.
- El celular con el número de WhatsApp dedicado (el que "solo sirve para eso").
- Acceso a la consola de Firebase del proyecto (con la cuenta de Google que lo administra).

---

## Paso 1: Instalar Node.js en la computadora del súper

1. Andá a https://nodejs.org
2. Descargá la versión "LTS" (la recomendada, no la más nueva).
3. Instalala con las opciones que vienen por defecto (siguiente, siguiente, siguiente).
4. Para confirmar que quedó instalado, abrí el "Símbolo del sistema" (buscá `cmd` en el menú de inicio) y escribí:

```
node --version
```

Si te muestra un número de versión (ej. `v20.x.x`), ya quedó instalado.

## Paso 2: Sacar la clave de cuenta de servicio de Firebase

Esta es una clave distinta a la que ya usa la página web, con más permisos, así que hay que cuidarla.

1. Andá a https://console.firebase.google.com y entrá al proyecto `pulperia-fiado`.
2. Click en el ícono de engranaje (arriba a la izquierda) > **Project settings**.
3. Andá a la pestaña **Service accounts**.
4. Click en **Generate new private key**, y confirmá.
5. Se descarga un archivo `.json` con un nombre largo tipo `pulperia-fiado-firebase-adminsdk-xxxxx.json`.
6. Guardá ese archivo, lo vas a necesitar en el Paso 4. **Nunca lo compartás ni lo subís a ningún lado público.**

## Paso 3: Copiar el proyecto a la computadora del súper

1. Copiá la carpeta `whatsapp-fiado` (la que te compartí en el ZIP) a la computadora del súper, por ejemplo dentro de `Documentos`.
2. Abrí el "Símbolo del sistema" (`cmd`) y navegá hasta esa carpeta, por ejemplo:

```
cd C:\Users\TU-USUARIO\Documents\whatsapp-fiado
```

3. Instalá las dependencias:

```
npm install
```

Esto se demora un par de minutos la primera vez.

## Paso 4: Configurar las variables de entorno

1. Copiá el archivo `.env.example` y renombralo a `.env` (en Windows: copiar, pegar, y cambiarle el nombre).
2. Copiá el archivo `.json` que descargaste en el Paso 2 dentro de esta misma carpeta, y renombralo a `firebase-credenciales.json` (para que coincida con lo que espera el `.env`).
3. Abrí el `.env` con el Bloc de Notas y completá:

```
FIREBASE_DATABASE_URL=https://tu-proyecto-default-rtdb.firebaseio.com
FIREBASE_CREDENTIALS_PATH=./firebase-credenciales.json
```

(El `FIREBASE_DATABASE_URL` es el mismo `databaseURL` que ya usás en el proyecto web, lo encontrás en el `.env` de esa carpeta o en la consola de Firebase).

## Paso 5: Primer arranque y escaneo del código QR

1. Desde el "Símbolo del sistema", parado en la carpeta `whatsapp-fiado`, corré:

```
npm start
```

2. Va a aparecer un código QR dibujado con caracteres en la misma ventana.
3. En el celular con el número dedicado del súper, abrí WhatsApp > los tres puntos (o Configuración) > **Dispositivos vinculados** > **Vincular un dispositivo**.
4. Escaneá el código QR que salió en la ventana.
5. Debería aparecer el mensaje `Conectado a WhatsApp correctamente.` en la ventana. Con eso ya quedó conectado.

Esta conexión se guarda en una carpeta llamada `auth_info` que se crea sola. Mientras esa carpeta exista, no hay que volver a escanear el QR (salvo que la sesión se cierre desde el celular).

## Paso 6: Probar que funcione

1. Con el programa corriendo (ventana abierta con `npm start`), entrá a la página web normal del sistema de fiado.
2. Anotale una compra de prueba a un cliente que tenga teléfono cargado (puede ser tu propio número, para probar).
3. En unos segundos debería llegarte el WhatsApp automático.
4. Revisá la ventana del "Símbolo del sistema", debería decir algo como `Mensaje enviado a [nombre] (50688881234)`.

Si algo falla, la ventana va a mostrar el error ahí mismo, pero el programa no se detiene, sigue esperando la siguiente transacción.

## Paso 7: Que arranque solo cuando se prende la computadora

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

3. Parado en la carpeta `whatsapp-fiado`, arrancá el programa con PM2 (en vez de `npm start`):

```
pm2 start index.js --name whatsapp-fiado
```

4. Guardá esta configuración para que sobreviva a un reinicio:

```
pm2 save
```

Con esto, la próxima vez que se prenda la computadora del súper, el servicio va a arrancar solo, sin que nadie tenga que abrir nada.

### Comandos útiles de PM2 (por si hace falta revisar algo después)

```
pm2 list                  # ver si está corriendo
pm2 logs whatsapp-fiado   # ver los mensajes/errores en vivo
pm2 restart whatsapp-fiado
pm2 stop whatsapp-fiado
```

---

## Preguntas frecuentes

**¿Qué pasa si la compu está apagada?**
Simplemente no se manda ningún WhatsApp en ese rato. Como la página tampoco se usa si la compu está apagada, no hay ningún fiado que notificar de todas formas.

**¿Qué pasa si un cliente no tiene teléfono guardado?**
No se le manda nada, y no genera ningún error. El sistema sigue funcionando normal para el resto.

**¿Qué pasa si falla el envío de un mensaje puntual?**
Se anota el error en los logs (`pm2 logs whatsapp-fiado`), pero el programa sigue corriendo y sigue esperando la próxima transacción. Esto es un extra, si un mensaje no llega no afecta nada de lo demás.

**¿Qué pasa si la sesión de WhatsApp se desconecta?**
Va a aparecer en los logs un mensaje de que se cerró la sesión y hay que volver a escanear el QR. Si eso pasa, hay que correr `pm2 logs whatsapp-fiado` (o entrar directo con `npm start` para ver el QR en pantalla), volver a vincular el dispositivo, y ya sigue funcionando.

**¿Hay que tocar algo en la laptop donde tenés GitHub y Vercel?**
No, nada. Este servicio es completamente aparte, solo vive en la compu del súper, y solo necesita que la base de datos de Firebase sea la misma (que ya lo es).
