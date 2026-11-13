# Editor del MVP

Desde la raíz del repositorio, `npm run editor` prepara y sirve el editor en `http://127.0.0.1:8080`. El bootstrap descarga la distribución oficial fijada de Draw.io 32.4.1 y verifica su SHA-256. `npm run demo -- --open` genera la auditoría del ejemplo y la carga mediante el protocolo embed. Guardar descarga una copia `.drawio`.

Selecciona una figura de endpoint. La pestaña Contratos abre su operación en Swagger UI. La sección Evidencia y recorrido muestra citas con archivo, líneas y hash, y permite desplegar el fragmento y su interpretación.

Reproducir anima cada arista desde su origen hasta su destino. Azul identifica una petición y verde una respuesta. Pausar conserva la posición, Siguiente paso avanza hasta el destino y Reiniciar retira la animación. El recorrido procede del análisis estático y su reproducción no cambia las figuras, estilos ni metadatos guardados.

## Compatibilidad

El documento contiene figuras y conexiones nativas y los atributos adicionales `contractsRegistry`, `contractRef`, `auditEvidence` y `auditFlow`. Draw.io original puede editar sus figuras. El fork usa los atributos para ofrecer Swagger, evidencia y reproducción.

La prueba de integración usa el archivo generado por el CLI, lo carga en el editor, consulta contrato y evidencia, reproduce el retorno, lo guarda con la extensión desactivada y vuelve a abrirlo en un perfil limpio. Comprueba que el contrato, las evidencias y la animación siguen disponibles. Esta comprobación usa la distribución 32.4.1. Otras versiones y Draw.io Desktop requieren su propia comprobación.

## Verificación

```powershell
npm --prefix editor test
```

La captura de integración se guarda en `editor/docs/evidence/audit-contract-evidence.png`. La copia que pasó por el editor sin extensión se guarda en `editor/docs/evidence/audit-portable.drawio`.

La primera instalación de las pruebas puede requerir `npm --prefix editor run test:browser-install` para preparar Chromium. El uso cotidiano del editor funciona con el navegador del usuario.
