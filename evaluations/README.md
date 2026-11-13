# Evaluacion del agente

Los ocho casos de [cases.json](cases.json) son un protocolo de piloto, no resultados
observados. La ejecucion del Copilot corporativo y el juicio funcional siguen siendo
humanos. El medidor valida registros y calcula metricas; no invoca un modelo ni
decide si una respuesta es correcta.

## Comparacion reproducible

1. Prepara una copia aislada del mismo microservicio para cada caso. Registra SHA,
   diff inicial y setup; usa logs sanitizados. No ejecutes el protocolo en produccion.
2. Corre cada prompt con 0.7.0 y con 0.8.0 en chats nuevos, mismo modelo,
   herramientas, JDK, perfiles y fixture. Carga una sola version por chat y conserva
   los mismos criterios. Anota cambios de entorno que impidan comparar.
3. Guarda fuera del servicio la transcripcion sanitizada y los comandos/reportes
   reales. Un revisor marca cada check `pass`, `fail` o `not_run`, citando lineas,
   diffs o reportes. Para resume, registra tambien interrupcion y cambio posterior.
4. Completa un JSON por version con formato inferior y ejecuta el medidor.
   Repite casos con variacion del modelo antes de atribuir una mejora estable.

```json
{
  "version": 1,
  "runLabel": "piloto-candidato",
  "packageVersion": "0.8.0",
  "model": "modelo-real-seleccionado",
  "projectRevision": "SHA-y-referencia-del-fixture",
  "results": [
    {
      "id": "audit-scope",
      "transcript": "transcripts/audit-scope.md",
      "durationSeconds": 120,
      "humanInterventions": 0,
      "costUsd": null,
      "checks": [
        { "id": "scope", "outcome": "pass", "evidence": "lineas 10-22 y diff final" },
        { "id": "evidence", "outcome": "fail", "evidence": "linea 28: concluyo 204 sin contrato" },
        { "id": "acceptance", "outcome": "not_run", "evidence": "" }
      ]
    }
  ]
}
```

El fragmento es ilustrativo; no es un piloto realizado. Para un registro real,
incluye todos los casos ejecutados y todas sus comprobaciones. Casos ausentes
cuentan como no ejecutados y no pueden producir aprobacion. Las transcripciones
deben existir, no estar vacias y contener evidencia sanitizada revisable.

```powershell
pwsh -NoProfile -File '<paquete>/scripts/Measure-AgentEvaluation.ps1' `
  -ResultsPath '<fuera-del-servicio>/candidato.json'
```

El JSON de salida muestra casos aprobados/total, checks aprobados/fallidos/no
ejecutados, fallos criticos, tiempo e intervenciones de los casos observados.
Exit 0 requiere todos los checks de todos los casos aprobados; exit 1 indica
fallo, pendiente o registro invalido. Un promedio no puede ocultar fallos criticos.
Tiempo/costo de casos no ejecutados no se imputan como cero; no se estima costo
sin datos del proveedor. Compara tiempo/intervenciones solo con igual cobertura
de casos. El campo opcional `costUsd` admite costo real no negativo; el total
observado es `null` si falta en algun caso observado, nunca un cero inventado.
Compara costo solo con igual cobertura y datos completos. Reporta regresiones
funcionales por caso, aunque el agregado mejore.

## Ciclo de mejora

Convierte un fallo repetido en caso de regresion con fixture y criterio observable,
corrige la instruccion/herramienta minima que lo explica y repite el caso afectado
y los escenarios vecinos. Las pruebas de `tests/Test-Harness.ps1` validan los
verificadores con fixtures sinteticos; no acreditan eficacia del agente en Copilot.
