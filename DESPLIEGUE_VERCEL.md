# Publicar la demo en Vercel desde GitHub

No se necesita Vercel CLI ni un token. La autorización de GitHub/Vercel y la creación de Neon se realizan en sus páginas oficiales por el propietario. No compartas contraseñas, tokens ni cadenas de conexión en el chat o en el repositorio.

## 1. Subir el código

Ejecuta desde esta carpeta:

```bash
git status --short
git add .
git commit -m "Preparar demo para Vercel y PostgreSQL remoto"
git push origin main
```

El repositorio configurado es `https://github.com/Lez267/patamatch.git`. Si GitHub solicita acceso, complétalo tú; no publiques credenciales. No uses `--force`. No se ejecutaron estos comandos automáticamente.

`.env*`, `.local/`, `.vercel/`, dependencias y compilaciones están excluidos. Solo `.env.example` se incluye como plantilla. No subas una copia de la base local ni datos personales para esta demo.

## 2. Crear una base nueva en Neon

En [Neon Console](https://console.neon.tech/), crea un proyecto PostgreSQL dedicado a esta demostración. Guarda dos conexiones de la misma base:

- **Pooled:** contiene `-pooler` en el servidor. Será `DATABASE_URL` en Vercel.
- **Direct:** sin `-pooler`. Será `DIRECT_URL` para migraciones.

Conserva `sslmode=require` en ambas. No se cambia el PostgreSQL de tu computadora. Para reutilizar una base que ya contiene tablas se debe planificar su baseline; no apliques esta migración inicial sobre tablas existentes ni restablezcas la base para resolver un error.

## 3. Importar en Vercel

1. En [Vercel](https://vercel.com/new), entra con tu cuenta e importa `Lez267/patamatch`.
2. Selecciona **Next.js**. Como el repositorio empieza en la carpeta de la aplicación, deja **Root Directory** en `./`.
3. Añade las variables siguientes al entorno **Production** antes de pulsar Deploy:

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | Conexión pooled de Neon. |
| `DIRECT_URL` | Conexión directa de la misma base Neon. |
| `BETTER_AUTH_SECRET` | Secreto privado aleatorio de al menos 32 caracteres. |

Puedes generar el secreto en tu terminal, sin instalar nada:

```bash
openssl rand -hex 32
```

Copia el resultado únicamente al campo de Vercel. No lo incluyas en un comando de Git, archivo rastreado o mensaje.

La URL de autenticación se obtiene del dominio de producción mediante las variables de sistema de Vercel. Mantén habilitada su exposición automática. Para un dominio elegido manualmente, puedes definir `BETTER_AUTH_URL=https://tu-dominio` sin ruta. Los dominios adicionales deben añadirse expresamente a `BETTER_AUTH_TRUSTED_ORIGINS`, separados por comas; nunca uses comodines ni direcciones locales en la nube.

`vercel.json` ejecuta `npm run build:vercel`: genera Prisma, aplica las migraciones pendientes y compila Next.js. No ejecuta la siembra ni el iniciador de PostgreSQL local. Si falla una migración, el despliegue falla sin intentar borrar o reiniciar la base.

No asignes esta misma base a Preview. Deja previews sin variables de base hasta disponer de una base o rama de Neon separada; no se deben ejecutar migraciones de pruebas sobre producción.

## 4. Cargar los datos ficticios una sola vez

Tras crear las tablas mediante el primer despliegue, la aplicación permite registrarse pero el catálogo estará vacío. La base nueva necesita sus cuentas de refugio/veterinario/administración y mascotas ficticias.

En la carpeta del proyecto crea **`.env.cloud.local`**, no `.env`, con un editor local:

```dotenv
DATABASE_URL="CONEXION_POOLED_DE_NEON"
DIRECT_URL="CONEXION_DIRECTA_DE_LA_MISMA_BASE"
PATAMATCH_SEED_PASSWORD="TU_CONTRASENA_PRIVADA"
```

La contraseña debe tener al menos 16 caracteres, mayúsculas, minúsculas, número y símbolo, sin secuencias ni fechas. No uses la contraseña conocida de la demo local. Protege el archivo y ejecuta con las dependencias ya disponibles:

```bash
chmod 600 .env.cloud.local
npm run db:seed:cloud
```

El comando rechaza una conexión local, exige TLS y comprueba que no haya usuarios existentes antes de sembrar. No reemplaza contraseñas o datos preexistentes; no es una herramienta de restauración. Si falla o la base ya tenía usuarios, detente y revisa el caso antes de repetirlo.

Accede en la web con los correos de demostración del README y la contraseña privada configurada. Compártela solo con los participantes de la prueba. En Vercel no aparece el acceso de un clic; ocultarlo no sustituye usar contraseñas diferentes de las publicadas en el código. `PATAMATCH_SEED_PASSWORD` no hace falta en las variables de la aplicación alojada.

## 5. Probar entre tres dispositivos

- Abre la URL de producción de Vercel en cada dispositivo, aunque estén en redes distintas.
- Entra como adoptante en uno, refugio en otro y veterinario en el tercero.
- Envía una solicitud de una mascota disponible y revisa su seguimiento desde el refugio.
- Los cambios se guardan en la misma base remota. Si no aparecen de inmediato en otro dispositivo, recarga la vista o vuelve a enfocar su pestaña: todavía no hay sincronización por WebSocket.
- Verifica favoritos, cierre de sesión y persistencia después de recargar. Usa datos ficticios.

La demostración sigue teniendo fotografías codificadas en PostgreSQL y no incluye correo transaccional, respaldos configurados, verificación de refugios ni limitación de accesos distribuida. Es una demo de evaluación, no un servicio listo para datos reales. Antes de un lanzamiento público se requiere otra revisión de producción.

Referencias: [Prisma 6 en Vercel](https://www.prisma.io/docs/orm/v6/prisma-client/deployment/serverless/deploy-to-vercel), [variables de sistema de Vercel](https://vercel.com/docs/environment-variables/system-environment-variables), [integración Neon/Vercel](https://neon.com/docs/guides/vercel-overview).
