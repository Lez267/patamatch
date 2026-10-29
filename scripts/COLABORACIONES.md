# Colaboraciones entre refugios y veterinarios

## Flujo

1. Administración asigna el rol VETERINARIO a la cuenta profesional registrada. No se crean cuentas ni se cambian roles al invitar.
2. En Veterinario → Mis refugios el profesional completa ciudad, área de atención y presentación opcional. Debe elegir y guardar su disponibilidad para publicar nombre, correo y estos datos ante los refugios registrados. No es una verificación de cédula profesional.
3. En Refugio → Veterinarios se busca por nombre, correo, ciudad o área y se envía una solicitud con mensaje. El destinatario recibe la solicitud en su pantalla y notificaciones internas.
4. Solo el veterinario destinatario puede aceptar o rechazar. Antes de aceptar no recibe mascotas ni expedientes de ese refugio. Puede colaborar con varios refugios y cada refugio con varios veterinarios.
5. Tras aceptar, Resumen y Mis refugios agrupan sus pacientes por refugio. Expedientes y agenda se limitan a colaboraciones activas, incluyendo las mascotas pausadas del refugio para no interrumpir su cuidado.
6. El refugio puede cancelar una solicitud pendiente; ambas partes pueden finalizar colaboraciones. Se conservan atenciones y autoría, pero se retira acceso veterinario. El refugio conserva lectura de su historial en Veterinarios. Ocultarse del directorio solo impide nuevas solicitudes.
7. Suspender una cuenta o cambiar su rol finaliza sus colaboraciones y oculta su disponibilidad. Reactivarla no restituye accesos antiguos: se requiere una nueva solicitud y aceptación. Las sesiones se revocan al cambiar roles o suspender.

Usar Actualizar o volver a enfocar la ventana para recibir cambios de otro dispositivo. No hay correo automático ni conexión en tiempo real.

## Base local y Neon

La migración `20261029120000_veterinary_collaborations` es aditiva: crea VeterinaryProfile, Collaboration, AuditEvent y el enum de estados. No borra usuarios, mascotas, solicitudes ni registros médicos. No asigna colaboradores automáticamente ni publica correos existentes por defecto. Los veterinarios existentes deberán activar disponibilidad y aceptar solicitudes para recuperar acceso clínico bajo el nuevo modelo.

En una base gestionada con las migraciones existentes:

```bash
npm run db:migrate
```

Este comando usa DIRECT_URL antes que DATABASE_URL. Revisar el destino configurado antes de ejecutarlo. No pegar conexiones en chats ni comandos del historial. Para Neon, ejecutar con las variables del proyecto de producción en un entorno privado; no reemplazar por error la conexión local.

Vercel tiene `buildCommand: npm run build:vercel`: al desplegar este código aplica automáticamente las migraciones pendientes mediante el comando anterior, antes de compilar. El código nuevo requiere estas tablas; no desplegar saltándose la migración. Si la migración inicial ya está aplicada, solo se añade la nueva. Si Neon tiene tablas creadas por `db push` pero no historial, detenerse y revisar el baseline; no resetear la base ni marcar migraciones a ciegas.

No se requieren servicios nuevos, nuevas claves de correo ni otra base. No ejecutar seed, reset, db push con accept-data-loss ni importaciones para esta actualización. El iniciador local existente usa db push y conserva los datos; la migración versionada se usa para producción y bases con historial.

## Bitácora

Administración → Bitácora muestra los últimos 200 eventos con responsable, rol, cuenta o colaboración afectada, fecha y estados anteriores/nuevos. Incluye cambios de rol, suspensiones/reactivaciones y solicitudes/respuestas/finalizaciones. El evento se guarda en la misma transacción del cambio: si falla, tampoco se confirma el cambio.

No contiene contraseñas, tokens, mensajes clínicos ni conexiones. No hay comandos de edición/borrado de bitácora en la aplicación. No reconstruye eventos anteriores ni captura SQL directo en Neon. Es una bitácora de aplicación, no un registro inalterable ante quien administra directamente PostgreSQL. No se incorporó eliminación definitiva de cuentas.

## Validación local

`npm test` ejecuta las pruebas unitarias y omite la integración de base por defecto. Para incluir PostgreSQL real, con la base privada local activa:

```bash
PATAMATCH_LOCAL_DB_TESTS=1 npm test
```

La integración exige host 127.0.0.1, puerto 55432 y base patamatch. Crea un esquema temporal de nombre aleatorio, aplica las migraciones versionadas desde cero y crea solo allí los datos ficticios. Verifica aceptación, aislamiento entre refugios y veterinarios, acceso clínico, cierre de colaboración, conservación de atenciones, rollback transaccional, suspensión, revocación de sesiones, cambios de rol y auditoría. Elimina exclusivamente ese esquema temporal al finalizar. Nunca se ejecuta sobre Neon.

## Tarjetas y contacto del consultorio

El profesional puede añadir nombre del consultorio y teléfono opcionales desde Mis refugios. El teléfono admite de 10 a 15 dígitos con espacios, paréntesis, guiones y lada internacional; no admite extensiones. El directorio los publica solo mientras la cuenta esté activa y disponible. Las tarjetas muestran identidad, área, ciudad, correo y teléfono; si falta información indican No especificado o No publicado, sin inventarla. Correo y teléfono abren el cliente de correo o llamada al activarlos.

La migración aditiva `20261029130000_veterinary_contact` añade clinicName y phone con valor vacío por defecto, sin modificar los datos ya capturados. La integración local aplica las tres migraciones desde cero y comprueba su persistencia. Vercel también debe aplicar esta migración al actualizar.

## Fechas del historial clínico

Cada atención conserva el identificador del responsable, la fecha de atención indicada y createdAt generado por la base al capturarla. Las vistas de Refugio y Expedientes muestran por separado responsable, fecha de atención y fecha/hora de captura, expresada en America/Mexico_City. La hora de captura no equivale a la hora real de la consulta. El formulario actual solo solicita el día de atención: no se inventa una hora para consultas anteriores ni se permite que el cliente sustituya createdAt. No se alteran los registros existentes.
