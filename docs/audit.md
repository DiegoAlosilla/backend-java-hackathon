# Auditoría desde Copilot

El agente analiza Java/Jakarta REST y produce JSON con citas de archivos. El CLI valida identidad del endpoint, contrato, hashes y citas antes de generar un archivo Draw.io nativo. La interpretación semántica del agente requiere revisión. La animación representa los pasos declarados en la auditoría.

## Preparar

Desde la raíz del MVP, ejecutar `npm ci`, `npm --prefix editor ci` y `npm --prefix editor run build`. El último comando prepara el núcleo de contratos compartido con el editor. El editor fijado requiere Node 24.18.x y npm 11.16.x.

## Descubrir y renderizar

```powershell
node src/cli.mjs discover --repo 'C:/repos/mi-servicio' --out runs/servicio/inventory.json
node src/cli.mjs render --repo 'C:/repos/mi-servicio' --input runs/servicio/audit.json --out runs/servicio/audit.drawio
```

Copilot utiliza `inventory.json` para identificar entradas, archivos y sus hashes. Escribe `audit.json` siguiendo el ejemplo generado por `npm run demo` en `runs/demo/audit.json`. El auditor debe leer las fuentes antes de completar las afirmaciones.

El objeto raíz contiene `version: 1`, `service`, `repositoryFingerprint` tomado del inventario y `endpoints`. Cada endpoint contiene `id`, `method` en mayúsculas, `path`, `title`, `contract`, `evidence`, `dependencies`, `steps` y `findings`.

- `contract` contiene `file` relativo al repositorio y `sha256` de los bytes UTF-8. El snapshot original se incorpora al archivo. Se reutiliza el validador de OpenAPI 3.0/3.1 y Swagger 2 del fork.
- Cada evidencia contiene `file`, `sha256`, `startLine`, `endLine`, `quote` y `claim`. Las líneas comienzan en 1 y son inclusivas. La cita debe existir dentro del intervalo. Se requiere evidencia del handler Java.
- Cada dependencia contiene `id`, `label`, `kind` (`api`, `cache`, `database`, `event` o `service`) y `evidence`.
- Cada paso contiene `from` y `to` con IDs del endpoint o sus dependencias, `direction` (`request` o `response`), `label` y `evidence`.
- Cada hallazgo contiene `severity` (`info`, `warning` o `error`), `claim` y `evidence`.

Los IDs comienzan por letra y contienen letras ASCII, números, `_` o `-`. Los arrays `dependencies`, `steps` y `findings` admiten vacío. El validador rechaza entradas duplicadas, operaciones ausentes del contrato, citas inexistentes, fuentes externas y evidencia obsoleta. Una modificación posterior requiere repetir descubrimiento y revisión.

## Abrir en el fork

```powershell
npm run editor
# En otra terminal
npm run demo -- --open
```

También se puede añadir `--open --editor-url http://127.0.0.1:8080/` a `render`. El puente local espera confirmación de carga del editor, después termina. Guardar desde la ventana descarga la copia editada. Si el editor está cerrado, el `.drawio` ya generado queda disponible para abrir manualmente.

El archivo usa figuras, conectores y etiquetas nativos y un snapshot de contrato por API/revisión. Los atributos `auditEvidence` y `auditFlow` son extensiones del fork. Draw.io original muestra el diagrama y permite editarlo. Los controles de evidencia, Swagger y animación requieren la extensión.

## Alcance

El descubrimiento reutiliza el CST de ArchiFlowAgent para Jakarta REST con rutas literales y contratos YAML locales. Las rutas dinámicas, herencia compleja y otros frameworks quedan indicados como límites. Los resultados de tests se acreditan con el verificador backend y sus reportes reales. El ejemplo de auditoría incluido muestra evidencia estática y no atribuye pruebas a la animación.

El CLI conserva la salida anterior si falla validación y escribe el resultado de forma atómica. Los análisis se guardan fuera del microservicio. La CLI no ejecuta código del repositorio auditado.
