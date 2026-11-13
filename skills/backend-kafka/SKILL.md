---
name: backend-kafka
description: Revisa e implementa cambios Java de eventos Kafka y valida schemas, entrega y manejo de fallos cuando ese transporte existe en el flujo.
user-invocable: false
---

# Kafka

Confirma con POM/código framework, conector y versiones; no deduzcas transporte
por nombres de integración. Revisa schema/payload, clave, headers, topic/config y
consumidores. Coordina interfaz con backend-contrato.

Productor: distingue confirmación del broker de procesamiento consumidor.
Consumidor: revisa ack/nack, reintentos, duplicados/idempotencia, orden y DLQ
según requisito; no prometas exactly-once de negocio.

Usa dependencias/tests aprobados: stub, in-memory o broker test. No impongas
Docker/Testcontainers si no están habilitados. Explica semántica validada y
límites sin infraestructura; compilar no prueba entrega del evento.
Config externa se atiende con backend-config-manual, sin editar jobs por iniciativa.
