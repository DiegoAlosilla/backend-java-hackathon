---
name: backend-auditoria
description: Audita endpoints Java y sus dependencias con citas verificables para diagramas Draw.io y revisión de cambios.
user-invocable: false
---

# Auditoría desde Copilot

Lee [el contrato de auditoría](../../docs/audit.md) antes de producir el JSON.
Resuelve la raíz del plugin desde este SKILL.md y la raíz del microservicio desde
el encargo. Usa Node del host para el CLI del plugin. El razonamiento se realiza
en la sesión Copilot elegida.

1. Ejecuta `node <plugin>/src/cli.mjs discover --repo <servicio> --out <salida>/inventory.json`.
2. Lee el inventario y las fuentes. Recorre los endpoints solicitados hacia
   clientes HTTP, cachés, persistencia y eventos. Registra condiciones, errores,
   llamadas y retornos con sus citas. El descubrimiento inicial delimita cobertura.
3. Genera `<salida>/audit.json` con `repositoryFingerprint` del inventario, hashes
   de cada fuente citada, intervalos de líneas y fragmentos literales vigentes.
   Vincula el contrato por su archivo y hash. Usa IDs estables por endpoint y
   dependencia, y referencias válidas en cada paso.
4. Para revisar un cambio, consulta el diff contra la base indicada y las fuentes
   completas. Relaciona hallazgos con líneas y pruebas/reportes recibidos. Declara
   cuándo un hallazgo es preexistente o su origen todavía no está demostrado.
5. Devuelve el JSON, la cobertura y el tipo de diagrama al orquestador. Usa componentes por defecto y respeta el tipo explícito que pida el usuario. Conserva un ID por componente y el orden de las interacciones, incluidos retornos, publicaciones y escrituras en caché cuando el código los respalde.

Guarda las salidas solicitadas fuera del microservicio, por defecto en
`<plugin>/runs/<servicio>-<fecha-hora>/`. El auditor puede ejecutar descubrimiento
y validación del plugin. Los scripts del servicio solo se ejecutan cuando el
pedido incluye esa validación y el orquestador la asigna.

Cada afirmación concreta necesita evidencia. Conserva variables de configuración
sin resolver cuando el valor vive fuera del repositorio. PostgreSQL por sí solo
no determina proveedor ni despliegue. Declara entradas sin resolver y caminos
no revisados. Un quote válido demuestra su existencia, y el revisor debe evaluar
si respalda la interpretación. Si las fuentes cambian, repite descubrimiento y
revisa la auditoría antes de publicar.
