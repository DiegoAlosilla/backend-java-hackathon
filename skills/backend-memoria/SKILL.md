---
name: backend-memoria
description: Reutiliza entorno y contexto entre ejecuciones fuera del microservicio y escribe documentación técnica solo cuando se solicita expresamente.
user-invocable: false
---

# Contexto sin ensuciar el servicio

`CONTEXTO_BACKEND` es contexto lógico reutilizable, no una variable de proceso
que sobreviva por sí sola a un chat nuevo. Separa preferencias/rutas del host,
hechos por servicio y estado temporal. Identifica repos por raíz normalizada y
remote, sin mezclar proyectos/hosts. Sanitiza URLs de remotes: nunca persistas
credenciales incrustadas ni parámetros sensibles.

Usa memoria nativa si existe: usuario para toolchain/preferencias, repositorio
para hechos del servicio y sesión para plan/avances/validaciones/acción pendiente.
`/memories/` son rutas virtuales de esa herramienta; no las crees en el proyecto
ni supongas que existen en disco.

Sin persistencia nativa, usa un único archivo personal
`~/.copilot/backend-java-context.md` fuera del servicio con herramientas de lectura/
edición. Conserva secciones de otros repos; guarda entorno, convenciones y estado
breve útil, sin logs/expedientes por fase. No copies el archivo al plugin ni lo
distribuyas. Si no puedes escribir fuera, conserva contexto en chat e informa
que no persistirá entre chats; no crees fallback dentro del microservicio.

Lee antes de reutilizar, relee código afectado y actualiza solo entradas invalidadas.
Registra fecha/origen/confirmado-detectado-pendiente. No guardes tokens, contraseñas,
contenido de settings o payloads de clientes. No guardes aprobación para commits
futuros: solo propuesta aprobada vigente de esta tarea; al reanudar compara diff/checks.

Conserva un checkpoint de sesión con alcance y matriz AC, fase/siguiente acción,
archivos y diff propios/previos, comandos/reportes vigentes y bloqueos. Si se usó
el verificador distribuido, referencia su evidencia externa; no copies reportes
ni stdout al contexto. Recuperar memoria no ejecuta checks: contrasta fuentes,
contrato, política y entorno antes de reutilizar resultados. Un cambio relevante
invalida aceptación/gates afectados. Nunca persistas un resultado pendiente como
aprobado ni una aprobación de commits como autorización permanente.

## Documentación expresa

«Documenta este microservicio» o «crea su contexto técnico» autoriza artefactos.
«Revisa», «audita» o «usa este contexto» no los autoriza. Reutiliza ubicación
documental o pregunta destino antes de crear otra. Incluye flujo/arquitectura,
fuentes/rutas, dependencias, contratos, comandos y lagunas; Mermaid si aporta.
Actualiza por delta, sin datos personales, perfiles de ejecución ni scripts.

Al cerrar resume plan→resultado, tests, decisiones, configuración y siguiente
acción en chat/memoria. No publiques mapas/bitácoras automáticamente.
[Memoria de VS Code](https://code.visualstudio.com/docs/agents/run/memory).
