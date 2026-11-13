import {test, expect} from '@playwright/test';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

async function open(page, extension = true) {
  await page.goto(`/?lang=es&ui=kennedy&contracts=${extension ? 1 : 0}`);
  await page.waitForFunction(() => !!window.Draw?.loadPlugin);
  await page.evaluate(() => Draw.loadPlugin(ui => window.testUi = ui));
  await page.waitForFunction(() => !!window.testUi?.fileNode);
}

test('CLI diagram evidence and animation survive original editor save and clean reopen', async ({browser}) => {
  execFileSync(process.execPath, ['src/cli.mjs', 'demo'], {cwd: '..'});
  const context = await browser.newContext({viewport: {width: 1500, height: 1000}});
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await open(page);
  await page.evaluate(xml => testUi.setFileData(xml), await readFile('../runs/demo/account.drawio', 'utf8'));
  const ids = await page.evaluate(() => {
    const graph = testUi.editor.graph;
    const endpoint = Object.values(graph.model.cells).find(cell => cell.value?.getAttribute?.('contractRef'));
    graph.setSelectionCell(endpoint);
    graph.scrollCellToVisible(endpoint);
    return {endpoint: endpoint.id, evidence: endpoint.value.getAttribute('auditEvidence')};
  });
  await expect(page.locator('.opblock.is-open')).toHaveCount(1);
  await expect(page.getByRole('region', {name: 'Evidencia y recorrido'})).toBeVisible();
  await page.locator('.ct-audit-panel summary').first().click();
  await expect(page.locator('.ct-audit-panel pre').first()).toBeVisible();
  const before = await page.evaluate(() => testUi.getFileData(true));
  await page.getByRole('button', {name: 'Reproducir', exact: true}).click();
  await expect(page.locator('[data-audit-animation]')).toHaveCount(1);
  await expect(page.locator('.ct-audit-panel [role=status]')).toContainText('Respuesta', {timeout: 7000});
  await page.getByRole('button', {name: 'Reiniciar', exact: true}).click();
  expect(await page.evaluate(() => testUi.getFileData(true))).toBe(before);
  await mkdir('docs/evidence', {recursive: true});
  await page.screenshot({path: 'docs/evidence/audit-contract-evidence.png'});
  const plainContext = await browser.newContext(), plain = await plainContext.newPage();
  await open(plain, false);
  await expect(plain.getByRole('tab', {name: 'Contratos', exact: true})).toHaveCount(0);
  await plain.evaluate(xml => testUi.setFileData(xml), before);
  const saved = await plain.evaluate(id => {
    const graph = testUi.editor.graph, cell = graph.model.getCell(id);
    graph.cellLabelChanged(cell, 'Endpoint revisado', false);
    return testUi.getFileData(true);
  }, ids.endpoint);
  const cleanContext = await browser.newContext(), reopened = await cleanContext.newPage();
  await open(reopened);
  await reopened.evaluate(xml => testUi.setFileData(xml), saved);
  await reopened.evaluate(id => {const graph = testUi.editor.graph; graph.setSelectionCell(graph.model.getCell(id));}, ids.endpoint);
  await expect(reopened.locator('.opblock.is-open')).toHaveCount(1);
  await expect(reopened.locator('.ct-audit-panel summary').first()).toBeVisible();
  expect(await reopened.evaluate(id => testUi.editor.graph.model.getCell(id).value.getAttribute('auditEvidence'), ids.endpoint)).toBe(ids.evidence);
  await reopened.getByRole('button', {name: 'Siguiente paso', exact: true}).click();
  await expect(reopened.locator('[data-audit-animation]')).toHaveCount(1);
  await reopened.getByRole('button', {name: 'Siguiente paso', exact: true}).click();
  await expect(reopened.locator('.ct-audit-panel [role=status]')).toContainText('Respuesta');
  expect(await reopened.evaluate(id => {
    const graph = testUi.editor.graph;
    const flow = JSON.parse(graph.model.getCell(id).value.getAttribute('auditFlow'));
    const response = flow.steps.find(step => step.direction === 'response');
    const end = graph.view.getState(graph.model.getCell(response.edgeId)).absolutePoints.at(-1);
    const dot = document.querySelector('[data-audit-animation]');
    return Math.hypot(Number(dot.getAttribute('cx')) - end.x, Number(dot.getAttribute('cy')) - end.y);
  }, ids.endpoint)).toBeLessThan(1);
  await writeFile('docs/evidence/audit-portable.drawio', saved);
  expect(errors).toEqual([]);
  await context.close(); await plainContext.close(); await cleanContext.close();
});
