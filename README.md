# PataMatch · Aplicación local

Para publicar la demo por GitHub y la web de Vercel, sin instalar Vercel CLI, consulta [DESPLIEGUE_VERCEL.md](DESPLIEGUE_VERCEL.md). El despliegue necesita PostgreSQL remoto; subir el repositorio no sube la base local.

Aplicación funcional para la presentación de Diseño de Interfaces de Usuario. Los mockups originales de Jorge-Interfaces se conservaron sin cambios. Esta aplicación es un proyecto nuevo e independiente.

## Abrir en esta computadora

La aplicación está preparada para abrirse en **http://localhost:3000**.

Si se cerró el servidor o se reinició la computadora, abre una terminal en esta carpeta y ejecuta:

```bash
bash INICIAR.sh
```

También puedes ejecutar `npm run local`. Mantén esa terminal abierta durante la presentación. Para detener el servidor web, presiona Ctrl+C. Vuelve a ejecutar el mismo comando para abrirlo otra vez. Si hay un servidor de PataMatch ya abierto en el puerto 3000, usa esa instancia y evita abrir una segunda.

El iniciador configura PostgreSQL privado en el puerto **55432**, crea la base `patamatch`, genera Prisma y agrega los datos iniciales que falten. Los cambios existentes, las solicitudes y los favoritos se conservan. Usa una compilación de producción si existe; en caso contrario inicia el modo de desarrollo.

Los puertos PostgreSQL 5432 y 5433 que ya existían en la computadora no se modifican. El servidor privado solo escucha en 127.0.0.1. La base de datos se guarda en `.local/postgres/`. No borres esa carpeta si quieres conservar lo capturado.

## Entrar y presentar

En la pantalla inicial hay cuatro accesos de demostración. Cada botón inicia una sesión real con su cuenta correspondiente. También puedes abrir el acceso por correo y contraseña:

| Perfil | Correo |
| --- | --- |
| Adoptante | adoptante@patamatch.local |
| Refugio | refugio@patamatch.local |
| Veterinario | veterinario@patamatch.local |
| Administrador | admin@patamatch.local |

Contraseña de las cuatro cuentas de demostración: **PataMatch2026!**

Guion sugerido para una presentación de 8–12 minutos:

1. Entra como adoptante y recorre el catálogo. Prueba la búsqueda, los filtros y los favoritos.
2. Abre el test y recorre sus tres pasos. Las respuestas del perfil inicial ya están completas; puedes modificarlas. El borrador se conserva en el navegador y el perfil final en PostgreSQL.
3. Abre una mascota y explica sus siete factores de compatibilidad. Los porcentajes se calculan con el perfil guardado.
4. Envía una solicitud para una mascota disponible. Usa un teléfono ficticio de 10 dígitos y una motivación de al menos 30 caracteres. Confirma los compromisos del formulario. En Mis adopciones aparecerán folio y seguimiento. Si Canela ya tiene una solicitud de demostración, muestra su seguimiento o elige otra mascota.
5. Cambia al perfil de refugio desde el botón de sesión. Abre Solicitudes, despliega la solicitud y avanza su estado. La aprobación reserva la mascota; completar la adopción cambia su publicación a adoptada. Un rechazo requiere motivo.
6. Vuelve al adoptante para mostrar el cambio guardado. Para mostrar el registro del refugio, publica una mascota con el formulario de tres pasos y una foto predefinida o propia.
7. Entra como veterinario, consulta un expediente y registra una revisión con su próximo seguimiento. Revisa la agenda y la exportación CSV.
8. Entra como administrador y muestra las cuentas, la moderación de publicaciones y la resolución de reportes. Puedes desactivar y reactivar cuentas distintas a la propia.

En teléfonos se muestra navegación inferior; en escritorio se muestra barra lateral. Los controles tienen etiquetas, estados de selección y foco visible. Las fotografías y las tipografías se sirven desde esta aplicación, por lo que la demostración no necesita descargar recursos de Internet.

## Qué está implementado

- Portada con video local de un gato, imagen alternativa durante la carga, pausa/reproducción y respeto por movimiento reducido. El video se pausa al ocultar la pestaña o abrir un diálogo.
- Sesiones y contraseñas con Better Auth; roles y permisos comprobados en el servidor.
- Catálogo con búsqueda, filtros, orden y favoritos persistentes.
- Test de estilo de vida de tres pasos, perfil guardado y borrador recuperable.
- Matching por reglas de convivencia y puntuación ponderada explicable.
- Exploración manual mediante swipe, botones y regreso a la mascota anterior.
- Fichas de mascota, solicitudes con folio, prevención de duplicados y seguimiento.
- Panel de refugio con registro, edición, publicación y pausa de mascotas, solicitudes y entrevistas.
- Fotografías JPEG/PNG/WebP de hasta 2 MiB; las propias se guardan en la base como datos de imagen para esta versión local.
- Panel veterinario con expedientes, registros clínicos y próximas revisiones.
- Panel de administración con cuentas, catálogo, reportes y acciones persistentes.
- Estadísticas calculadas a partir de los datos; exportaciones CSV en los paneles.
- Perfil del adoptante y factores de compatibilidad conservados al enviar cada solicitud, visibles para su refugio responsable.
- Comprobante digital basado en la solicitud y la ficha actual, con datos reales de salud, impresión, cierre con Escape y navegación por teclado.
- Notificaciones accesibles como enlaces y lecturas guardadas por usuario en el navegador.

## Algoritmo y decisiones de esta versión

Los filtros consideran permiso de vivienda rentada, espacio para mascotas grandes, niños, otras mascotas, alergias y requisitos especiales. Los cuidados altos y la falta de experiencia envían a revisión manual; no excluyen automáticamente. Las restricciones de raza son reglas académicas del proyecto, no una clasificación legal.

El score tiene siete factores con coincidencia 0, 50 o 100: temperamento 25%, energía/disponibilidad 20%, especie 15%, tamaño 15%, edad 10%, experiencia 10% y ubicación 5%. La ciudad se compara normalizando mayúsculas, espacios y acentos; no se calcula distancia geográfica. El presupuesto es informativo. El resultado ayuda a explorar y el refugio decide sobre la solicitud.

La solicitud avanza por enviada → en revisión → entrevista → visita → aprobada → adopción completada. El refugio puede rechazar con motivo; el adoptante puede cancelar procesos activos. Los estados finales no se reabren. Los estados de mascota en proceso/adoptada se gestionan mediante sus solicitudes.

## Desarrollo y comprobaciones

Tecnologías: Next.js, React, TypeScript, Three.js, PostgreSQL, Prisma, Better Auth y Zod. Las versiones exactas están registradas en `package-lock.json`. Los estilos propios conservan la paleta salvia, bosque y miel, con Fraunces y Plus Jakarta Sans.

La portada actual reproduce `public/videos/video-gato.mp4` y usa `video-gato-poster.jpg` como imagen de respaldo. Ambos recursos se sirven localmente. Los componentes experimentales de Three.js permanecen en el proyecto, pero no están montados en la portada; no representan las funciones disponibles en la entrega. El modelo conservado tiene sus créditos en `public/models/ATTRIBUTION.md`.

La autenticación y las acciones aceptan únicamente orígenes explícitos. Para añadir otra dirección de la red local, configura `BETTER_AUTH_TRUSTED_ORIGINS` con sus orígenes completos separados por comas y reinicia el servidor. `BETTER_AUTH_URL` establece la dirección principal. Nunca se autoriza automáticamente el Origin o Host de una petición. La política de nuevas contraseñas se comparte entre formulario y servidor; las cuentas demo existentes conservan su acceso.

No se puede retirar el rol de un refugio con mascotas registradas ni cambiar el de un adoptante con solicitudes activas. Las responsabilidades deben concluir o transferirse antes de cambiar permisos; esta versión no incluye una pantalla de transferencia.

```bash
npm run check
npm test
npm run build
```

Con el servidor local encendido:

```bash
npm run verify:demo
```

La verificación de integración comprueba el acceso de los cuatro roles, orígenes externos, registro, política de contraseña, protección de roles, privacidad del test, favoritos, solicitudes, transiciones y expediente. Respeta las respuestas 429 y Retry-After de autenticación, con reintentos limitados. Crea datos temporales identificados por un UUID y limpia únicamente esos registros al terminar. Informa el total de comprobaciones realizadas.

Para verificar otra instancia local: `PATAMATCH_BASE_URL=http://localhost:3001 npm run verify:demo`. Esa instancia debe usar su propia dirección en `BETTER_AUTH_URL`.

Para editar la aplicación usa `npm run setup` y después `npm run dev`. Cuando termines los cambios, ejecuta `npm run build`; el próximo `npm run local` utilizará esa compilación.

La estructura principal es `src/components/` para interfaces, `src/lib/` para tipos, matching, sesión y operaciones, `src/app/api/` para rutas del servidor, `prisma/` para modelo y datos iniciales, `tests/` para reglas y `public/` para recursos locales.

## Llevar a otra computadora

El archivo ZIP de entrega contiene el código, los recursos y el archivo de dependencias; excluye datos privados locales, secretos, dependencias instaladas y compilaciones. Para prepararlo en otro equipo se necesita Node.js 22 y PostgreSQL con `initdb`, `pg_ctl`, `psql` y `createdb` disponibles. Ejecuta `npm ci`, `npm run setup`, `npm run build` y `npm run local` desde la carpeta extraída. La primera preparación requiere Internet; después la demo funciona localmente.

El archivo `.env` se genera con un secreto aleatorio. Puedes usar `.env.example` como referencia para conectar otra base PostgreSQL.

## Alcance posterior

Esta entrega está preparada para demostración local con datos ficticios. Para un despliegue público se deben separar las cuentas demo, implementar alta y verificación de refugios, recuperación de cuentas, almacenamiento persistente de fotografías, notificaciones, asignaciones de veterinarios, respaldo/restauración, políticas de datos y configuración de producción. El envío de solicitudes no manda correos ni contacta refugios reales. Las entrevistas representan una etapa del proceso; la agenda veterinaria sí muestra las fechas capturadas en sus expedientes. No se implementó modo PWA instalable/offline.

## Recursos visuales

Las fotografías ilustran personajes ficticios. Fuentes de descarga usadas en esta demostración académica:

- Canela: https://images.dog.ceo/breeds/german-shepherd/n02106662_16014.jpg
- Rocky: https://images.dog.ceo/breeds/pitbull/dog-5437227_640.jpg
- Luna: https://cdn2.thecatapi.com/images/9tk.jpg
- Mimi: https://cdn2.thecatapi.com/images/Dqtad3dGZ.jpg
- Toby: https://images.dog.ceo/breeds/havanese/00100trportrait_00100_burst20191112123933390_cover.jpg
- Coco: https://images.dog.ceo/breeds/retriever-golden/n02099601_10.jpg

Fraunces y Plus Jakarta Sans se incluyen localmente con sus licencias en `public/fonts/OFL.txt`. Antes de publicar comercialmente, sustituye las fotografías de demostración por imágenes propias o con permisos apropiados.
