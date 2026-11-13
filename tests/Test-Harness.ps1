#Requires -Version 5.1
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$package = Split-Path -Parent $PSScriptRoot
. (Join-Path $package 'skills/backend-calidad/scripts/BackendGates.ps1')
$engine = (Get-Process -Id $PID).Path
$scratch = Join-Path ([IO.Path]::GetTempPath()) ('backend-harness-test-' + [guid]::NewGuid().ToString('N'))
$project = Join-Path $scratch 'service with spaces'
New-Item -ItemType Directory -Path $project -Force | Out-Null
$script:passed = 0
function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}
function Check {
    param([string]$Name, [scriptblock]$Action)
    & $Action
    $script:passed++
    Write-Host "PASS $Name"
}
function Reject {
    param([scriptblock]$Action, [string]$Expected)
    $message = $null
    try { & $Action | Out-Null } catch { $message = $_.Exception.Message }
    Assert-True ($null -ne $message) 'Se esperaba rechazo.'
    Assert-True ($message -match $Expected) "Rechazo inesperado: $message (esperado: $Expected)"
}
function Expect-ProcessFailure {
    param([string[]]$Arguments)
    $previous = $ErrorActionPreference
    try {
        # Windows PowerShell promotes redirected native stderr to ErrorRecord.
        $ErrorActionPreference = 'Continue'
        & $engine @Arguments 2>$null | Out-Null
        $code = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previous }
    Assert-True ($code -ne 0) 'Se esperaba exit no cero del proceso.'
}
function Write-Fixture {
    param([string]$Relative, [string]$Content)
    $file = Join-Path $project $Relative
    New-Item -ItemType Directory -Path (Split-Path -Parent $file) -Force | Out-Null
    [IO.File]::WriteAllText($file, $Content)
}
$junit = '<testsuite tests="2" failures="0" errors="0" skipped="0"><testcase classname="example.MapperTest" name="absence"/><testcase classname="example.MapperTest" name="neighbor"/></testsuite>'
$checkstyle = '<checkstyle version="10"><file name="Mapper.java"/></checkstyle>'
$jacoco = '<!DOCTYPE report PUBLIC "-//JACOCO//DTD Report 1.1//EN" "report.dtd"><report name="service"><package name="example"><class name="example/Mapper"/></package><counter type="INSTRUCTION" covered="95" missed="5"/></report>'
function Reset-Reports {
    Write-Fixture 'target/surefire-reports/TEST-example.MapperTest.xml' $junit
    Write-Fixture 'target/checkstyle-result.xml' $checkstyle
    Write-Fixture 'target/site/jacoco/jacoco.xml' $jacoco
}
function New-Policy {
    @{
        version = 1; minInstructionPercent = 95
        mavenCommands = @(@{ name = 'fixture-build'; arguments = @('clean', 'install') })
        testReportDirectories = @('target/surefire-reports')
        checkstyleReports = @('target/checkstyle-result.xml')
        coverageReports = @('target/site/jacoco/jacoco.xml')
        acceptance = @(@{ id = 'AC-01'; classname = 'example.MapperTest'; test = 'absence' })
    } | ConvertTo-Json -Depth 8 | ConvertFrom-Json
}
$since = [datetime]::UtcNow.AddMinutes(-1)
try {
    Reset-Reports
    Check 'valid JUnit + JaCoCo with DTD + Checkstyle + AC' {
        $result = Test-BackendReports $project (New-Policy) $since
        Assert-True ($result.tests -eq 2 -and $result.instructionPercent -eq 95 -and $result.acceptance.Count -eq 1) 'Resumen incorrecto.'
        Assert-True ($result.reports.Count -eq 3 -and $result.reports[0].sha256.Length -eq 64) 'Faltan hashes de reportes.'
    }
    Check 'nested JUnit suites are counted once' {
        Write-Fixture 'target/surefire-reports/TEST-example.MapperTest.xml' ("<testsuites>$junit</testsuites>")
        Assert-True ((Test-BackendReports $project (New-Policy) $since).tests -eq 2) 'Doble conteo.'
    }
    Check 'reject aggregate failure even when leaf counters claim success' {
        Write-Fixture 'target/surefire-reports/TEST-example.MapperTest.xml' ("<testsuites failures=`"1`">$junit</testsuites>")
        Reject { Test-BackendReports $project (New-Policy) $since } 'JUnit'
    }
    Reset-Reports
    Check 'reject skipped tests even when suite counters lie' {
        Write-Fixture 'target/surefire-reports/TEST-example.MapperTest.xml' ($junit.Replace('name="absence"/>', 'name="absence"><skipped/></testcase>'))
        Reject { Test-BackendReports $project (New-Policy) $since } 'JUnit'
    }
    Check 'reject actual failure and actual error' {
        foreach ($element in @('failure', 'error')) {
            Write-Fixture 'target/surefire-reports/TEST-example.MapperTest.xml' ($junit.Replace('name="absence"/>', "name=`"absence`"><$element/></testcase>"))
            Reject { Test-BackendReports $project (New-Policy) $since } 'JUnit'
        }
    }
    Reset-Reports
    Check 'reject stale reports' {
        (Get-Item -LiteralPath (Join-Path $project 'target/checkstyle-result.xml')).LastWriteTimeUtc = $since.AddMinutes(-5)
        Reject { Test-BackendReports $project (New-Policy) $since } 'anterior'
    }
    Reset-Reports
    Check 'reject missing report' {
        $policy = New-Policy
        $policy.checkstyleReports = @('target/missing.xml')
        Reject { Test-BackendReports $project $policy $since } 'missing.xml'
    }
    Check 'reject zero tests in required suite' {
        Write-Fixture 'target/integration/TEST-empty.xml' '<testsuite tests="0"/>'
        $policy = New-Policy
        $policy.testReportDirectories += 'target/integration'
        Reject { Test-BackendReports $project $policy $since } 'Cero tests'
    }
    Check 'reject inconsistent JUnit count' {
        Write-Fixture 'target/surefire-reports/TEST-example.MapperTest.xml' ($junit.Replace('tests="2"', 'tests="3"'))
        Reject { Test-BackendReports $project (New-Policy) $since } 'Conteo JUnit'
    }
    Reset-Reports
    Check 'reject missing or ambiguous acceptance test' {
        $policy = New-Policy
        $policy.acceptance[0].test = 'notExecuted'
        Reject { Test-BackendReports $project $policy $since } 'AC-01'
        Write-Fixture 'target/surefire-reports/TEST-duplicate.xml' $junit
        Reject { Test-BackendReports $project (New-Policy) $since } 'AC-01'
        Remove-Item -LiteralPath (Join-Path $project 'target/surefire-reports/TEST-duplicate.xml')
    }
    Check 'reject Checkstyle violations and empty scan' {
        Write-Fixture 'target/checkstyle-result.xml' '<checkstyle><file name="Mapper.java"><error severity="warning"/></file></checkstyle>'
        Reject { Test-BackendReports $project (New-Policy) $since } 'Violaciones'
        Write-Fixture 'target/checkstyle-result.xml' '<checkstyle/>'
        Reject { Test-BackendReports $project (New-Policy) $since } 'sin archivos'
    }
    Reset-Reports
    Check 'reject insufficient and zero coverage' {
        Write-Fixture 'target/site/jacoco/jacoco.xml' ($jacoco.Replace('covered="95"', 'covered="94"'))
        Reject { Test-BackendReports $project (New-Policy) $since } 'inferior'
        Write-Fixture 'target/site/jacoco/jacoco.xml' ($jacoco.Replace('covered="95" missed="5"', 'covered="0" missed="0"'))
        Reject { Test-BackendReports $project (New-Policy) $since } 'cero'
    }
    Reset-Reports
    Check 'reject aggregate plus module overlap' {
        Write-Fixture 'target/module-jacoco.xml' $jacoco
        $policy = New-Policy
        $policy.coverageReports += 'target/module-jacoco.xml'
        Reject { Test-BackendReports $project $policy $since } 'solapada'
    }
    Check 'weight module coverage instead of averaging percentages' {
        Write-Fixture 'target/module-jacoco.xml' ($jacoco.Replace('example/Mapper', 'other/Mapper').Replace('covered="95" missed="5"', 'covered="1" missed="0"'))
        $policy = New-Policy
        $policy.coverageReports += 'target/module-jacoco.xml'
        $value = (Test-BackendReports $project $policy $since).instructionPercent
        Assert-True ([math]::Abs($value - (100.0 * 96 / 101)) -lt 0.00001) 'Promedio no ponderado.'
    }
    Check 'reject weakened threshold, duplicated reports and path escape' {
        $policy = New-Policy
        $policy.minInstructionPercent = 94
        Reject { Test-BackendReports $project $policy $since } '95'
        $policy = New-Policy
        $policy.testReportDirectories += 'target/surefire-reports'
        Reject { Test-BackendReports $project $policy $since } 'duplicado'
        Reject { Get-BackendReportPath $project '../outside.xml' } 'fuera'
    }
    Check 'reject malformed XML and negative counters' {
        Write-Fixture 'target/site/jacoco/jacoco.xml' '<report>'
        Reject { Test-BackendReports $project (New-Policy) $since } '.'
        Write-Fixture 'target/site/jacoco/jacoco.xml' ($jacoco.Replace('covered="95"', 'covered="-1"'))
        Reject { Test-BackendReports $project (New-Policy) $since } 'Contador XML'
    }
    Reset-Reports
    & git -C $project init --quiet
    if ($LASTEXITCODE -ne 0) { throw 'git init fallo.' }
    Write-Fixture 'pom.xml' '<project/>'
    Write-Fixture 'src/Mapper.java' 'class Mapper {}'
    & git -C $project add -- pom.xml src/Mapper.java
    if ($LASTEXITCODE -ne 0) { throw 'git add de fixture fallo.' }
    Check 'source hash detects unstaged and untracked changes but excludes target' {
        $before = Get-BackendSourceHash $project
        Write-Fixture 'target/cache.txt' 'generated'
        Assert-True ((Get-BackendSourceHash $project) -eq $before) 'target altera fuentes.'
        Write-Fixture 'src/Mapper.java' 'class Mapper { int changed; }'
        Assert-True ((Get-BackendSourceHash $project) -ne $before) 'No detecto cambio tracked.'
        $after = Get-BackendSourceHash $project
        Write-Fixture 'src/New.java' 'class New {}'
        Assert-True ((Get-BackendSourceHash $project) -ne $after) 'No detecto cambio untracked.'
    }
    $policyFile = Join-Path $scratch 'policy.json'
    New-Policy | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $policyFile -Encoding UTF8
    $fakeMaven = Join-Path $scratch 'fake-maven.ps1'
    $fakeCode = @'
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Tokens)
if (Test-Path -LiteralPath 'target/fixture-fail') { exit 7 }
if (Test-Path -LiteralPath 'target/fixture-change') { Add-Content -LiteralPath 'src/Mapper.java' -Value '// changed during build' }
if (Test-Path -LiteralPath 'target/fixture-stale') { exit 0 }
foreach ($file in Get-ChildItem -LiteralPath 'target' -Recurse -Filter '*.xml') {
    $text = [IO.File]::ReadAllText($file.FullName)
    [IO.File]::WriteAllText($file.FullName, $text)
}
exit 0
'@
    [IO.File]::WriteAllText($fakeMaven, $fakeCode)
    $runner = Join-Path $package 'skills/backend-calidad/scripts/Invoke-BackendValidation.ps1'
    Check 'runner executes command and writes PASS evidence outside service' {
        $evidenceFile = Join-Path $scratch 'pass.json'
        & $engine -NoProfile -File $runner -ProjectPath $project -PolicyPath $policyFile -MavenExecutable $fakeMaven -EvidencePath $evidenceFile
        Assert-True ($LASTEXITCODE -eq 0) 'Runner fallo con fixture valido.'
        $evidence = Get-Content -LiteralPath $evidenceFile -Raw | ConvertFrom-Json
        Assert-True ($evidence.status -eq 'PASS' -and $evidence.commands[0].exitCode -eq 0 -and $evidence.sourceBefore -eq $evidence.sourceAfter) 'Evidencia inconsistente.'
    }
    Check 'VerifyOnly accepts current evidence without rewriting it' {
        $evidenceFile = Join-Path $scratch 'pass.json'
        $before = (Get-FileHash -LiteralPath $evidenceFile).Hash
        & $engine -NoProfile -File $runner -ProjectPath $project -PolicyPath $policyFile -EvidencePath $evidenceFile -VerifyOnly
        Assert-True ($LASTEXITCODE -eq 0 -and (Get-FileHash -LiteralPath $evidenceFile).Hash -eq $before) 'Verificacion altera evidencia.'
    }
    Check 'receipt rejects changed sources, policy and report bytes' {
        $evidenceFile = Join-Path $scratch 'pass.json'
        $sourceFile = Join-Path $project 'src/Mapper.java'
        $oldSource = [IO.File]::ReadAllText($sourceFile)
        [IO.File]::WriteAllText($sourceFile, 'class Mapper { int laterChange; }')
        Reject { Test-BackendReceipt $project $policyFile $evidenceFile } 'invalidada'
        [IO.File]::WriteAllText($sourceFile, $oldSource)
        $oldPolicy = [IO.File]::ReadAllText($policyFile)
        [IO.File]::WriteAllText($policyFile, ($oldPolicy + ' '))
        Reject { Test-BackendReceipt $project $policyFile $evidenceFile } 'invalidada'
        [IO.File]::WriteAllText($policyFile, $oldPolicy)
        Write-Fixture 'target/checkstyle-result.xml' ($checkstyle + ' ')
        Reject { Test-BackendReceipt $project $policyFile $evidenceFile } 'Reporte cambiado'
        Write-Fixture 'target/checkstyle-result.xml' $checkstyle
        Test-BackendReceipt $project $policyFile $evidenceFile | Out-Null
    }
    Check 'runner preserves existing evidence and rejects output in service' {
        Expect-ProcessFailure @('-NoProfile', '-File', $runner, '-ProjectPath', $project, '-PolicyPath', $policyFile, '-MavenExecutable', $fakeMaven, '-EvidencePath', (Join-Path $scratch 'pass.json'))
        Expect-ProcessFailure @('-NoProfile', '-File', $runner, '-ProjectPath', $project, '-PolicyPath', $policyFile, '-MavenExecutable', $fakeMaven, '-EvidencePath', (Join-Path $project 'evidence.json'))
        Assert-True (-not (Test-Path -LiteralPath (Join-Path $project 'evidence.json'))) 'Creo evidencia en servicio.'
    }
    Check 'Maven autodetection selects one native executable from PATH' {
        $bin = Join-Path $scratch 'bin'
        New-Item -ItemType Directory -Path $bin -Force | Out-Null
        if ($env:OS -eq 'Windows_NT') {
            [IO.File]::WriteAllText((Join-Path $bin 'mvn.cmd'), "@echo off`r`nexit /b 7`r`n")
            [IO.File]::WriteAllText((Join-Path $bin 'mvn'), 'unused alternate executable')
        } else {
            [IO.File]::WriteAllText((Join-Path $bin 'mvn'), "#!/bin/sh`nexit 7`n")
            & chmod +x (Join-Path $bin 'mvn')
            if ($LASTEXITCODE -ne 0) { throw 'chmod de fixture fallo.' }
        }
        $oldPath = $env:PATH
        try {
            $env:PATH = $bin + [IO.Path]::PathSeparator + $oldPath
            $nativeEvidence = Join-Path $scratch 'native.json'
            & $engine -NoProfile -File $runner -ProjectPath $project -PolicyPath $policyFile -EvidencePath $nativeEvidence
            Assert-True ($LASTEXITCODE -eq 1) 'No rechazo Maven nativo fallido.'
            $native = Get-Content -LiteralPath $nativeEvidence -Raw | ConvertFrom-Json
            Assert-True ($native.commands[0].exitCode -eq 7) 'No selecciono un unico ejecutable nativo.'
        } finally { $env:PATH = $oldPath }
    }
    foreach ($mode in @('fail', 'stale', 'change')) {
        Check "runner rejects Maven fixture: $mode" {
            Reset-Reports
            if ($mode -eq 'stale') {
                foreach ($file in Get-ChildItem -LiteralPath (Join-Path $project 'target') -Recurse -Filter '*.xml') {
                    $file.LastWriteTimeUtc = [datetime]::UtcNow.AddMinutes(-10)
                }
            }
            Write-Fixture "target/fixture-$mode" 'fixture'
            $evidenceFile = Join-Path $scratch ("$mode.json")
            & $engine -NoProfile -File $runner -ProjectPath $project -PolicyPath $policyFile -MavenExecutable $fakeMaven -EvidencePath $evidenceFile
            Assert-True ($LASTEXITCODE -eq 1) "No rechazo $mode."
            $evidence = Get-Content -LiteralPath $evidenceFile -Raw | ConvertFrom-Json
            Assert-True ($evidence.status -eq 'FAIL' -and $null -ne $evidence.error) 'Fallo sin evidencia.'
            Remove-Item -LiteralPath (Join-Path $project "target/fixture-$mode")
        }
    }
    $cases = Get-Content -LiteralPath (Join-Path $package 'evaluations/cases.json') -Raw | ConvertFrom-Json
    $transcript = Join-Path $scratch 'transcript.md'
    Set-Content -LiteralPath $transcript -Value '# Synthetic scorer fixture, not an observed Copilot run.'
    $record = [pscustomobject]@{
        version = 1; runLabel = 'synthetic-test'; packageVersion = '0.8.0'; model = 'fixture'; projectRevision = 'fixture'
        results = @($cases.cases | ForEach-Object {
            [pscustomobject]@{
                id = $_.id; transcript = $transcript; durationSeconds = 10; humanInterventions = 1
                checks = @($_.checks | ForEach-Object { [pscustomobject]@{ id = $_.id; outcome = 'pass'; evidence = 'synthetic fixture' } })
            }
        })
    }
    $resultsFile = Join-Path $scratch 'results.json'
    $scorer = Join-Path $package 'scripts/Measure-AgentEvaluation.ps1'
    Check 'scorer accepts complete reviewed records and totals metrics' {
        $record | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $resultsFile -Encoding UTF8
        $summary = & $engine -NoProfile -File $scorer -ResultsPath $resultsFile | ConvertFrom-Json
        Assert-True ($LASTEXITCODE -eq 0 -and $summary.passedCases -eq 8 -and $summary.observedDurationSeconds -eq 80 -and $summary.observedHumanInterventions -eq 8) 'Metricas incorrectas.'
        Assert-True ($null -eq $summary.observedCostUsd) 'Invento costo no observado.'
    }
    Check 'scorer only totals complete reported costs' {
        foreach ($result in $record.results) { $result | Add-Member -NotePropertyName costUsd -NotePropertyValue 0.25 }
        $record | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $resultsFile -Encoding UTF8
        $summary = & $engine -NoProfile -File $scorer -ResultsPath $resultsFile | ConvertFrom-Json
        Assert-True ($LASTEXITCODE -eq 0 -and $summary.observedCostUsd -eq 2 -and $summary.casesWithReportedCost -eq 8) 'Costo incorrecto.'
        $record.results[0].costUsd = $null
        $record | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $resultsFile -Encoding UTF8
        $summary = & $engine -NoProfile -File $scorer -ResultsPath $resultsFile | ConvertFrom-Json
        Assert-True ($null -eq $summary.observedCostUsd -and $summary.casesWithReportedCost -eq 7) 'Imputo costo faltante.'
    }
    Check 'scorer cannot hide critical failure in aggregate' {
        $record.results[0].checks[0].outcome = 'fail'
        $record | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $resultsFile -Encoding UTF8
        $summary = & $engine -NoProfile -File $scorer -ResultsPath $resultsFile | ConvertFrom-Json
        Assert-True ($LASTEXITCODE -eq 1 -and $summary.criticalFailures -eq 1 -and $summary.status -eq 'FAIL') 'Fallo critico oculto.'
        $record.results[0].checks[0].outcome = 'pass'
    }
    Check 'scorer treats absent cases as not run' {
        $record.results = @($record.results[0])
        $record | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $resultsFile -Encoding UTF8
        $summary = & $engine -NoProfile -File $scorer -ResultsPath $resultsFile | ConvertFrom-Json
        Assert-True ($LASTEXITCODE -eq 1 -and $summary.notRunChecks -gt 0 -and $summary.totalCases -eq 8) 'Pendientes ocultos.'
    }
    Check 'scorer rejects pass without evidence and unknown check' {
        $record.results[0].checks[0].evidence = ''
        $record | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $resultsFile -Encoding UTF8
        Expect-ProcessFailure @('-NoProfile', '-File', $scorer, '-ResultsPath', $resultsFile)
        $record.results[0].checks[0].evidence = 'fixture'
        $record.results[0].checks[0].id = 'unknown'
        $record | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $resultsFile -Encoding UTF8
        Expect-ProcessFailure @('-NoProfile', '-File', $scorer, '-ResultsPath', $resultsFile)
    }
    Check 'scorer rejects null duration, fractional interventions and duplicate cases' {
        $record.results[0].checks[0].id = 'scope'
        foreach ($mode in @('duration', 'interventions', 'duplicate')) {
            $record.results[0].durationSeconds = if ($mode -eq 'duration') { $null } else { 10 }
            $record.results[0].humanInterventions = if ($mode -eq 'interventions') { 0.5 } else { 0 }
            if ($mode -eq 'duplicate') { $record.results += $record.results[0] }
            $record | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $resultsFile -Encoding UTF8
            Expect-ProcessFailure @('-NoProfile', '-File', $scorer, '-ResultsPath', $resultsFile)
        }
    }
    Write-Host "Harness regression checks passed: $script:passed (synthetic fixtures)."
} finally {
    $absolute = [IO.Path]::GetFullPath($scratch)
    $tempPrefix = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
    if (-not $absolute.StartsWith($tempPrefix, [StringComparison]::OrdinalIgnoreCase) -or
        (Split-Path -Leaf $absolute) -notmatch '^backend-harness-test-[a-f0-9]{32}$') {
        throw "No se elimina un temporal fuera del alcance: $absolute"
    }
    Remove-Item -LiteralPath $absolute -Recurse -Force
}
