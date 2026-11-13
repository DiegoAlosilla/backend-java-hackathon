#Requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ResultsPath,
    [string]$CasesPath = (Join-Path $PSScriptRoot '../evaluations/cases.json')
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
try {
    $catalog = Get-Content -LiteralPath $CasesPath -Raw | ConvertFrom-Json
    $record = Get-Content -LiteralPath $ResultsPath -Raw | ConvertFrom-Json
    if ($catalog.version -ne 1 -or $record.version -ne 1 -or @($catalog.cases).Count -eq 0) { throw 'Version/catalogo invalido.' }
    foreach ($field in @('runLabel', 'packageVersion', 'model', 'projectRevision')) {
        if ([string]::IsNullOrWhiteSpace($record.$field)) { throw "Falta $field" }
    }
    $known = @{}
    foreach ($case in $catalog.cases) {
        if ($known.ContainsKey($case.id) -or @($case.checks).Count -eq 0) { throw 'Catalogo duplicado/vacio.' }
        $checkIds = @{}
        foreach ($check in $case.checks) {
            if ($checkIds.ContainsKey($check.id) -or $check.critical -isnot [bool]) { throw 'Checks del catalogo invalidos.' }
            $checkIds[$check.id] = $check
        }
        $known[$case.id] = $checkIds
    }
    $observed = @{}
    [double]$duration = 0; [long]$interventions = 0; [double]$cost = 0; $costKnown = 0
    $basePath = Split-Path -Parent (Resolve-Path -LiteralPath $ResultsPath).Path
    foreach ($result in $record.results) {
        if (-not $known.ContainsKey($result.id) -or $observed.ContainsKey($result.id)) { throw 'Caso desconocido o duplicado.' }
        if ($null -eq $result.durationSeconds -or $null -eq $result.humanInterventions -or
            $result.durationSeconds -isnot [ValueType] -or $result.humanInterventions -isnot [ValueType] -or
            $result.durationSeconds -is [bool] -or $result.humanInterventions -is [bool] -or
            [double]::IsNaN([double]$result.durationSeconds) -or [double]::IsInfinity([double]$result.durationSeconds) -or
            $result.durationSeconds -lt 0 -or $result.humanInterventions -lt 0 -or
            [double]$result.humanInterventions -ne [math]::Floor([double]$result.humanInterventions)) { throw 'Metricas invalidas.' }
        $transcript = if ([IO.Path]::IsPathRooted($result.transcript)) { $result.transcript } else { Join-Path $basePath $result.transcript }
        if (-not (Test-Path -LiteralPath $transcript -PathType Leaf) -or (Get-Item -LiteralPath $transcript).Length -eq 0) { throw 'Falta transcripcion revisable.' }
        $checks = @{}
        foreach ($check in $result.checks) {
            if (-not $known[$result.id].ContainsKey($check.id) -or $checks.ContainsKey($check.id) -or
                $check.outcome -cnotin @('pass', 'fail', 'not_run')) { throw 'Check desconocido, duplicado o resultado invalido.' }
            if ($check.outcome -ne 'not_run' -and [string]::IsNullOrWhiteSpace($check.evidence)) { throw 'Check observado sin evidencia.' }
            $checks[$check.id] = $check.outcome
        }
        if ($checks.Count -ne $known[$result.id].Count) { throw 'Cada caso registrado debe incluir todos sus checks.' }
        $observed[$result.id] = $checks
        $duration += $result.durationSeconds
        $interventions += $result.humanInterventions
        $costProperty = $result.PSObject.Properties['costUsd']
        if ($null -ne $costProperty -and $null -ne $costProperty.Value) {
            $value = $costProperty.Value
            if ($value -isnot [ValueType] -or $value -is [bool] -or $value -lt 0 -or
                [double]::IsNaN([double]$value) -or [double]::IsInfinity([double]$value)) { throw 'Costo invalido.' }
            $cost += $value
            $costKnown++
        }
    }
    $passedCases = 0; $passed = 0; $failed = 0; $notRun = 0; $criticalFailures = 0
    foreach ($case in $catalog.cases) {
        $allPass = $true
        foreach ($check in $case.checks) {
            $outcome = if ($observed.ContainsKey($case.id)) { $observed[$case.id][$check.id] } else { 'not_run' }
            if ($outcome -eq 'pass') { $passed++ } else {
                $allPass = $false
                if ($outcome -eq 'fail') { $failed++; if ($check.critical) { $criticalFailures++ } } else { $notRun++ }
            }
        }
        if ($allPass) { $passedCases++ }
    }
    [pscustomobject]@{
        runLabel = $record.runLabel; packageVersion = $record.packageVersion; model = $record.model
        projectRevision = $record.projectRevision; source = 'human-reviewed-records'
        status = $(if ($failed -eq 0 -and $notRun -eq 0) { 'PASS' } else { 'FAIL' })
        passedCases = $passedCases; totalCases = $known.Count; observedCases = $observed.Count
        passedChecks = $passed; failedChecks = $failed; notRunChecks = $notRun; criticalFailures = $criticalFailures
        successPercent = 100.0 * $passedCases / $known.Count
        observedDurationSeconds = $duration; observedHumanInterventions = $interventions
        casesWithReportedCost = $costKnown
        observedCostUsd = $(if ($costKnown -eq $observed.Count -and $costKnown -gt 0) { $cost } else { $null })
    } | ConvertTo-Json -Depth 5
    if ($failed -gt 0 -or $notRun -gt 0) { exit 1 }
    exit 0
} catch {
    Write-Error $_.Exception.Message -ErrorAction Continue
    exit 1
}
