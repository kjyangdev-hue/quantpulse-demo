const { test, expect } = require('@playwright/test');

/** 官網：真實數據、動效、滾動與 FAQ */
test.describe('官網', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('真實數據載入：badge、hero 數字、跑馬燈', async ({ page }) => {
    await expect(page.locator('#data-badge')).toContainText('真實歷史數據', { timeout: 12000 });
    await expect(page.locator('[data-perf="totalReturn"]')).toContainText('%', { timeout: 8000 });
    await expect(page.locator('#metric-ticker')).toBeVisible();
    await expect(page.locator('#metric-track')).toContainText('2330');
  });

  test('標題解碼動畫最終定格為「系統」', async ({ page }) => {
    await expect(page.locator('#decode-word')).toHaveText('系統', { timeout: 6000 });
  });

  test('滾動：進度條前進、績效帶數字滾入、區塊進場', async ({ page }) => {
    await page.locator('#performance').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-perf="totalReturnPct"]')).toContainText('%', { timeout: 8000 });
    await expect
      .poll(async () => parseFloat(await page.locator('#scroll-progress').evaluate((el) => el.style.width)) || 0)
      .toBeGreaterThan(0);
    await page.locator('#pricing').scrollIntoViewIfNeeded();
    await expect(page.locator('.plan.hot')).toHaveClass(/in/, { timeout: 5000 });
  });

  test('FAQ 手風琴展開', async ({ page }) => {
    await page.locator('#faq').scrollIntoViewIfNeeded();
    const second = page.locator('.faq details').nth(1);
    await second.locator('summary').click();
    await expect(second).toHaveAttribute('open', '');
    await expect(second.locator('.a')).toContainText('Yahoo Finance');
  });

  test('產品展示為即時嵌入且可互動（iframe 內跑 AI 分析）', async ({ page }) => {
    await page.locator('#showcase-live').scrollIntoViewIfNeeded();
    const frame = page.frameLocator('#live-demo');
    await expect(frame.locator('#btn-ai-scan')).toBeVisible({ timeout: 15000 });
    await frame.locator('#btn-ai-scan').click();
    await expect(frame.locator('#signal-table-body tr').first()).toBeVisible({ timeout: 10000 });
  });

  test('官網→儀表板動線', async ({ page }) => {
    await page.locator('.hero-cta a.btn-solid').click();
    await expect(page).toHaveURL(/app\.html$/);
    await expect(page.locator('#btn-ai-scan')).toBeVisible();
  });
});
