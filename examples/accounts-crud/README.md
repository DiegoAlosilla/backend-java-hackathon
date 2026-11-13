# Demo de Copilot con un CRUD de cuentas

El servicio arranca en Quarkus con Java 17 y Maven. Redis, base de datos y Kafka se representan con adaptadores en memoria dentro del mismo proceso. Así puedes demostrar la lógica, las respuestas HTTP y el orden de las llamadas sin preparar contenedores. Reiniciar el proceso borra los datos y eventos de la demo.

| Operación inicial | Resultado | Recorrido |
| --- | --- | --- |
| `POST /accounts` | `201` con la cuenta, `400` si los datos son inválidos o `409` si el identificador existe | Valida el cuerpo → inserta en BD → guarda `accounts:{id}` en Redis → invalida la lista cacheada → publica `accounts.registered` → responde. |
| `GET /accounts` | `200` con una lista, incluso si está vacía | Lee la lista de Redis. Con caché presente devuelve la lista. Si falta, consulta BD → guarda la lista en Redis → responde. |
| `GET /health` | `200` con `{"status":"UP"}` | Comprueba que el proceso responde. |

El CRUD queda preparado como punto de partida con registro y listado. **Eliminar** es el ejercicio principal. **Actualizar** queda como ejercicio adicional.

## 1. Levanta y prueba el estado inicial

Desde la raíz del repositorio, compila, ejecuta las pruebas y arranca el servicio.

```powershell
mvn -B -ntp -f examples/accounts-crud/pom.xml package
java -jar examples/accounts-crud/target/quarkus-app/quarkus-run.jar
```

En otra terminal, ejecuta el siguiente guion desde un proceso recién iniciado.

```powershell
$base = 'http://127.0.0.1:8090'
curl.exe -i "$base/health"
curl.exe -i "$base/accounts"
Invoke-WebRequest -Uri "$base/accounts" -Method Post -ContentType 'application/json' -Body '{"id":"demo-01","name":"Cuenta de prueba"}'
curl.exe -i "$base/accounts"
curl.exe -i "$base/accounts"
```

Verás `UP`, una lista vacía, `201` con la cuenta y dos listados `200` con `demo-01`. En la terminal de Quarkus, busca `accounts.registered`, `Redis MISS` tras el registro y `Redis HIT` en el último listado. Una segunda alta con el mismo identificador devuelve `409`.

## 2. Pide la auditoría inicial

Abre `examples/accounts-crud` como carpeta del servicio en VS Code y selecciona `backend-java`. Inicia el editor con `npm run editor` desde la raíz del repositorio. [Instalación del plugin](../../docs/copilot.md)

> Audita el estado actual de este microservicio. Dibuja `POST /accounts` y `GET /accounts` como diagramas de componentes en Draw.io, con sus contratos y citas del código. Para el listado, prepara un recorrido que consulta la BD cuando falta la lista en Redis y otro archivo para el caso que responde desde caché. Dime qué operaciones del CRUD faltan. Revisa la evidencia y abre los diagramas.

Selecciona cada página y el bloque del endpoint. En el panel **Contratos** verás su operación de OpenAPI. En **Evidencia y recorrido**, pulsa **Reproducir** y observa cuándo se publica el evento y cuándo se actualiza la caché. La auditoría debe distinguir la ruta de caché presente y el flujo de registro de la ruta que lee la BD.

### Diagramas de referencia para la presentación

Puedes reproducir esta parte incluso si Copilot no está disponible durante la demo. Desde la raíz del repositorio, con el CLI y el editor preparados, ejecuta lo siguiente.

```powershell
node examples/accounts-crud/audit-reference.mjs
node src/cli.mjs render --repo examples/accounts-crud --input runs/accounts-crud/audit.json --out runs/accounts-crud/accounts.drawio --open
node src/cli.mjs render --repo examples/accounts-crud --input runs/accounts-crud/audit-cache-hit.json --out runs/accounts-crud/accounts-cache-hit.drawio --open
```

El primer archivo contiene dos páginas para registrar y listar con caché vacía. El segundo muestra listar con caché presente. El script reconstruye las citas y los hashes desde el código de la demo. Una auditoría en Copilot vuelve a analizar el código que tenga abierto.

## 3. Pide implementar `DELETE /accounts/{id}`

Si quieres empezar por la spec, sigue la entrevista guiada y revisa el contrato y el diagrama propuestos antes de pedir la implementación. [Diseño de `DELETE`](../../docs/delete-design.md)

> Implementa `DELETE /accounts/{id}`. Empieza por actualizar el OpenAPI. Usa la base de datos como fuente de verdad. Si la cuenta existe, elimínala de la BD, borra `accounts:{id}` de Redis si está presente, invalida la lista cacheada, publica `accounts.deleted` y devuelve `204` sin cuerpo. Si la BD indica que la cuenta no existe, devuelve `404` sin publicar evento. Mantén la consistencia con registro y listado. Añade pruebas HTTP para `204`, `404` y un listado posterior sin la cuenta. Comprueba que el evento de borrado se publica una sola vez. Ejecuta el build, pasa el diff al revisor y muéstrame los resultados.

El orden propuesto permite borrar aunque falte la clave en Redis. La invalidación evita que un listado posterior devuelva una cuenta que ya se borró. Para el ejercicio, reutiliza los adaptadores locales del servicio.

## 4. Ejecuta sanity y vuelve a auditar

Después de la implementación, empaqueta el servicio otra vez y reinícialo. Pide al agente que ejecute la validación de componente y el sanity local.

> Ejecuta las pruebas existentes con Maven y comprueba `GET /health` en `http://127.0.0.1:8090`. Registra `demo-delete`, lista para poblar la caché, elimina la cuenta, vuelve a listar y repite la eliminación. Comprueba `201`, `200`, `204` con cuerpo vacío, `200` sin la cuenta y `404`. Contrasta el evento `accounts.deleted` con las pruebas y el log. Pasa los resultados al revisor.

> Audita ahora solo `DELETE /accounts/{id}` sobre el código final. Genera un diagrama de componentes con el contrato, citas por archivo y línea, y el recorrido desde la eliminación en BD hasta la respuesta, pasando por Redis y `accounts.deleted`. Explica el caso `404` y abre el resultado en Draw.io.

La demo usa OpenAPI y pruebas de componente con JUnit y HTTP real sobre Quarkus. Las suites de Karate y los contratos dirigidos por consumidores, cuando el servicio los tenga, se ejecutan con sus propios runners.
