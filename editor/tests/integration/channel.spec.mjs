import {test, expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

test('catálogo Git y diseño de préstamos en el fork', async ({page, baseURL}) => {
  test.skip(!process.env.CHANNEL_CONTRACTS_DIR, 'Requiere catálogo Business de demostración.');
  const response = await page.request.get('/api/channel-catalog/search?q=');
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toMatchObject({total: 20, skipped: []});
  const external = await page.request.get('/api/channel-catalog/search', {headers: {Origin: 'https://example.org'}});
  expect(external.status()).toBe(403);

  await page.goto('/?lang=es&ui=kennedy');
  await page.waitForFunction(() => !!window.Draw?.loadPlugin);
  await page.evaluate(() => Draw.loadPlugin(ui => window.channelUi = ui));
  await page.waitForFunction(() => !!window.channelUi?.fileNode);
  await page.getByRole('tab', {name: 'Contratos', exact: true}).click();
  await page.getByRole('button', {name: 'Repositorio Business'}).click();
  await page.getByRole('searchbox', {name: 'Busca operación en Git'}).fill('customer lead');
  await page.getByRole('button', {name: 'Buscar', exact: true}).click();
  await page.getByRole('button', {name: /business-customer-lead-v2/}).click();
  await expect(page.locator('.opblock.is-open')).toHaveCount(1);
  await expect(page.locator('.opblock.is-open')).toContainText('/customers/{cxi}/leads');
  const registry = await page.evaluate(() => JSON.parse(channelUi.fileNode.getAttribute('contractsRegistry')));
  expect(registry.revisions).toHaveLength(1);

  const {output} = JSON.parse(execFileSync(process.execPath, ['src/channel-cli.mjs', 'demo'], {cwd: '..', encoding: 'utf8'}));
  const xml = await readFile(path.join(output, 'channel.drawio'), 'utf8');
  await page.evaluate(data => channelUi.setFileData(data), xml);
  await expect(page.getByRole('button', {name: 'Reproducir', exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Reproducir', exact: true}).click();
  await expect(page.locator('[data-audit-animation]')).toHaveCount(1);
  await page.getByRole('button', {name: 'Reiniciar', exact: true}).click();
  await page.evaluate(() => {
    const graph = channelUi.editor.graph;
    graph.setSelectionCell(graph.model.getCell('__dependency-4-0'));
  });
  await expect(page.locator('.opblock.is-open')).toContainText('/loan-applications/{applicationId}/disbursements');
  await expect(page.locator('.ct-audit-panel')).toContainText('Contrato Git');
  const saved = await page.evaluate(() => channelUi.getFileData(true));
  const clean = await page.context().browser().newContext({baseURL});
  try {
    const reopened = await clean.newPage();
    await reopened.goto('/?lang=es&ui=kennedy');
    await reopened.waitForFunction(() => !!window.Draw?.loadPlugin);
    await reopened.evaluate(() => Draw.loadPlugin(ui => window.channelUi = ui));
    await reopened.waitForFunction(() => !!window.channelUi?.fileNode);
    await reopened.evaluate(data => channelUi.setFileData(data), saved);
    await expect(reopened.getByRole('button', {name: 'Reproducir', exact: true})).toBeVisible();
    await expect(reopened.locator('.opblock.is-open')).toContainText('/consumer-loan-applications/Initiate');
  } finally { await clean.close(); }
});
