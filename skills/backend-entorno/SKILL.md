---
name: backend-entorno
description: Detecta y reutiliza Java, Maven, settings y rutas corporativas, y atiende bloqueos de autenticación durante el flujo backend-java.
user-invocable: false
---

# Entorno reutilizable

1. Recupera contexto con [memoria](../backend-memoria/SKILL.md). Identifica
   raíz/remote y host de ejecución. Distingue requisitos del POM de versiones
   instaladas; no presupongas JDK 21 ni Maven 3.9.9.
2. Lee POM padre/módulos, wrapper y configuración pertinente del editor. Consulta
   `java -version` y `mvn -version` o wrapper existente, sin instalar nada.
   No descargues un wrapper no provisionado sin confirmar acceso/entorno.
   Maven informa el JDK efectivo, que puede diferir del JDK del editor.
3. Deduce rutas del entorno, configuración y `.m2`, sin recorrer todo el disco.
   No muestres credenciales de settings. `settings.xml`, settings globales,
   repositorio local Maven y `repository.xml` corporativo son datos distintos.
   Para este último confirma función y consumo del build; no inventes un flag.
4. Si falta contexto decisivo, muestra lo detectado y pregunta en el chat:
   «Detecté <framework>, JDK requerido <versión> y Maven efectivo <versión>.
   ¿Qué rutas de JDK/Maven, settings.xml, repository.xml u otras referencias
   corporativas debo considerar?». Omite datos ya confirmados. Si el entorno es
   viable y no hay ambigüedad, informa la selección y avanza. Conserva también
   la respuesta de que no hay overrides; no repitas la pregunta por fase.
5. Mantén `CONTEXTO_BACKEND` como contexto lógico compartido: host, raíz/remote,
   JDK requerido/efectivo/ruta, Maven o wrapper/ruta/versión, settings usuario y
   globales, repositorio local, XML corporativo/función, perfiles/comandos/reportes
   y rutas entregadas. Cada dato lleva origen, fecha y confirmado/detectado/pendiente.
   Persiste lo útil sin secretos según memoria, fuera del microservicio.
6. Aplica selecciones a todos los comandos. Precedencia: elección explícita,
   wrapper compatible del repo, entorno vigente. Usa `-s "<settings.xml>"`,
   `-gs "<settings-global.xml>"` y `-Dmaven.repo.local="<ruta>"` solo cuando
   correspondan a lo confirmado. Selecciona JDK/Maven en el proceso/terminal,
   sin cambiar globalmente el equipo. Respeta sintaxis y rutas con espacios.

Revalida la entrada afectada al cambiar host, ruta, POM/wrapper o fallar el
entorno. Preferencias globales no reemplazan requisitos de cada repositorio.

## GitHub y sesión expirada

Usa el host real del remote, incluido Enterprise. Separa autenticación, permisos/
SSO, red/VPN y certificados; no atribuyas todo 403 a expiración. Si `gh` existe
y el flujo lo usa, comprueba `gh auth status --active --hostname <host>` sin tokens.
Git, Copilot y Maven pueden usar credenciales distintas; validar uno no valida otros.

Cuando requiere login, entrega `gh auth login --hostname <host> --web` para que
el desarrollador lo ejecute en su consola y complete Chrome según su configuración.
Si Git/Copilot usa otro mecanismo, indica el login del cliente correspondiente.
No instales `gh` por esa incidencia, cambies protocolos, fuerces Chrome como
predeterminado ni pidas tokens/cookies en el chat. SSO puede requerir autorización
adicional del banco.

Conserva acción, rama, cambios propios y checks vigentes en chat/memoria de sesión;
avanza localmente cuando sea independiente. Tras confirmación, comprueba acceso
y reanuda. Antes de repetir una publicación verifica si ya ocurrió. No repitas
login/intentos idénticos sin cambio de condiciones.
[Login por navegador](https://cli.github.com/manual/gh_auth_login).
