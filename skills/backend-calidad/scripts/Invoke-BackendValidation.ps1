#Requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$ProjectPath,
    [Parameter(Mandatory = $true)][string]$PolicyPath,
    [string]$EvidencePath,
    [string]$MavenExecutable,
    [string[]]$MavenOptions = @(),
    [switch]$VerifyOnly
)

. (Join-Path $PSScriptRoot 'BackendGates.ps1')
$ProjectPath = (Resolve-Path -LiteralPath $ProjectPath).Path.TrimEnd('\', '/')
if ($VerifyOnly) {
    try {
        if (-not $EvidencePath) { throw 'VerifyOnly requiere EvidencePath existente.' }
        Test-BackendReceipt $ProjectPath $PolicyPath $EvidencePath | Out-Null
        Write-Host 'Evidencia vigente para las fuentes, politica y reportes declarados.'
        exit 0
    } catch {
        Write-Warning $_.Exception.Message
        exit 1
    }
}
if (-not $EvidencePath) {
    $EvidencePath = Join-Path ([Environment]::GetFolderPath('UserProfile')) (
        '.copilot/backend-java-runs/' + [guid]::NewGuid().ToString('N') + '/validation.json'
    )
}
$EvidencePath = [IO.Path]::GetFullPath($EvidencePath)
if ($EvidencePath.StartsWith($ProjectPath + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or
    $EvidencePath -eq $ProjectPath -or (Test-Path -LiteralPath $EvidencePath)) {
    throw 'EvidencePath debe ser un archivo nuevo fuera del microservicio.'
}
$evidence = [ordered]@{
    version = 1; status = 'FAIL'; startedAt = [datetime]::UtcNow.ToString('o'); reportSince = $null; finishedAt = $null
    project = $ProjectPath; sourceBefore = $null; sourceAfter = $null; policySha256 = $null
    commands = @(); gates = $null; error = $null
}
$code = 1
try {
    $policy = Get-Content -LiteralPath $PolicyPath -Raw | ConvertFrom-Json
    Test-BackendPolicy $policy
    $evidence.policySha256 = (Get-FileHash -LiteralPath $PolicyPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $evidence.sourceBefore = Get-BackendSourceHash $ProjectPath
    if (-not $MavenExecutable) {
        $wrapper = Join-Path $ProjectPath $(if ($env:OS -eq 'Windows_NT') { 'mvnw.cmd' } else { 'mvnw' })
        $MavenExecutable = if (Test-Path -LiteralPath $wrapper -PathType Leaf) { $wrapper } else {
            (Get-Command 'mvn' -CommandType Application -ErrorAction Stop | Select-Object -First 1).Source
        }
    }
    $started = [datetime]::UtcNow
    $evidence.reportSince = $started.ToString('o')
    Push-Location -LiteralPath $ProjectPath
    try {
        foreach ($command in $policy.mavenCommands) {
            $arguments = @($MavenOptions) + @($command.arguments)
            Write-Host "Maven: $($command.name)"
            $global:LASTEXITCODE = 0
            & $MavenExecutable @arguments | Out-Host
            $exitCode = $LASTEXITCODE
            # Do not persist arbitrary CLI values: credentials belong in existing settings.
            $evidence.commands += [pscustomobject]@{ name = $command.name; exitCode = $exitCode }
            if ($exitCode -ne 0) { throw "Maven fallo: $($command.name), exit $exitCode" }
        }
    } finally { Pop-Location }
    $evidence.sourceAfter = Get-BackendSourceHash $ProjectPath
    if ($evidence.sourceBefore -ne $evidence.sourceAfter) { throw 'Las fuentes cambiaron durante el build; revisar y revalidar.' }
    $evidence.gates = Test-BackendReports $ProjectPath $policy $started
    $evidence.status = 'PASS'
    $code = 0
} catch {
    $evidence.error = $_.Exception.Message
    Write-Warning $evidence.error
} finally {
    $evidence.finishedAt = [datetime]::UtcNow.ToString('o')
    $parent = Split-Path -Parent $EvidencePath
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
    $evidence | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $EvidencePath -Encoding UTF8
    Write-Host "Validacion $($evidence.status): $EvidencePath"
}
exit $code
