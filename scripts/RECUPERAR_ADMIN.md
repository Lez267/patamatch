# Restablecer la contraseña del administrador de producción

Esta herramienta solo permite restablecer `patamatchadmin@gmail.com`, si existe como ADMIN activo en la base indicada. No cambia el rol ni borra el usuario, mascotas o solicitudes. Cambia su hash de contraseña mediante Better Auth y cierra sus sesiones anteriores dentro de una transacción.

Desde la carpeta del proyecto, ejecutar:

```bash
npm run admin:reset-password
```

Pegar la conexión PostgreSQL de la base de producción de Neon al recibir la pregunta oculta. Se puede obtener en Connect del proyecto correcto; debe contener `sslmode=require`. La herramienta no utiliza automáticamente la base local ni carga `.env`. Verificar que la conexión corresponde a la misma base y rama que usa Vercel.

Introducir una contraseña nueva de al menos 16 caracteres, con mayúsculas, minúsculas, números y símbolos, sin secuencias numéricas ni fechas de nacimiento. Repetirla y confirmar escribiendo el correo exacto. Las entradas secretas no se muestran ni se pasan como argumentos de proceso; no pegarlas en chats, capturas ni comandos del historial. No ejecutar con `bash -x`, grabación de terminal o diagnóstico de shell activado.

Al finalizar, iniciar sesión en Vercel con el mismo correo y la nueva contraseña. No hace falta desplegar el proyecto para que el cambio de base tenga efecto. No elimina credenciales guardadas en navegadores: actualizar la contraseña guardada manualmente si procede.

Si el usuario no existe, no es ADMIN activo o no tiene un único Account de tipo credential, se detiene sin crear usuarios ni elevar permisos. Los errores de conexión no imprimen la conexión privada. Si se corta la conexión al confirmar la transacción, verificar el acceso antes de repetir: puede haber ambigüedad de confirmación, como en cualquier operación remota.

No se ha ejecutado esta herramienta sobre Neon durante su preparación. Sus pruebas utilizan datos simulados y no realizan conexiones remotas.
