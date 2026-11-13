---
name: backend-errores-http
description: Diagnostica y corrige traducciones Business a HTTP en UX/Channel, incluida ausencia de negocio con 204 sin contenido.
user-invocable: false
---

# Traducción Business → UX

Obtén condición exacta: endpoint, HTTP Business, código/payload o excepción y regla
del contrato/desarrollador. Traza REST client, decoding, response exception mapper,
service/use case, mapper global y Resource/Controller. En Mutiny revisa recovery
y preservación de causa.

Reproduce con respuesta real sanitizada y fixture/stub. Determina dónde se pierde
la condición y corrige el punto coherente con el repo. No conviertas todo 404,
NotFoundException o Exception en 204. Auth, timeout, 5xx, payload inválido y errores
de otros orígenes conservan mapeo contractual. Coordina contrato si cambia interfaz.

En 204 verifica status y cero bytes en el límite HTTP, no solo entidad null en
unitarias. Cubre ausencia reconocida, datos encontrados y errores vecinos;
`{}`, `[]` o JSON `null` no son ausencia de cuerpo. Conserva observabilidad/headers.

Decide tests fallidos según aceptación, no descartándolos como desactualizados.
Sin señal real de Business, entrega hipótesis o corrección defensiva con su
límite; no declares resuelto el incidente sin evidencia representativa.
