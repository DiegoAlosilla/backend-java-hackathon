import {test, expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {openLocal} from '../../../src/delivery.js';

test('local delivery loads the endpoint and supports saving after the bridge closes', async ({page}) => {
  execFileSync(process.execPath, ['src/cli.mjs', 'demo'], {cwd: '..'});
  const content = await readFile('../runs/demo/account.drawio', 'utf8');
  const result = await openLocal(content, {
    url: 'http://127.0.0.1:8080/',
    open: async url => { await page.goto(url); }
  });
  expect(result.status).toBe('loaded');
  const editor = page.frameLocator('#editor');
  await expect(editor.locator('.opblock.is-open')).toHaveCount(1);
  await expect(editor.getByRole('region', {name: 'Evidencia y recorrido'})).toBeVisible();
  await editor.getByRole('button', {name: 'Reproducir', exact: true}).click();
  await expect(editor.locator('[data-audit-animation]')).toHaveCount(1);
  await editor.getByRole('button', {name: 'Reiniciar', exact: true}).click();
  const downloadPromise = page.waitForEvent('download');
  const frame = page.frames().find(item => item.url().startsWith('http://127.0.0.1:8080/'));
  await frame.evaluate(() => Draw.loadPlugin(ui => ui.actions.get('save').funct()));
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('ArchiFlow-editado.drawio');
  expect(await readFile(await download.path(), 'utf8')).toContain('auditEvidence');
});
