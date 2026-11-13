# Validacion verificable

Este recurso se carga al preparar validacion ejecutable o integrar un gate en CI.
El editor conserva el loop del agente; estos scripts verifican una ejecucion Maven,
no reemplazan Copilot ni son un sistema de aprobaciones o aislamiento.

## Politica por servicio y tarea

Parte de [policy.example.json](policy.example.json), lee POM, perfiles y CI reales
y adapta comandos, modulos, reportes y tests. El ejemplo no describe un servicio
BCP existente. Guarda la politica fuera del microservicio, por ejemplo en
`~/.copilot/backend-java-policies/<servicio>-<tarea>.json`, salvo destino documental
expresamente solicitado. No copies scripts al servicio ni cambies su POM para
satisfacer este verificador.

- `mavenCommands`: secuencia de comandos Maven existentes; cada `arguments` es
  un array de tokens, nunca una linea de shell. El orden debe conservar reportes
  de todas las suites. `MavenOptions` agrega settings/perfiles confirmados a todos.
- `testReportDirectories`: cada directorio declarado debe generar `TEST-*.xml`
  JUnit actuales. Incluye todos los modulos/suites requeridos; no elijas solo la
  suite focalizada. Agrega Failsafe y Karate si emiten ese formato en el servicio.
- `checkstyleReports`: XML Checkstyle con archivos analizados y cero errores
  de cualquier severidad. Ejecuta tambien el `check`/binding del POM; un reporte
  por si solo no configura enforcement en Maven.
- `coverageReports`: un JaCoCo global agregado **o** reportes de modulos disjuntos.
  Se suman contadores INSTRUCTION raiz ponderados, nunca porcentajes. Se rechazan
  clases repetidas entre reportes para impedir sumar agregado e hijos. Declara
  todos los modulos productivos; revisar alcance/exclusiones sigue siendo humano.
- `minInstructionPercent`: 95 como minimo; elevalo cuando el servicio lo requiera.
- `acceptance`: cada id de la matriz del plan con `classname` y nombre JUnit
  exactos. Debe encontrarse exactamente un test aprobado por criterio. Un test
  parametrizado requiere su nombre emitido real. La herramienta verifica presencia
  y resultado; el revisor comprueba que las assertions demuestran el requisito.

No se soportan como evidencia automatica HTML, XML custom ni el JSON nativo de
Karate. Si el servicio no emite JUnit para esa suite, informa el gate pendiente
y revisa el reporte nativo; no lo omitas de la matriz ni inventes una conversion.
Las excepciones autorizadas o formatos no soportados requieren validacion manual
explicita; este verificador estricto no puede declararlos PASS.

## Ejecucion local

Con Java, Git y Maven/wrapper ya disponibles, desde PowerShell 5.1 o 7:

```powershell
& '<paquete>/skills/backend-calidad/scripts/Invoke-BackendValidation.ps1' `
  -ProjectPath 'D:/repos/mi-servicio' `
  -PolicyPath "$env:USERPROFILE/.copilot/backend-java-policies/mi-tarea.json" `
  -MavenOptions @('-s', 'D:/config/settings.xml')
```

Desde un script o CI, ejecuta el comando en un proceso PowerShell hijo: el script
termina con exit 0 solo al aprobar todo; exit 1 si falla Maven, un reporte o la
vigencia. No instala dependencias, no cambia ignores, no hace stage/commit y no
persiste stdout de Maven ni argumentos arbitrarios. La evidencia JSON se guarda
en un archivo nuevo fuera del servicio; `EvidencePath` permite elegirlo.

La evidencia vincula hora, politica SHA256, comandos por nombre/codigo de salida,
hash de fuentes antes/despues, hashes de reportes y criterios aprobados. El hash
incluye archivos Git versionados y no ignorados, salvo directorios Maven `target`;
no incluye dependencias externas, archivos ignorados, entorno ni servicios remotos.
Un cambio de estos insumos tambien obliga a revalidar. No soporta submodulos Git.
Los XML deben haberse escrito despues del inicio de Maven; no reutiliza reportes
viejos. Archivos generados versionados que cambien durante Maven exigen revisar
el diff y ejecutar otra vez. Cualquier cambio posterior invalida esta evidencia.

El JSON es evidencia local auditable, no una firma ni una frontera contra un
actor que falsifique reportes. No acredita contrato semantico, CI ni produccion.

Antes de reutilizarlo al reanudar o preparar commits, comprueba su vigencia:

```powershell
pwsh -NoProfile -File '<paquete>/skills/backend-calidad/scripts/Invoke-BackendValidation.ps1' `
  -ProjectPath 'D:/repos/mi-servicio' -PolicyPath '<politica>.json' `
  -EvidencePath '<evidencia-existente>.json' -VerifyOnly
```

Este modo compara fuentes, politica, inventario y hashes de reportes, y relee los
gates. No ejecuta Maven ni modifica la evidencia. Si falla, vuelve a validar;
si cambia entorno/dependencias externas, revalida aunque esta comprobacion pase.
Respeta la politica de firma/ejecucion del host: si impide ejecutar scripts,
usa revision manual y deja el verificador automatico pendiente; no la modifiques.

## CI del microservicio

La autorizacion actual modifica el paquete, no otros repositorios. Para adoptar
este gate, usa un checkout del paquete fijado a un commit y una politica revisada
en la ubicacion permitida por el servicio. Ejecuta en un proceso hijo:

```powershell
pwsh -NoProfile -File '<paquete>/skills/backend-calidad/scripts/Invoke-BackendValidation.ps1' `
  -ProjectPath $env:GITHUB_WORKSPACE `
  -PolicyPath '<politica-revisada>.json' `
  -EvidencePath "$env:RUNNER_TEMP/backend-validation.json"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
```

Publica el JSON como artefacto del job y configura ese job como check obligatorio
en la rama mediante los permisos del servicio. No uses `continue-on-error` ni
`|| true`. Hasta ejecutar ese pipeline y configurar la proteccion, el gate solo
esta aplicado localmente; no anuncies CI obligatoria.
