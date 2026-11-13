---
name: backend-config-manual
description: Presenta en el chat el delta de configuración compartida por ambiente para traslado manual a Config Maps y Properties.
user-invocable: false
---

# Configuración por ambiente

Detecta configuración/perfiles reales; YAML requiere soporte del proyecto.
Clasifica claves: compartidas, locales, secretos o desconocidas. No traslades
mocks, credenciales ni switches de tests. Secretos son referencias al gestor.

Por clave compartida presenta en chat consumidor, tipo, alta/cambio/baja, valores
DEV/CERT/PROD o pendientes, destino confirmado y prueba de carga efectiva. Si no
cambia config compartida, justifica que no requiere traslado. No crees handoff
ni carpetas de configuración del agente.

Recorrido acordado manual: rama feature de Config Maps, carpeta real del ambiente,
Jenkins que traslada a Properties, despliegue Azure/GitOps. Confirma nombres/rutas
y delivery cuando se necesiten. Prepara delta/checklist sin editar Config Maps/
Properties, ejecutar Jenkins o promover releases. Config del propio servicio se
modifica únicamente dentro del cambio solicitado.

Valores externos faltantes dejan traslado pendiente sin bloquear tests locales
independientes. Al recibir evidencia registra ambiente, SHA origen/destino,
imagen/release y carga efectiva; job verde no demuestra recepción de configuración.
