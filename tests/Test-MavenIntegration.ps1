#Requires -Version 5.1
# Optional integration check: downloads public Maven artifacts into its temporary directory.
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$package = Split-Path -Parent $PSScriptRoot
$scratch = Join-Path ([IO.Path]::GetTempPath()) ('backend-maven-test-' + [guid]::NewGuid().ToString('N'))
$project = Join-Path $scratch 'java service with spaces'
New-Item -ItemType Directory -Path $project -Force | Out-Null
function Write-Sample {
    param([string]$Relative, [string]$Text)
    $path = Join-Path $project $Relative
    New-Item -ItemType Directory -Path (Split-Path -Parent $path) -Force | Out-Null
    [IO.File]::WriteAllText($path, $Text)
}
try {
    $pom = @'
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>example</groupId><artifactId>harness-fixture</artifactId><version>1.0</version>
  <properties><maven.compiler.release>17</maven.compiler.release><project.build.sourceEncoding>UTF-8</project.build.sourceEncoding></properties>
  <dependencies><dependency><groupId>junit</groupId><artifactId>junit</artifactId><version>3.8.1</version><scope>test</scope></dependency></dependencies>
  <build><plugins>
    <plugin><groupId>org.apache.maven.plugins</groupId><artifactId>maven-clean-plugin</artifactId><version>3.2.0</version></plugin>
    <plugin><groupId>org.apache.maven.plugins</groupId><artifactId>maven-resources-plugin</artifactId><version>3.3.1</version></plugin>
    <plugin><groupId>org.apache.maven.plugins</groupId><artifactId>maven-compiler-plugin</artifactId><version>3.13.0</version></plugin>
    <plugin><groupId>org.apache.maven.plugins</groupId><artifactId>maven-surefire-plugin</artifactId><version>3.2.5</version></plugin>
    <plugin><groupId>org.apache.maven.plugins</groupId><artifactId>maven-jar-plugin</artifactId><version>3.3.0</version></plugin>
    <plugin><groupId>org.apache.maven.plugins</groupId><artifactId>maven-install-plugin</artifactId><version>3.1.1</version></plugin>
    <plugin><groupId>org.jacoco</groupId><artifactId>jacoco-maven-plugin</artifactId><version>0.8.12</version>
      <executions><execution><goals><goal>prepare-agent</goal></goals></execution>
        <execution><id>report</id><phase>verify</phase><goals><goal>report</goal></goals></execution></executions>
    </plugin>
    <plugin><groupId>org.apache.maven.plugins</groupId><artifactId>maven-checkstyle-plugin</artifactId><version>3.6.0</version>
      <configuration><configLocation>${project.basedir}/checkstyle.xml</configLocation></configuration>
      <executions><execution><phase>verify</phase><goals><goal>check</goal></goals></execution></executions>
    </plugin>
  </plugins></build>
</project>
'@
    Write-Sample 'pom.xml' $pom
    Write-Sample 'checkstyle.xml' '<!DOCTYPE module PUBLIC "-//Checkstyle//DTD Checkstyle Configuration 1.3//EN" "https://checkstyle.org/dtds/configuration_1_3.dtd"><module name="Checker"><module name="TreeWalker"><module name="AvoidStarImport"/></module></module>'
    Write-Sample 'src/main/java/example/Mapper.java' 'package example; public class Mapper { public int status(boolean absent) { return absent ? 204 : 500; } }'
    Write-Sample 'src/test/java/example/MapperTest.java' 'package example; public class MapperTest extends junit.framework.TestCase { public void testAbsence() { assertEquals(204, new Mapper().status(true)); } public void testNeighbor() { assertEquals(500, new Mapper().status(false)); } }'
    Write-Sample '.gitignore' "target/`n"
    & git -C $project init --quiet
    if ($LASTEXITCODE -ne 0) { throw 'git init fallo.' }
    & git -C $project add -- .
    if ($LASTEXITCODE -ne 0) { throw 'git add de fixture fallo.' }
    $settings = Join-Path $scratch 'settings.xml'
    [IO.File]::WriteAllText($settings, '<settings xmlns="http://maven.apache.org/SETTINGS/1.2.0"/>')
    $policy = Get-Content -LiteralPath (Join-Path $package 'skills/backend-calidad/references/policy.example.json') -Raw | ConvertFrom-Json
    $policy.mavenCommands[0].arguments = @('-B', '-ntp', '-q', 'clean', 'install')
    $policy.acceptance = @(
        @{ id = 'AC-01'; classname = 'example.MapperTest'; test = 'testAbsence' },
        @{ id = 'AC-02'; classname = 'example.MapperTest'; test = 'testNeighbor' }
    )
    $policyPath = Join-Path $scratch 'policy.json'
    $evidencePath = Join-Path $scratch 'validation.json'
    $policy | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $policyPath -Encoding UTF8
    $runner = Join-Path $package 'skills/backend-calidad/scripts/Invoke-BackendValidation.ps1'
    & $runner -ProjectPath $project -PolicyPath $policyPath -EvidencePath $evidencePath `
        -MavenOptions @('-s', $settings, '-gs', $settings, ('-Dmaven.repo.local=' + (Join-Path $scratch 'm2')))
    if ($LASTEXITCODE -ne 0) { throw 'El verificador rechazo el build Maven real.' }
    $evidence = Get-Content -LiteralPath $evidencePath -Raw | ConvertFrom-Json
    if ($evidence.status -ne 'PASS' -or $evidence.gates.tests -ne 2 -or $evidence.gates.instructionPercent -ne 100) {
        throw 'Resultado inesperado en el proyecto Java sintetico.'
    }
    & $runner -ProjectPath $project -PolicyPath $policyPath -EvidencePath $evidencePath -VerifyOnly
    if ($LASTEXITCODE -ne 0) { throw 'La evidencia del build real no se puede verificar.' }
    Write-Host 'PASS real Maven integration: 2 tests, 100% INSTRUCTION, zero Checkstyle violations, 2 AC; synthetic Java project.'
} finally {
    $absolute = [IO.Path]::GetFullPath($scratch)
    $tempPrefix = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
    if (-not $absolute.StartsWith($tempPrefix, [StringComparison]::OrdinalIgnoreCase) -or
        (Split-Path -Leaf $absolute) -notmatch '^backend-maven-test-[a-f0-9]{32}$') {
        throw "No se elimina un temporal fuera del alcance: $absolute"
    }
    Remove-Item -LiteralPath $absolute -Recurse -Force
}
