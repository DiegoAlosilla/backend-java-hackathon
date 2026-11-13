# Ejemplos de uso

Instala el plugin desde el clon y selecciona `backend-java` en Copilot. Usa el [servicio ficticio de cuentas](account-service/) para practicar. La [guía de instalación](../docs/copilot.md) describe cómo habilitar el plugin y comprobar la delegación.

## Demo reproducible

Desde la raíz del repositorio, instala las dependencias y genera el diagrama.

```powershell
npm ci
npm --prefix editor ci
npm --prefix editor run build
npm run demo
```

Abre `runs/demo/account.drawio` en Draw.io. Para ver Swagger, las citas y la animación, inicia `npm run editor` y ejecuta `npm run demo -- --open` en otra terminal. Selecciona `GET /accounts/{id}/balance` y pulsa **Reproducir**. También puedes abrir la [copia portable](../editor/docs/evidence/audit-portable.drawio) o importar los [contratos ficticios](../editor/examples/contracts/).

Las pruebas unitarias del servicio ficticio se ejecutan con `mvn -f examples/account-service/pom.xml test` usando JDK 17. Los ejemplos de Kafka, Karate, configuración y sanity requieren un servicio o entorno que tenga esas capacidades.

## Agregar un endpoint

> En el servicio ficticio de cuentas, agrega `GET /accounts/{id}/status`. Devuelve `200` con `{"active":true}` para la cuenta `demo` y `404` para otras cuentas. Muéstrame el plan, añade la operación en OpenAPI, implementa el cambio y prueba ambos casos. Pasa el diff y los resultados al revisor. Abre el endpoint en Draw.io con el contrato, las citas y el recorrido. Propón los commits al final.

## Revisar un cambio

> Revisa el diff local respecto a HEAD. Identifica los endpoints afectados, contrasta código, OpenAPI y pruebas, y relaciona cada hallazgo con su archivo y línea. Pide al revisor que valide la evidencia. Genera el diagrama del endpoint más afectado.

## Pedidos por habilidad

| Habilidad | Ejemplo de pedido en Copilot |
| --- | --- |
| Entorno | Identifica el JDK, Maven Wrapper, settings y perfiles que necesita este servicio. |
| Contexto | Explícame desde qué clase entra la consulta de saldo y dónde se decide el código HTTP. |
| Evidencias | Cruza este log de ejemplo con el código y el contrato. Distingue los hechos de las hipótesis. |
| Plan | Propón criterios de aceptación, archivos afectados y pruebas para agregar un endpoint de estado. |
| Contrato | Agrega al OpenAPI la consulta de estado y revisa si la operación cambia la compatibilidad del contrato. |
| Implementación | Implementa la consulta de estado siguiendo los patrones del servicio. |
| Errores HTTP | Revisa que una cuenta sin saldo devuelva `204` sin cuerpo, como indica el contrato. |
| Kafka | En un servicio que ya usa Kafka, revisa el schema y la compatibilidad antes de añadir un campo opcional al evento ficticio de estado. |
| Unitarias | Añade y ejecuta pruebas JUnit para saldo positivo, saldo cero y ausencia de saldo. |
| Karate | En un servicio con Karate, añade escenarios para `200` y `204` y ejecútalos con el runner existente. |
| Configuración por ambiente | Prepara el delta de Properties y ConfigMaps para un timeout ficticio en dev y pruebas. |
| Calidad | Ejecuta el build y los controles aplicables. Relaciona cada criterio con el resultado y su reporte. |
| Sanity | En el entorno local de pruebas, comprueba salud y una consulta de saldo de la cuenta ficticia. |
| Memoria | Resume las decisiones de contrato y validación para retomar el trabajo en otra sesión. |
| Commits | Propón los commits, archivos, mensajes y validaciones. Muéstrame la agrupación para aprobarla. |
| Auditoría | Audita `GET /accounts/{id}/balance` con dependencias, condiciones, errores y citas de código. |
| Draw.io | Abre la auditoría de saldo en el fork con Swagger, evidencia y animación. Entrégame el `.drawio` editable. |
