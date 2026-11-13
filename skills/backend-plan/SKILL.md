---
name: backend-plan
description: Presenta hipótesis, aceptación, impacto, ejecución y validaciones antes de los cambios del flujo backend-java.
user-invocable: false
---

# Plan visible antes de ejecutar

Siempre presenta el plan en el chat, también en soporte/auditoría. Separa hechos
de sospechas y señala información pendiente que pueda cambiar el enfoque.
Define resultado observable, aceptación y alcance autorizado.

Reutiliza la especificación/contrato existente y asigna ids AC estables a los
criterios del pedido. Mantén una matriz en chat: id, requisito y fuente,
comportamiento observable, prueba/archivo previsto y evidencia/estado. Incluye
regresión, errores vecinos y límites pertinentes; una ambigüedad funcional queda
pendiente de respuesta, no se resuelve suponiendo aceptación. Actualiza la matriz
con resultados durante la ejecución sin cambiar el requisito para hacerla pasar.

Incluye tabla breve de ruta/símbolo, cambio, motivo y prueba. Marca archivos
propuestos como nuevos. Planifica contrato/generación si cambia interfaz, lógica,
unitarias, componente, configuración manual y calidad; justifica lo no aplicable.

Explica: «La ejecución implica <cambios>, <pruebas>, <build y gates> y una propuesta
de commits agrupados para tu aprobación». Incluye riesgos/dependencias y cómo
separar fallos previos del defecto. No promete tiempos ni añade mejoras ajenas.

Presenta el plan y procede con modificaciones ya solicitadas. Una auditoría
autoriza análisis: entrega diagnóstico/plan y espera solicitud de implementar.
Una decisión funcional ambigua requiere respuesta antes del cambio dependiente;
continúa trabajo independiente. Actualiza el plan cuando cambie la evidencia.
Al cerrar cada fase conserva siguiente acción, bloqueos y evidencia vigente en
el checkpoint de sesión definido por el agente; reanudar exige contrastar el diff.

No crees plan.md ni carpetas auxiliares. La aprobación de agrupación se pide
al entregar el diff y sus validaciones concretas, no al iniciar el trabajo.
