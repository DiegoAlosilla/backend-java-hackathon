# Verificación del MVP

Comprobaciones locales ejecutadas el 12 de noviembre de 2026.

| Comprobación | Resultado |
| --- | --- |
| `npm test` en la raíz | 5 pruebas aprobadas de generación, fuentes obsoletas, citas falsas, referencias e identidad de contratos |
| `tests/Test-CopilotPackage.ps1` | 12 agentes, routing, aliases de herramientas, skills y links locales comprobados |
| `tests/Test-Harness.ps1` | 31 comprobaciones aprobadas con fixtures sintéticos |
| `tests/Test-MavenIntegration.ps1` | Maven/JDK reales sobre fixture sintético, 2 pruebas, 2 criterios de aceptación, cobertura y Checkstyle verificados |
| `mvn -B -ntp test` en `examples/account-service` | 3 pruebas unitarias aprobadas, sin fallos, errores ni omisiones |
| TypeScript del editor | `tsc --noEmit` aprobado |
| Pruebas unitarias del editor | 32 aprobadas |
| Pruebas de navegador del editor | 26 casos ejecutados. Tres fallaron inicialmente por carpetas temporales ausentes y pasaron tras corregir la preparación. Los otros 23 pasaron en la suite inicial |
| Apertura mediante puente local | Caso adicional aprobado con selección automática, Swagger, evidencia, animación y descarga después de cerrar el puente |
| Auditoría portable | Caso de integración aprobado de nuevo tras la corrección de apertura, usando la salida real del CLI y guardado en editor sin extensión |

La instalación de dependencias del editor es local a este workspace. El runtime usa la distribución oficial fijada de Draw.io 32.4.1, con SHA-256 verificado.

## Alcance pendiente

La delegación está implementada como agentes y skills del harness Copilot. La ejecución de una conversación real, con las políticas y autenticación del Copilot corporativo, sigue pendiente de prueba en ese entorno. Las pruebas del paquete validan su estructura y herramientas auxiliares.

El descubrimiento inicial cubre Java/Jakarta REST con rutas literales. El razonamiento del auditor lo realiza Copilot y requiere la revisión semántica del revisor. El CLI comprueba existencia de citas, hashes, endpoints y contratos.

Las pruebas Java del ejemplo comprueban lógica de estados HTTP en unidad. El ejemplo no levanta un servidor Quarkus ni ejecuta Karate. Las skills de Karate y las validaciones del servicio real están conservadas para los proyectos donde correspondan.

La animación reproduce pasos descritos en la auditoría. Los controles interactivos requieren el fork. La compatibilidad de edición y conservación se comprobó con Draw.io 32.4.1 sin la extensión. Otras versiones y Desktop tienen su validación pendiente.
