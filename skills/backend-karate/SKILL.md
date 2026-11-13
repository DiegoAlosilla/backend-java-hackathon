---
name: backend-karate
description: Crea y ejecuta escenarios Karate de componente/HTTP usando runners, perfiles, mocks y reportes reales del microservicio.
user-invocable: false
---

# Karate de componente

Detecta versión, runner, perfil, tags, karate-config, mocks y reportes. No asumas
que Maven ejecuta Karate ni instales otra versión. Si hay otra suite de componente,
informa la alternativa sin afirmar Karate aprobado. Si es gate obligatorio y
falta runner/infraestructura, déjalo pendiente y consulta la decisión necesaria.

Usa stubs deterministas para reproducir flujo. Verifica status, payload/schema,
headers pertinentes y errores vecinos. Un 500 inesperado falla aunque haya
conectividad. En 204 comprueba vacío con assertions compatibles y bytes HTTP
cuando haga falta.

Ejecuta runner descubierto con entorno confirmado y lee reportes actuales:
escenarios descubiertos/ejecutados/fallidos/omitidos. Cero escenarios o compilar
el runner no demuestran comportamiento. Sin infraestructura conserva escenarios
y reporta ejecución pendiente. Mock unitario no acredita límite HTTP.
Usa rutas normales de tests/reportes, sin un runtime de pruebas del agente.
