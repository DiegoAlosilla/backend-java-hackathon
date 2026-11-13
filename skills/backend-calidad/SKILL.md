---
name: backend-calidad
description: Valida cambios Java con build final, suites, Checkstyle y JaCoCo del proyecto y comunica evidencia vigente o gates pendientes.
user-invocable: false
---

# Calidad con herramientas del servicio

Descubre comandos/gates en POM/perfiles/CI y aplica CONTEXTO_BACKEND. Conserva
política acordada: INSTRUCTION global mínimo 95%, cero tests omitidos y cero
violaciones Checkstyle. Política corporativa más exigente prevalece; excepciones
explícitas llevan origen/alcance. No amplíes exclusiones ni rebajes umbrales.

Tras cambios Java ejecuta Maven/wrapper `clean install` con settings/perfiles
aplicables, sin omisiones. Comprueba qué suites/gates ejecuta realmente; completa
los restantes con objetivos/runners existentes sin inventar perfiles. Checkstyle
exige `check` o binding que falle, no solo reporte. Si build cubre un gate, no
repitas sin motivo. Karate separado va después para que clean no borre evidencia.

Relaciona salida/comando con reportes actuales Surefire/Failsafe/Karate,
Checkstyle y JaCoCo. Cobertura INSTRUCTION = covered / (covered + missed) del
alcance global vigente: contador raíz o módulos no solapados, sin doble conteo.
Informa BRANCH y exclusiones aparte. Reportes viejos/ausentes, cero tests,
contador cero o suite focalizada no acreditan cobertura global.

## Verificador distribuido

Cuando el host tiene PowerShell 5.1/7 y los reportes son compatibles, carga
[harness.md](references/harness.md), adapta la política de ejemplo a POM/CI y a
todos los criterios AC y ejecuta `scripts/Invoke-BackendValidation.ps1` desde el
paquete. No copies el verificador al microservicio. Conserva política/evidencia
fuera del servicio; no instales PowerShell por iniciativa propia.

El comando ejecuta Maven, exige exit 0 y reportes actuales, cero tests omitidos,
fallos o errores, Checkstyle sin violaciones e INSTRUCTION ponderado suficiente,
sin sumar alcances solapados. Cada AC debe apuntar a un test JUnit aprobado.
Revisa además que las assertions prueben el requisito y que se declararon todas
las suites/módulos; el verificador no descubre omisiones semánticas de la política.

Si no está disponible o un formato no es compatible, comprueba los reportes con
herramientas existentes y documenta método manual/limitaciones. No conviertas la
indisponibilidad en una omisión del gate ni declares PASS del verificador. El gate
de CI requiere adopción explícita en ese repo y protección de rama comprobada.

Corrige fallos del cambio y repite checks afectados. Consulta bloqueos de entorno
con backend-entorno sin reintentar idénticamente. Conserva fallos previos sin
tocar cambios ajenos para forzar verde. CI/Sonar/producción se reportan aparte.

En auditoría/plan/docs justifica validación pertinente y gates no ejecutados;
no modifica código para completar fases. Entrega gate, comando/reporte, resultado
y pendiente en chat. Valida localmente solo con aceptación y gates aplicables verdes.
Incluye ids AC, método automático/manual y ubicación de evidencia. La evidencia
queda invalidada por cambios posteriores de los insumos; al reanudar compara
fuentes/política con `-VerifyOnly` si existe evidencia automatica y vuelve a
validar los checks afectados. Ese modo no acredita entorno/dependencias externos.
