---
name: backend-contexto
description: Identifica arquitectura, flujos, contratos y puntos de cambio de un microservicio Java para el diagnóstico inicial del orquestador.
user-invocable: false
---

# Contexto del microservicio

Lee instrucciones del repo y diff inicial. Recupera memoria, revisa su vigencia
y relee el flujo afectado, incluidos archivos nuevos, eliminados o sin commit.
Coordina toolchain con backend-entorno.

Identifica POM padre/módulos, framework/versiones, Java requerido, contrato fuente,
generador/rutas derivadas, tests/runners, perfiles y configuración real. Deduce
arquitectura por imports/dependencias, no solo por nombres de paquetes.

Traza entrada → caso de uso/service → cliente/repositorio → salida con rutas y
símbolos reales. Distingue UX/Channel de Business y enumera HTTP, Kafka, Redis y
BD únicamente con evidencia. Revisa patrones y tests representativos existentes.
Acota exploración al objetivo y amplía cuando una dependencia lo justifique.

Devuelve en el chat flujo, puntos de intervención, comandos, convenciones y
lagunas. Mermaid en el chat puede aclarar el recorrido. No crees mapas, perfiles
ni carpetas en el servicio sin petición expresa de documentación/contextualización.
