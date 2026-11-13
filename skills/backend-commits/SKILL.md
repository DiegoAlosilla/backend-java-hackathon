---
name: backend-commits
description: Propone commits atómicos con archivos, mensajes y validaciones, y espera aprobación de la agrupación antes de crearlos.
user-invocable: false
---

# Agrupación revisable y aprobación

Inspecciona rama, base real y diff staged/unstaged; separa cambios propios/previos.
No asumas develop. Usa Git nativo `diff --stat`, `diff --numstat` y `log` con base
pertinente. Incluye tests, generados/docs autorizados sin ocultar volumen ni score
inventado; volumen por commit y diff neto de PR son métricas distintas.

Propón grupos con orden, propósito, archivos/hunks, mensaje, validación y
dependencias. Que cada grupo sea revisable y compile, con tests junto a funcionalidad.
Delimita hunks propios en archivos compartidos; no separes para manipular métricas.

Convención: `type(scope): JIRA-TICKET message`, inglés/presente simple, ≤72 caracteres.
Usa ticket real o pregunta si es obligatorio y falta. Objetivo 1–2 commits;
>4 amerita revisar tamaño. Promedio <15 archivos y <100 líneas por commit;
PR ≤50 líneas ideal, 51–300 aceptable y >300 invita a evaluar separación.
Son métricas de revisión, no gates funcionales; no fracciones un cambio coherente.

Presenta propuesta concreta y pregunta en chat: «¿Apruebas esta agrupación de
commits o deseas cambiarla?». Espera antes de stage/commit aunque al inicio se
haya pedido hacer commits. Reutiliza aprobación de los mismos grupos sin cambios
sustanciales. Cancelación, silencio o login no aprueban la propuesta.

Tras aprobación verifica calidad vigente, matriz AC y evidencia contra el diff
actual. Si cambiaron insumos,
revalida antes de crear los commits; aprobar grupos no aprueba gates fallidos.
Después selecciona rutas/hunks explícitos y revisa staged. No uses `git add .`,
incluyas staged ajeno ni lo alteres. Si la
selección se mezcla con trabajo previo, consulta cómo resolverlo antes del commit.
Crea commits autorizados y confirma SHA/contenido. No reescribas historia publicada.

Push/PR requieren alcance adicional; aprobación de agrupación no publica. Usa
backend-entorno para acceso/host. PR respeta plantilla y mínimo tres revisores
reales del equipo; consúltalos si faltan. No despliegues por este flujo.
Entrega propuesta/acciones, métricas, calidad y pendientes; el diff puede probarse
y revisarse antes de aprobar commits.
