import {parse} from 'yaml';
import {deleteDecisions} from './delete-design.mjs';

const scenarios = ['optimista', 'base', 'con margen'];

export function estimateDelete(spec, days, hoursPerDay) {
  if (!Number.isSafeInteger(days) || days < 1 || !Number.isFinite(hoursPerDay) || hoursPerDay <= 0 || hoursPerDay > 24) {
    throw new Error('Indica días hábiles enteros positivos y horas efectivas por developer al día (mayor que 0, máximo 24).');
  }
  const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(spec);
  const metadata = header && parse(header[1]);
  if (metadata?.design !== 'accounts-delete-v1') {
    throw new Error('Usa la spec de DELETE generada con design-delete. Si es anterior a la calculadora, regénérala con decisions.json.');
  }
  const {missingStatus, validateId} = deleteDecisions(metadata.decisions);
  const missingError = missingStatus === 404 ? 0.5 : 0;
  const invalidId = validateId ? 0.5 : 0;
  const tasks = [
    {name: 'Contrato y escenarios HTTP', criteria: 'AC-02 a AC-04', base: 1 + missingError + invalidId},
    {name: 'Adaptador de BD y borrado por ID', criteria: 'AC-01, AC-03', base: 2},
    {name: 'Redis e invalidación del listado', criteria: 'AC-01, AC-05', base: 2},
    {name: 'Evento del tópico local', criteria: 'AC-02, AC-03', base: 1},
    {name: 'Endpoint y orquestación Java', criteria: 'AC-01 a AC-04', base: 2 + missingError + invalidId},
    {name: 'Pruebas de componente y regresión', criteria: 'AC-01 a AC-05', base: 2.5 + invalidId},
    {name: 'Build, sanity y revisión', criteria: 'AC-01 a AC-05', base: 2},
    {name: 'Auditoría y diagrama final', criteria: 'AC-01 a AC-05', base: 1.5}
  ].map(task => ({...task, hours: [task.base * 0.75, task.base, task.base * 1.5]}));

  // El contrato precede a tres adaptadores independientes. La integración y las
  // verificaciones posteriores esperan sus resultados y se estiman en serie.
  const results = scenarios.map((name, i) => {
    const [contract, database, redis, topic, ...after] = tasks.map(task => task.hours[i]);
    const serial = contract + after.reduce((sum, hours) => sum + hours, 0);
    const effort = serial + database + redis + topic;
    const parallel = [database, redis, topic].sort((a, b) => b - a);
    const [largest, middle, smallest] = parallel;
    const elapsed = [effort, serial + Math.max(largest, middle + smallest), serial + largest];
    const capacity = days * hoursPerDay;
    const firstFit = elapsed.findIndex(hours => hours <= capacity + 1e-9);
    return {name, effort, developers: firstFit < 0 ? null : firstFit + 1, elapsed, minimumDays: Math.ceil((elapsed[2] - 1e-9) / hoursPerDay)};
  });
  return {days, hoursPerDay, tasks, results};
}

export function formatDeleteEstimate(estimate) {
  const {days, hoursPerDay, tasks, results} = estimate;
  const lines = [
    '# Estimación de DELETE /accounts/{id}', '',
    `Plazo de **${days} días hábiles** con **${hoursPerDay} horas efectivas por developer al día**.`, '',
    '| Escenario | Esfuerzo (horas-persona) | Developers para el plazo | Plazo mínimo con 3 developers |',
    '| --- | ---: | ---: | ---: |',
    ...results.map(result => `| ${result.name} | ${result.effort} | ${result.developers ?? 'Fuera de plazo'} | ${result.minimumDays} días |`), '',
    `En el escenario base, el recorrido toma **${results[1].elapsed[0]} h con 1 developer**, **${results[1].elapsed[1]} h con 2** y **${results[1].elapsed[2]} h con 3**. El plazo ofrece ${days * hoursPerDay} h efectivas por developer.`, '',
    '| Tarea | Criterios | Horas base |', '| --- | --- | ---: |',
    ...tasks.map(task => `| ${task.name} | ${task.criteria} | ${task.base} |`), '',
    'La estimación usa supuestos del CRUD con adaptadores simulados. El escenario optimista aplica 0.75× a las horas base y el escenario con margen aplica 1.5×. Las horas base son heurísticas del ejemplo.', '',
    'El contrato se define primero. BD, Redis y tópico pueden avanzar en paralelo, con hasta un developer por tarea. Luego se ejecutan en orden la integración, las pruebas, la revisión y la auditoría. El cálculo compara el tiempo de ese recorrido con la capacidad del plazo. Asume developers disponibles desde el primer día y cuenta el tiempo de revisión dentro del esfuerzo.', '',
    'El alcance cubre la demo local. Para estimar una integración real, hay que recalibrar las tareas y tiempos.', ''
  ];
  return lines.join('\n');
}
