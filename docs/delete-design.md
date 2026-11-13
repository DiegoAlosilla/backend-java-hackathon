# Diseñar la eliminación antes de implementar

Abre `examples/accounts-crud` en VS Code, selecciona `backend-java` e inicia el fork con `npm run editor` desde la raíz del plugin. [Instalación de Copilot](copilot.md) · [Preparación del editor](editor.md)

> Diseña `DELETE /accounts/{id}` para el CRUD de cuentas. Pregúntame por las decisiones que falten para armar la spec. Cuando responda, genera el OpenAPI propuesto y abre en nuestro fork de Draw.io un diagrama de componentes animado con cada resultado. Déjame revisar la propuesta antes de implementar.

## Preguntas del agente

El orquestador pide a `backend-planner` que lea el CRUD y su contrato. Pregunta solo por decisiones que todavía estén abiertas.

1. **Cuenta ausente.** ¿Devolvemos `404` con un mensaje o `204` sin cuerpo en un borrado repetido?
2. **Identificador.** ¿Aplicamos el mismo patrón del alta y devolvemos `400` para un ID inválido, o dejamos que el resultado de la búsqueda decida la respuesta?
3. **Orden y caché.** ¿Confirmas que la BD decide si la cuenta existe, que el borrado comienza en la BD y que después se elimina la clave de Redis y se invalida el listado?
4. **Evento.** ¿Confirmas `accounts.deleted` con el ID después de limpiar Redis y antes de devolver `204`, o quieres otro nombre para el tópico?

Usa las decisiones ya acordadas. Si alguna respuesta cambia el flujo de BD → Redis → tópico o el contenido del evento, muestra qué adaptación requiere el generador antes de ofrecer los archivos. El generador de esta demo admite ese orden, el ID como dato del evento, las dos respuestas de ausencia, la validación de ID opcional y un nombre de tópico configurable.

## Generación y revisión

El orquestador resume las respuestas y guarda un JSON con los cuatro valores acordados fuera del microservicio. Usa el siguiente ejemplo solo para reproducir la demo o si el usuario confirma estas decisiones.

```json
{
  "missingStatus": 404,
  "validateId": true,
  "databaseFirst": true,
  "topic": "accounts.deleted"
}
```

Desde la raíz del plugin, guarda el JSON en `runs/delete-design/answers.json` y ejecuta lo siguiente.

```powershell
node src/cli.mjs design-delete --repo examples/accounts-crud --input runs/delete-design/answers.json --out runs/delete-design --open
```

El comando guarda `decisions.json`, `spec.md`, `openapi.proposed.yaml` y `delete.proposed.drawio` en la salida indicada. La propuesta OpenAPI conserva las operaciones existentes y añade `DELETE`. El `.drawio` incorpora ese contrato y abre una página por resultado. Selecciona el endpoint para consultar Swagger y pulsa **Reproducir**. Las conexiones enlazan con los criterios de aceptación de la propuesta.

El orquestador entrega los archivos para revisión. Para pasar al siguiente paso, puedes pedir **«Implementa el DELETE con esta spec, verifica los criterios y audita el código final»**. [Guion para implementar y verificar](../examples/accounts-crud/README.md#3-pide-implementar-delete-accountsid)

## Estimar esfuerzo y equipo

> Con la spec del DELETE, estima el esfuerzo y dime cuántos developers necesito para entregarlo en 2 días hábiles, con 7 horas efectivas diarias por developer. Muéstrame las tareas, el escenario base y qué pasa si necesitamos margen.

Si omites el plazo o la capacidad, `backend-java` te pide el dato que falte. La calculadora lee las decisiones estructuradas de `spec.md` y ajusta el esfuerzo según la respuesta para una cuenta ausente y la validación del ID. Si tienes una spec anterior, regénérala con `design-delete` usando el `decisions.json` de esa propuesta.

```powershell
node src/cli.mjs estimate-delete --input runs/delete-design/spec.md --days 2 --hours-per-day 7 --out runs/delete-design/estimate.md
```

El informe muestra horas-persona, tareas vinculadas a criterios y el menor equipo que cabe en el plazo para cada escenario. El contrato precede a los tres adaptadores que pueden avanzar en paralelo. El endpoint y las validaciones dependen de ese trabajo. Si el plazo es menor al recorrido con máxima concurrencia, el informe indica el plazo mínimo en días hábiles.

Las horas base son supuestos del CRUD local. Los escenarios optimista y con margen aplican respectivamente `0.75×` y `1.5×`. El cálculo supone disponibilidad desde el primer día e incluye pruebas, sanity, revisión y diagrama final.
