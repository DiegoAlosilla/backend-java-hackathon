---
name: backend-sanity
description: Comprueba salud y escenarios funcionales mínimos en un entorno autorizado como complemento de las suites del servicio.
user-invocable: false
---

# Sanity

Deduce URL/perfil o pregunta por ambiente ambiguo. Define esperado de health y
escenario funcional antes de ejecutarlos; health y downstream son distintos.
Reutiliza procesos/comandos existentes, sin scripts de arranque ni dependencias
que el servicio no usa. Registra procesos que abriste y detenlos al terminar,
salvo petición de conservarlos. No hagas requests mutantes a producción por
un pedido genérico de sanity.

En chat registra ambiente/URL sanitizada, status, bytes y esperado/observado.
4xx/5xx solo pasan si eran previstos. En 204 verifica vacío real; si el cliente
descarta contenido automáticamente, complementa mapper/serialización en componente.

Entrega resultados/límites. Smoke no sustituye suites, cobertura ni build final.
Sin acceso deja comprobación pendiente y avanza localmente cuando sea independiente.
