# Usar el MVP desde Copilot

El paquete se instala desde la carpeta donde clonaste el repositorio. Selecciona el harness **Copilot**
en VS Code y abre el microservicio con el que vas a trabajar.

## Activar la copia local

1. Abre **Chat: Open Customizations** desde la paleta.
2. En **Plugins**, pulsa **+** junto a **Workspace** e introduce la ruta absoluta del clon.
   También existe **Chat: Install Plugin from Source**, que acepta esa carpeta.
3. Comprueba que `backend-java-hackathon` está habilitado para el workspace.
   Si tienes la versión anterior, deshabilítala para ese workspace para evitar
   dos agentes con nombre `backend-java`.
4. Inicia una sesión nueva de Copilot y elige **backend-java**. Revisa en
   Customizations que aparezcan sus especialistas y las skills del paquete.

Los especialistas están ocultos del selector mediante `user-invocable: false`.
Copilot los invoca con su herramienta nativa `task`. El paquete conserva el
formato Copilot de `plugin.json`, con `agents/` y `skills/` como carpetas hermanas.
La documentación oficial admite instalación desde carpeta y ese formato.
[Instalación](https://code.visualstudio.com/docs/agent-customization/agent-plugins),
[formato](https://code.visualstudio.com/docs/agents/reference/agent-plugin-reference).

Si el editor ofrece únicamente la carga de plugins locales mediante settings,
integra estas claves en Settings JSON, conservando el resto de ajustes.

```json
{
  "chat.plugins.enabled": true,
  "chat.pluginLocations": {
    "C:/repos/backend-java-hackathon": true
  }
}
```

La disponibilidad depende de la versión y las políticas del Copilot corporativo.
El CLI del MVP necesita Node y las dependencias preparadas según el README.
Los cambios Java usan JDK, Maven, settings y runners del servicio. El backend de
razonamiento es la sesión Copilot seleccionada. [Subagentes en VS Code](https://code.visualstudio.com/docs/agents/run/subagents).

## Pedidos para el piloto

### Auditar un microservicio

```text
Audita los endpoints de este microservicio. Delega el análisis a backend-auditor
y la publicación a backend-diagrammer. Guarda los resultados en runs/ del plugin
y abre el diagrama en el fork local. Quiero consultar el contrato, la evidencia
y reproducir el recorrido. Solicita una revisión independiente a backend-reviewer
y entrega los límites de cobertura.
```

### Revisar un cambio

```text
Revisa el diff local respecto a HEAD, incluidos los cambios staged y unstaged.
Identifica endpoints afectados y contrasta código, OpenAPI y pruebas. Ejecuta
las validaciones aplicables del servicio. Genera y abre en Draw.io la auditoría
del estado final con contrato y evidencia. Invoca a backend-reviewer antes de
cerrar e indica qué hallazgos pertenecen al cambio.
```

### Implementar y validar

```text
Corrige este comportamiento según el contrato del servicio y los criterios que
te adjunto. Delega implementación, regresiones unitarias, Karate cuando aplique
y validación final. Revisa el resultado con backend-reviewer, abre el endpoint
con contrato y evidencia en Draw.io y propón commits agrupados para mi revisión.
```

## Comprobar la delegación

Expande la actividad de herramientas del chat. Debe haber una invocación real
para cada especialista usado, incluida una de `backend-reviewer` posterior al
último cambio y su validación. Contrasta el dictamen con el diff y los reportes.
Si la ejecución solicita correcciones, debe existir otra validación afectada y
otra revisión del resultado final. Una lista de roles escrita en chat no acredita
esas invocaciones.

Los agentes declaran `target: github-copilot`, usan aliases de herramientas
compatibles y omiten un modelo fijo. El revisor usa `read` y `search` para
inspeccionar fuentes y reportes. Calidad ejecuta el verificador que acredita
gates declarados y vigencia. Las instrucciones mantienen el resto del alcance
del pedido. [Campos y herramientas](https://code.visualstudio.com/docs/agents/reference/custom-agent-file-reference).

## Comprobación del paquete

```powershell
pwsh -NoProfile -File tests/Test-CopilotPackage.ps1
pwsh -NoProfile -File tests/Test-Harness.ps1
```

Estas comprobaciones revisan el paquete y el verificador con fixtures. La
ejecución de una sesión real de Copilot debe comprobarse en el piloto del editor.
