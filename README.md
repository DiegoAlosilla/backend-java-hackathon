# Backend Copilot con auditoría visual

Un agente de entrada en Copilot delega el trabajo backend a especialistas y solicita una revisión independiente antes de entregar. Las auditorías generan un archivo Draw.io con endpoints, contratos OpenAPI y evidencias del código. El editor incluido permite consultar esas evidencias y reproducir el recorrido documentado.

## Componentes

| Componente | Función |
| --- | --- |
| `agents/` | Orquestador, especialistas y revisor |
| `skills/` | Las 15 capacidades backend originales y las capacidades de auditoría visual |
| `src/` | Descubrimiento, verificación de evidencias y generación de archivos Draw.io |
| `editor/` | Fork de Draw.io con Swagger, evidencia y reproducción de flujos |
| `examples/` | Servicio ficticio y entrada reproducible para la demo |

## Usarlo desde Copilot

El editor fijado requiere Node **24.18.x** y npm **11.16.x**. Para preparar y abrir la demo desde PowerShell ejecuta lo siguiente.

```powershell
git clone https://github.com/DiegoAlosilla/backend-java-hackathon.git
cd backend-java-hackathon
npm ci
npm --prefix editor ci
npm --prefix editor run build
npm run editor
```

Con el editor abierto, ejecuta en otra terminal lo siguiente.

```powershell
npm run demo -- --open
```

El primer arranque descarga y verifica Draw.io 32.4.1. El ejemplo genera `runs/demo/account.drawio` y `runs/demo/audit.json`. Selecciona el endpoint para consultar su contrato y usa **Reproducir** en **Evidencia y recorrido**.

[Ejemplos de uso para las 17 habilidades](examples/README.md) · [Diagrama de ejemplo editable](editor/docs/evidence/audit-portable.drawio)

Instala el plugin local siguiendo [la guía de Copilot](docs/copilot.md) y abre el microservicio sobre el que trabajarás. Selecciona `backend-java`.

Para desarrollar y revisar un cambio puedes pedir lo siguiente.

> Implementa este cambio respetando los lineamientos del servicio. Delega contexto, implementación y pruebas en los especialistas que correspondan. Solicita al revisor que contraste el diff, los criterios de aceptación y los reportes actuales. Genera y abre en Draw.io el endpoint afectado con su contrato y evidencia.

Para una auditoría puedes pedir lo siguiente.

> Audita el endpoint GET /accounts/{id}/balance de este microservicio. Identifica su implementación, dependencias, condiciones y errores con evidencia del código. Genera el diagrama en el editor Draw.io del plugin, vincula su contrato y permite recorrer los pasos documentados.

El orquestador conserva el contexto y las decisiones del usuario. Los especialistas devuelven hechos, archivos afectados, validaciones y pendientes. El revisor contrasta esos resultados con los archivos y reportes actuales. La autorización de cambios, commits y entregas sigue el alcance solicitado y las reglas del servicio.

## Auditoría y editor

Los comandos y el formato de entrada están en [la guía del pipeline](docs/audit.md). El arranque, los controles de reproducción y las pruebas de compatibilidad están en [la guía del editor](docs/editor.md).

Cada archivo `.drawio` contiene figuras y conexiones nativas editables. Los contratos y las evidencias se guardan dentro del documento, de modo que compartirlo también comparte esos extractos. El fork interpreta los metadatos para mostrar Swagger, evidencia y reproducción. La animación representa el recorrido documentado a partir del análisis del código.

## Procedencia

La base de agentes, skills y verificación proviene de Backend Copilot Agent. El descubrimiento y la entrega local reutilizan ArchiFlowAgent. El editor se deriva de Draw.io Contracts Local. ArchiFlow sirvió de referencia para el recorrido visual. Las dependencias y el editor Draw.io conservan sus avisos en [THIRD_PARTY_NOTICES.md](editor/THIRD_PARTY_NOTICES.md) y [`editor/licenses/`](editor/licenses/).

Esta integración es un MVP propio. La cobertura del descubrimiento, las verificaciones ejecutadas y las limitaciones comprobadas se detallan en las guías de cada componente.
