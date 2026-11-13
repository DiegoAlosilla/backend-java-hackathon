---
name: backend-drawio
description: Genera y abre auditorías Draw.io con endpoint, contrato OpenAPI, evidencia y recorrido animado en el fork local.
user-invocable: false
---

# Entrega en Draw.io

Lee [el contrato del CLI](../../docs/audit.md). Usa el `audit.json` del auditor y
la raíz real del servicio. Ejecuta desde el plugin instalado.

El formato predeterminado es **componentes**, con un bloque por participante, conexiones numeradas y reproducción en el orden auditado. Para una solicitud explícita de secuencia, añade `--diagram-type sequence`. Si el usuario pide otro formato, informa las opciones del CLI y acuerda cómo entregarlo.

```powershell
node <plugin>/src/cli.mjs render --repo <servicio> --input <salida>/audit.json --out <salida>/audit.drawio
```

Si el usuario pidió abrirlo, inicia el fork con el comando documentado en el
[README del proyecto](../../README.md) y usa la opción de apertura del CLI.

```powershell
node <plugin>/src/cli.mjs render --repo <servicio> --input <salida>/audit.json --out <salida>/audit.drawio --open --editor-url http://127.0.0.1:8080/
```

Una validación fallida debe corregirse en la evidencia o el modelo de auditoría.
Nunca cambies citas, hashes o el contrato para aparentar una aprobación. Mantén
el diagrama existente si la nueva generación falla.

Comprueba que cada endpoint generado corresponde a método/ruta del contrato y
que el documento contiene el snapshot y las referencias. Si tienes herramientas
de navegador, selecciona el endpoint y revisa contrato, evidencia y reproducción.
Informa por separado si se verificó generación, carga del editor o interacción.

El `.drawio` incluye figuras y conexiones editables para Draw.io original.
Los paneles de contratos/evidencia y la reproducción necesitan la extensión del
fork. La animación representa el recorrido auditado, con sus límites de análisis.
El archivo portable comparte los snapshots y fragmentos que contiene.
