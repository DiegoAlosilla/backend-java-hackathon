---
name: backend-pruebas-unitarias
description: Crea y ejecuta pruebas Java significativas del cambio con JUnit/Mockito y convenciones existentes, sin ocultar fallos o cobertura insuficiente.
user-invocable: false
---

# Unitarias Java

Revisa tests/versions de referencia. Usa AAA separado, nombres descriptivos en
inglés y @DisplayName según convención. Con Mockito usa extension/mocks/inyección
donde corresponda; no los impongas a CDI/@QuarkusTest. Mantén matchers tipados y
utilitarios existentes.

Cubre camino feliz, errores y límites relevantes, especialmente la regresión.
Vincula cada escenario con su criterio AC del plan. Comprueba que una regresión
falle con la implementación defectuosa cuando sea viable demostrarlo sin alterar
trabajo ajeno; explica si no se pudo. No atribuyas aceptación a una assertion que
solo reproduce el mock o verifica existencia.
Verifica valores/estado y tipo/código/mensaje de excepciones; evita mockear toda
la lógica o assertions solo de existencia. Conserva estilo/cabeceras en tests.

No uses @Disabled, lenient, tests comentados ni exclusiones nuevas para forzar
verde. Contrasta test fallido con requisito/código antes de cambiarlo.

Ejecuta Maven/wrapper del servicio con entorno seleccionado. Tests focalizados
sirven para iterar; informa conteos/resultados y no les atribuyas cobertura global.
Entrega comandos/reportes normales del build para validación final.
