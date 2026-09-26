const { test, expect } = require('@playwright/test');

test('RELEASE GATE: Restaurante Pruebas carga correctamente desde GitHub Pages', async ({ page }) => {
  test.skip(!process.env.PAGES_TEST_URL, 'PAGES_TEST_URL solo existe en el smoke externo');

  const pageErrors = [];
  const serverErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error?.message || error)));
  page.on('response', (response) => {
    if (response.status() >= 500 && response.url().startsWith(process.env.PAGES_TEST_URL)) {
      serverErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  const response = await page.goto(process.env.PAGES_TEST_URL, { waitUntil: 'domcontentloaded' });
  expect(response?.ok(), 'Restaurante Pruebas no respondió correctamente').toBeTruthy();
  await expect(page.locator('body')).not.toBeEmpty();

  const html = await page.content();
  expect(html, 'Restaurante Pruebas debe contener la configuración de Supabase Staging').toContain('wodqqheeesrelsbacmgx');
  expect(page.url()).toContain('/yummy-restaurante-pruebas/');

  expect(pageErrors, `Errores JavaScript detectados: ${pageErrors.join(' | ')}`).toEqual([]);
  expect(serverErrors, `Errores 5xx detectados: ${serverErrors.join(' | ')}`).toEqual([]);
});
