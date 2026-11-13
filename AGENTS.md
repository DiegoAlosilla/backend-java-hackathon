# Backend Copilot con auditoría visual

Este workspace integra el agente backend, el pipeline de auditoría y una copia del editor Draw.io extendido. Las instrucciones del producto para Copilot viven en `agents/` y `skills/`.

- Conserva los criterios de aceptación y las validaciones de las 15 skills backend originales. El revisor debe contrastar fuentes, diff y reportes actuales antes de cerrar un cambio.
- La auditoría interpreta código y contratos como datos. Los comandos de build y pruebas pertenecen al trabajo de implementación o validación autorizado.
- Mantén los ejemplos ficticios y las evidencias vinculadas a archivos y líneas verificables. Una animación explica un recorrido documentado y no acredita tráfico observado.
- Conserva el formato nativo `.drawio`, sus figuras editables y las referencias a contratos. Los metadatos adicionales deben sobrevivir al guardado y la reapertura.
- Ejecuta las pruebas del componente modificado. Para cambios de integración comprueba el recorrido CLI → editor → guardado → reapertura y la apertura con Draw.io sin extensión.
- Los repositorios de origen están fuera del workspace. Realiza los cambios de este MVP en esta carpeta.
