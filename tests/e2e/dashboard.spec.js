const { test, expect } = require('@playwright/test');

/** 儀表板核心流程 */
test.describe('儀表板', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app.html');
    await expect(page.locator('#data-badge')).toContainText('數據', { timeout: 12000 });
  });

  test('真實快照載入與資料標示', async ({ page }) => {
    await expect(page.locator('#data-badge')).toContainText('真實歷史數據');
    await expect(page.locator('#stat-price')).not.toHaveText('--');
    await expect(page.locator('#data-note')).toContainText('快照至');
  });

  test('AI 掃描：訊號、績效、匯出鈕（不重新整理）', async ({ page }) => {
    await page.locator('.strategy[data-strategy="ai"]').click();
    await page.locator('#btn-ai-scan').click();
    await expect(page.locator('#signal-table-body tr').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-stat="winRate"]')).not.toContainText('--', { timeout: 5000 });
    await expect(page.locator('#btn-export-csv')).toBeVisible();
    await expect(page.locator('#btn-ai-scan .btn-label')).toHaveText('重新執行 AI 分析');
  });

  test('交易明細與績效分析分頁', async ({ page }) => {
    await page.locator('#btn-ai-scan').click();
    await expect(page.locator('#signal-table-body tr').first()).toBeVisible({ timeout: 8000 });

    await page.locator('[data-pane="trades"]').click();
    await expect(page.locator('#trade-table-body tr').first()).toBeVisible();

    await page.locator('[data-pane="analytics"]').click();
    await expect(page.locator('#chart-equity canvas')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('#chart-monthly canvas')).toBeVisible();
    await expect(page.locator('#compare-table-body tr')).toHaveCount(3);
    await expect(page.locator('[data-metric="profitFactor"]')).not.toHaveText('--');
  });

  test('標的切換：載入新快照並重置分析', async ({ page }) => {
    await page.locator('#btn-ai-scan').click();
    await expect(page.locator('#signal-table-body tr').first()).toBeVisible({ timeout: 8000 });
    const price2330 = await page.locator('#stat-price').textContent();

    await page.locator('#symbol-select').selectOption('btc');
    await expect(page.locator('#stat-price')).not.toHaveText(price2330, { timeout: 8000 });
    await expect(page.locator('#signal-table-body tr')).toHaveCount(0);
    await expect(page.locator('#signal-empty')).toBeVisible();
    await expect(page.locator('[data-stat="winRate"]')).toContainText('--');

    await page.locator('#btn-ai-scan').click();
    await expect(page.locator('#signal-table-body tr').first()).toBeVisible({ timeout: 8000 });
  });

  test('六標的全數可載入', async ({ page }) => {
    for (const key of ['taiex', '0050', '2317', 'nvda', 'btc']) {
      await page.locator('#symbol-select').selectOption(key);
      await expect(page.locator('#data-note')).toContainText('交易日', { timeout: 8000 });
      await expect(page.locator('#stat-price')).not.toHaveText('--');
    }
  });

  test('CSV 匯出可下載', async ({ page }) => {
    await page.locator('#btn-ai-scan').click();
    await expect(page.locator('#btn-export-csv')).toBeVisible({ timeout: 8000 });
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#btn-export-csv').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^quantpulse-signals-.+\.csv$/);
  });

  test('TradingView 即時分頁（第三方，軟性驗證）', async ({ page }) => {
    await page.locator('.chart-tab[data-tab="tv"]').click();
    await expect(page.locator('#tv-chart')).toBeVisible();
    await expect.soft(page.locator('#tv-chart iframe')).toBeAttached({ timeout: 10000 });
    await page.locator('.chart-tab[data-tab="sim"]').click();
    await expect(page.locator('#chart-main')).toBeVisible();
  });
});
