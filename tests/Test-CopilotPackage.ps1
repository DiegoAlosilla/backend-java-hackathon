#Requires -Version 5.1
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content -LiteralPath (Join-Path $root 'plugin.json') -Raw | ConvertFrom-Json
if ($manifest.agents -ne './agents' -or $manifest.skills -ne './skills') {
    throw 'El manifest debe descubrir agents y skills del paquete.'
}
$agentFiles = @(Get-ChildItem -LiteralPath (Join-Path $root 'agents') -Filter '*.agent.md')
$names = @{}
foreach ($file in $agentFiles) {
    $body = Get-Content -LiteralPath $file.FullName -Raw
    $nameMatch = [regex]::Match($body, '(?m)^name: ([a-z0-9-]+)\r?$')
    if (-not $nameMatch.Success) { throw "Agente sin nombre valido: $($file.Name)" }
    $name = $nameMatch.Groups[1].Value
    if ($names.ContainsKey($name)) { throw "Agente duplicado: $name" }
    $names[$name] = $true
    if ($body -notmatch '(?m)^target: github-copilot\r?$') {
        throw "Target Copilot ausente: $name"
    }
    if ($body -match '(?m)^(agents|handoffs|argument-hint|advancedOptions):') {
        throw "Campo exclusivo Local en agente Copilot: $name"
    }
    if ($name -ne 'backend-java' -and $body -notmatch '(?m)^user-invocable: false\r?$') {
        throw "Especialista visible como entrada principal: $name"
    }
    $toolsMatch = [regex]::Match($body, '(?m)^tools: \[([^\]]+)\]')
    if (-not $toolsMatch.Success) { throw "Tools ausentes: $name" }
    foreach ($token in ($toolsMatch.Groups[1].Value -split ',')) {
        $tool = $token.Trim().Trim("'")
        if ($tool -notin @('read','search','edit','execute','agent','web','todo')) {
            throw "Alias de herramienta no soportado: $name/$tool"
        }
    }
    if ($name -eq 'backend-reviewer' -and $toolsMatch.Groups[1].Value -match "edit|execute|agent") {
        throw 'El revisor debe conservar herramientas de lectura.'
    }
    $skillMatch = [regex]::Match($body, '(?m)^skills: \[([^\]]+)\]')
    foreach ($token in ($skillMatch.Groups[1].Value -split ',')) {
        $skill = $token.Trim().Trim("'")
        if (-not (Test-Path -LiteralPath (Join-Path $root "skills/$skill/SKILL.md"))) {
            throw "Skill no empaquetada: $name/$skill"
        }
    }
}
$orchestrator = Get-Content -LiteralPath (Join-Path $root 'agents/backend-java.agent.md') -Raw
foreach ($name in $names.Keys) {
    if ($name -ne 'backend-java' -and -not $orchestrator.Contains($name)) {
        throw "Especialista sin ruta desde el orquestador: $name"
    }
}
$markdown = @(
    Get-ChildItem -LiteralPath (Join-Path $root 'agents') -Filter '*.md'
    Get-ChildItem -LiteralPath (Join-Path $root 'skills') -Filter '*.md' -Recurse
)
foreach ($file in $markdown) {
    $body = Get-Content -LiteralPath $file.FullName -Raw
    foreach ($match in [regex]::Matches($body, '\[[^\]]*\]\(([^)]+)\)')) {
        $target = ($match.Groups[1].Value -split '#')[0]
        if (-not $target -or $target -match '^https?://') { continue }
        $resolved = Join-Path $file.DirectoryName $target
        if (-not (Test-Path -LiteralPath $resolved)) { throw "Link ausente en $($file.Name): $target" }
    }
}
Write-Output "PASS Copilot package: $($agentFiles.Count) agents, routing, aliases, skills and local links."
