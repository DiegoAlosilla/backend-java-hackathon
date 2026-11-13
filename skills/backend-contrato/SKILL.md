---
name: backend-contrato
description: Comprueba y modifica contratos HTTP o schemas de eventos antes de regenerar interfaces en cambios autorizados.
user-invocable: false
---

# Contrato primero

Localiza fuente, dueño, generador/configuración y rutas derivadas. Comprueba
request/response, status, media types, required y consumidores afectados.
Si la interfaz esperada ya existe, explica que es corrección de implementación.

Si cambia interfaz, modifica la fuente autorizada y usa la generación existente
con el entorno elegido. Revisa diff/compatibilidad; no edites clases derivadas
manualmente ni actualices generator/dependencias sin necesidad del cambio.

Si la fuente vive en un repo inaccesible, presenta delta/dependencia en chat
y continúa tareas independientes; no simules generación. Para eventos revisa
evolución de schema/consumidores por separado de HTTP. Un response 204 no declara
un objeto vacío como contenido.

Entrega fuente modificada/no requerida, comando, resultado y compatibilidad
verificada o pendiente. Compilar no demuestra compatibilidad semántica.
