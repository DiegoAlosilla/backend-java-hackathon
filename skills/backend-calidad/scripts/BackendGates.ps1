# Shared by the validation command and its regression tests. No external modules.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-BackendSourceHash {
    param([string]$ProjectPath)
    $gitRoot = & git -C $ProjectPath rev-parse --show-toplevel 2>$null
    if ($LASTEXITCODE -ne 0 -or [IO.Path]::GetFullPath([string]$gitRoot).TrimEnd('\', '/') -ne $ProjectPath.TrimEnd('\', '/')) {
        throw 'ProjectPath debe ser la raiz Git del microservicio.'
    }
    $listed = & git -C $ProjectPath ls-files -z --cached --others --exclude-standard
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo inventariar el arbol Git.' }
    $paths = @(([string]::Join("`n", @($listed)) -split "`0") | Where-Object {
        $_ -and $_ -notmatch '(^|/)target/'
    } | Sort-Object -Unique)
    $entries = foreach ($relative in $paths) {
        $file = Join-Path $ProjectPath $relative
        if (Test-Path -LiteralPath $file -PathType Container) {
            throw "Submodulo/directorio Git no soportado en fingerprint: $relative"
        }
        $digest = if (Test-Path -LiteralPath $file -PathType Leaf) {
            (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
        } else { 'DELETED' }
        "$relative`0$digest"
    }
    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes(
            [string]::Join("`n", @($entries))
        )))).Replace('-', '').ToLowerInvariant()
    } finally { $sha.Dispose() }
}

function Get-BackendReportPath {
    param([string]$ProjectPath, [string]$RelativePath)
    if ([string]::IsNullOrWhiteSpace($RelativePath) -or [IO.Path]::IsPathRooted($RelativePath)) {
        throw 'Los reportes deben tener rutas relativas al microservicio.'
    }
    $full = [IO.Path]::GetFullPath((Join-Path $ProjectPath $RelativePath))
    $prefix = $ProjectPath.TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
    if (-not $full.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Reporte fuera del microservicio: $RelativePath"
    }
    $full
}

function Read-BackendXml {
    param([string]$Path, [datetime]$NotBefore)
    $file = Get-Item -LiteralPath $Path -ErrorAction Stop
    if ($file.LastWriteTimeUtc -lt $NotBefore.ToUniversalTime()) {
        throw "Reporte anterior a esta ejecucion: $Path"
    }
    # JaCoCo normally declares a DTD. Ignore it and never resolve external entities.
    $settings = New-Object System.Xml.XmlReaderSettings
    $settings.DtdProcessing = [Xml.DtdProcessing]::Ignore
    $settings.XmlResolver = $null
    $reader = [Xml.XmlReader]::Create($file.FullName, $settings)
    try {
        $xml = New-Object System.Xml.XmlDocument
        $xml.XmlResolver = $null
        $xml.Load($reader)
        return ,$xml
    } finally { $reader.Dispose() }
}

function Get-BackendCount {
    param([Xml.XmlElement]$Node, [string]$Attribute, [switch]$Optional)
    $value = $Node.GetAttribute($Attribute)
    if ($Optional -and $value -eq '') { return [long]0 }
    [long]$number = 0
    if (-not [long]::TryParse($value, [ref]$number) -or $number -lt 0) {
        throw "Contador XML invalido: $Attribute='$value'"
    }
    $number
}

function Test-BackendPolicy {
    param($Policy)
    if ($Policy.version -ne 1) { throw 'Version de politica no soportada.' }
    if ($null -eq $Policy.minInstructionPercent -or $Policy.minInstructionPercent -is [string] -or
        $Policy.minInstructionPercent -is [bool] -or
        $Policy.minInstructionPercent -lt 95 -or $Policy.minInstructionPercent -gt 100) {
        throw 'INSTRUCTION debe estar entre 95 y 100; no se rebaja el gate del paquete.'
    }
    foreach ($field in @('testReportDirectories', 'checkstyleReports', 'coverageReports', 'acceptance', 'mavenCommands')) {
        if (@($Policy.$field).Count -eq 0) { throw "Politica incompleta: $field" }
    }
    $ids = @{}
    foreach ($criterion in $Policy.acceptance) {
        if ([string]::IsNullOrWhiteSpace($criterion.id) -or $ids.ContainsKey($criterion.id) -or
            [string]::IsNullOrWhiteSpace($criterion.classname) -or [string]::IsNullOrWhiteSpace($criterion.test)) {
            throw 'Cada criterio requiere id unico, classname y test exactos.'
        }
        $ids[$criterion.id] = $true
    }
    foreach ($command in $Policy.mavenCommands) {
        if ([string]::IsNullOrWhiteSpace($command.name) -or @($command.arguments).Count -eq 0) {
            throw 'Cada comando Maven requiere name y arguments como array de tokens.'
        }
        if ($command.arguments -is [string]) { throw 'arguments debe ser un array, no una linea de shell.' }
    }
}

function Test-BackendReports {
    param([string]$ProjectPath, $Policy, [datetime]$NotBefore)
    Test-BackendPolicy $Policy
    $reportPaths = @{}
    $tests = New-Object 'System.Collections.Generic.List[object]'
    foreach ($relative in $Policy.testReportDirectories) {
        $directoryTestsBefore = $tests.Count
        $directory = Get-BackendReportPath $ProjectPath $relative
        $files = @(Get-ChildItem -LiteralPath $directory -Filter 'TEST-*.xml' -File)
        if ($files.Count -eq 0) { throw "Sin reportes JUnit en $relative" }
        foreach ($file in $files) {
            if ($reportPaths.ContainsKey($file.FullName)) { throw "Reporte duplicado: $($file.FullName)" }
            $reportPaths[$file.FullName] = $true
            $xml = Read-BackendXml $file.FullName $NotBefore
            if ($xml.DocumentElement.get_Name() -notin @('testsuite', 'testsuites')) { throw 'Raiz JUnit invalida.' }
            foreach ($summary in $xml.SelectNodes('//testsuite | //testsuites')) {
                foreach ($kind in @('failures', 'errors', 'skipped')) {
                    if ((Get-BackendCount $summary $kind -Optional) -gt 0) {
                        throw "Gate JUnit incumplido: $kind en resumen $($file.Name)"
                    }
                }
                if ($summary.HasAttribute('tests') -and
                    (Get-BackendCount $summary 'tests') -ne @($summary.SelectNodes('.//testcase')).Count) {
                    throw 'Conteo JUnit agregado inconsistente.'
                }
            }
            $suites = @($xml.SelectNodes('//testsuite[not(testsuite) and not(testsuites)]'))
            $counted = 0
            foreach ($suite in $suites) {
                $cases = @($suite.SelectNodes('./testcase'))
                $counted += $cases.Count
                if ((Get-BackendCount $suite 'tests') -ne $cases.Count) { throw 'Conteo JUnit no coincide con testcase.' }
                foreach ($kind in @('failures', 'errors', 'skipped')) {
                    $element = if ($kind -eq 'failures') { 'failure' } elseif ($kind -eq 'errors') { 'error' } else { 'skipped' }
                    $actual = @($cases | Where-Object { $null -ne $_.SelectSingleNode("./$element") }).Count
                    if ((Get-BackendCount $suite $kind -Optional) -ne $actual -or $actual -gt 0) {
                        throw "Gate JUnit incumplido: $kind en $($file.Name)"
                    }
                }
                foreach ($case in $cases) {
                    $tests.Add([pscustomobject]@{ classname = $case.GetAttribute('classname'); test = $case.GetAttribute('name') })
                }
            }
            if ($suites.Count -eq 0 -or $counted -ne @($xml.SelectNodes('//testcase')).Count) {
                throw 'Estructura JUnit no soportada; no se ignoran suites ni casos.'
            }
        }
        if ($tests.Count -eq $directoryTestsBefore) { throw "Cero tests en suite requerida: $relative" }
    }
    if ($tests.Count -eq 0) { throw 'Cero tests no acredita validacion.' }
    $acceptance = foreach ($criterion in $Policy.acceptance) {
        $matching = @($tests | Where-Object { $_.classname -ceq $criterion.classname -and $_.test -ceq $criterion.test })
        if ($matching.Count -ne 1) { throw "Criterio sin test unico aprobado: $($criterion.id)" }
        [pscustomobject]@{ id = $criterion.id; classname = $criterion.classname; test = $criterion.test; status = 'PASS' }
    }
    foreach ($relative in $Policy.checkstyleReports) {
        $path = Get-BackendReportPath $ProjectPath $relative
        if ($reportPaths.ContainsKey($path)) { throw "Reporte duplicado: $relative" }
        $reportPaths[$path] = $true
        $xml = Read-BackendXml $path $NotBefore
        if ($xml.DocumentElement.get_Name() -ne 'checkstyle' -or @($xml.SelectNodes('/checkstyle/file')).Count -eq 0) {
            throw "Checkstyle sin archivos analizados: $relative"
        }
        if (@($xml.SelectNodes('/checkstyle/file/error')).Count -ne 0) { throw "Violaciones Checkstyle: $relative" }
    }
    [long]$covered = 0; [long]$missed = 0
    $classes = @{}
    foreach ($relative in $Policy.coverageReports) {
        $path = Get-BackendReportPath $ProjectPath $relative
        if ($reportPaths.ContainsKey($path)) { throw "Reporte duplicado: $relative" }
        $reportPaths[$path] = $true
        $xml = Read-BackendXml $path $NotBefore
        if ($xml.DocumentElement.get_Name() -ne 'report') { throw "Raiz JaCoCo invalida: $relative" }
        $counters = @($xml.SelectNodes('/report/counter[@type="INSTRUCTION"]'))
        if ($counters.Count -ne 1) { throw "Se requiere contador INSTRUCTION raiz: $relative" }
        $reportClasses = @($xml.SelectNodes('//package/class'))
        if ($reportClasses.Count -eq 0) { throw "JaCoCo sin clases: $relative" }
        foreach ($class in $reportClasses) {
            $name = $class.GetAttribute('name')
            if (-not $name -or $classes.ContainsKey($name)) { throw "Cobertura solapada o clase sin nombre: $name" }
            $classes[$name] = $true
        }
        $reportCovered = Get-BackendCount $counters[0] 'covered'
        $reportMissed = Get-BackendCount $counters[0] 'missed'
        if (($reportCovered + $reportMissed) -eq 0) { throw "Contador INSTRUCTION cero: $relative" }
        $covered += $reportCovered
        $missed += $reportMissed
    }
    if (($covered + $missed) -eq 0) { throw 'Contador INSTRUCTION total cero.' }
    $percent = 100.0 * $covered / ($covered + $missed)
    if ($percent -lt $Policy.minInstructionPercent) { throw "INSTRUCTION $percent inferior a $($Policy.minInstructionPercent)." }
    $reports = foreach ($path in ($reportPaths.Keys | Sort-Object)) {
        [pscustomobject]@{ path = $path.Substring($ProjectPath.Length).TrimStart('\', '/'); sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() }
    }
    [pscustomobject]@{
        tests = $tests.Count; skipped = 0; failures = 0; errors = 0; checkstyleViolations = 0
        instructionCovered = $covered; instructionMissed = $missed; instructionPercent = $percent
        acceptance = @($acceptance); reports = @($reports)
    }
}

function Test-BackendReceipt {
    param([string]$ProjectPath, [string]$PolicyPath, [string]$EvidencePath)
    $policy = Get-Content -LiteralPath $PolicyPath -Raw | ConvertFrom-Json
    Test-BackendPolicy $policy
    $evidence = Get-Content -LiteralPath $EvidencePath -Raw | ConvertFrom-Json
    if ($evidence.version -ne 1 -or $evidence.status -cne 'PASS' -or $evidence.project -ne $ProjectPath -or
        $evidence.sourceBefore -ne $evidence.sourceAfter -or
        $evidence.sourceAfter -ne (Get-BackendSourceHash $ProjectPath) -or
        $evidence.policySha256 -ne (Get-FileHash -LiteralPath $PolicyPath -Algorithm SHA256).Hash) {
        throw 'Evidencia no aprobada o invalidada por cambios de fuentes/politica.'
    }
    if (@($evidence.commands).Count -ne @($policy.mavenCommands).Count) { throw 'Comandos no coinciden con politica.' }
    for ($i = 0; $i -lt @($policy.mavenCommands).Count; $i++) {
        if ($evidence.commands[$i].name -cne $policy.mavenCommands[$i].name -or $evidence.commands[$i].exitCode -ne 0) {
            throw 'Comando pendiente o fallido en evidencia.'
        }
    }
    $current = Test-BackendReports $ProjectPath $policy ([datetime]$evidence.reportSince)
    $recorded = @{}
    foreach ($report in $evidence.gates.reports) {
        if ($recorded.ContainsKey($report.path)) { throw 'Reporte duplicado en evidencia.' }
        $recorded[$report.path] = $report.sha256
    }
    if ($recorded.Count -ne @($current.reports).Count) { throw 'Inventario de reportes cambio.' }
    foreach ($report in $current.reports) {
        if (-not $recorded.ContainsKey($report.path) -or $recorded[$report.path] -ne $report.sha256) {
            throw 'Reporte cambiado despues de validar.'
        }
    }
    $current
}
