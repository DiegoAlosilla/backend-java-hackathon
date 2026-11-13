---
name: backend-implementacion
description: Implementa cambios Java autorizados en Quarkus o Spring respetando arquitectura, convenciones y regresiones del servicio.
user-invocable: false
---

# Implementación Java

Parte del plan/aceptación. Para corregir reproduce el defecto con prueba pertinente
antes del arreglo cuando sea viable. Preserva cambios previos y toca solo rutas
necesarias. Mantén dependencias entre capas/puertos/adaptadores, librerías, manejo
de errores y convenciones; no migres arquitectura como efecto lateral.

Respeta cabeceras/atribución exigidas sin inventar autores/organizaciones. Evita
capturas genéricas que oculten causas, bloquear flujos reactivos, timeouts
arbitrarios y logs sensibles. Maneja recursos, vacíos y excepciones con semántica
contractual. Reutiliza referencias solo si son compatibles con el servicio.

Itera con tests pertinentes y revisa diff/estilo. Coordina contrato, HTTP, Kafka
y configuración con sus skills. No crees scripts ni expedientes auxiliares.
Devuelve causa atendida, cambios y resultados al orquestador; el arreglo sigue
pendiente hasta la calidad aplicable.
