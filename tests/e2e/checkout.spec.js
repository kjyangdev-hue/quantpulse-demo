const { test, expect } = require('@playwright/test');

/** 模擬結帳：防呆矩陣與正向流程（共用 checkout.js，於儀表板頁驗證） */
test.describe('模擬結帳', () => {
  const fillBase = async (page, overrides = {}) => {
    const v = Object.assign({
      name: '楊測試', number: '4242 4242 4242 4242', exp: '12/28', cvc: '123',
    }, overrides);
    await page.locator('#cc-name').fill(v.name);
    await page.locator('#cc-number').fill(v.number);
    await page.locator('#cc-exp').fill(v.exp);
    await page.locator('#cc-cvc').fill(v.cvc);
  };
  const errOf = (page, inputId) =>
    page.locator(`#${inputId}`).locator('xpath=ancestor::label').locator('.err');

  test.beforeEach(async ({ page }) => {
    await page.goto('/app.html');
    await page.locator('#btn-upgrade').click();
    await expect(page.locator('#checkout-modal')).toHaveClass(/show/);
  });

  test('未帶方案參數時顯示預設 Pro 方案（無 undefined）', async ({ page }) => {
    await expect(page.locator('#plan-label')).toContainText('Pro 月訂閱');
    await expect(page.locator('#plan-price')).toContainText('NT$ 1,290');
    await expect(page.locator('#pay-label')).toContainText('NT$ 1,290');
    await expect(page.locator('#plan-label')).not.toContainText('undefined');
  });

  test('卡號未滿 16 碼送出報錯', async ({ page }) => {
    await fillBase(page, { number: '4242 4242 4242 424' });
    await page.locator('#checkout-form button[type="submit"]').click();
    await expect(errOf(page, 'cc-number')).toContainText('16 碼');
    await expect(page.locator('[data-step="form"]')).toBeVisible();
  });

  test('Luhn 校驗失敗報錯', async ({ page }) => {
    await fillBase(page, { number: '4242 4242 4242 4243' });
    await page.locator('#checkout-form button[type="submit"]').click();
    await expect(errOf(page, 'cc-number')).toContainText('卡號校驗失敗');
  });

  test('過期效期報錯', async ({ page }) => {
    await fillBase(page, { exp: '11/11' });
    await page.locator('#checkout-form button[type="submit"]').click();
    await expect(errOf(page, 'cc-exp')).toContainText('卡片效期已過');
  });

  test('統編格式錯誤報錯（選填但格式要對）', async ({ page }) => {
    await fillBase(page);
    await page.locator('#inv-gui').fill('1234567');
    await page.locator('#checkout-form button[type="submit"]').click();
    await expect(errOf(page, 'inv-gui')).toContainText('8 碼');
  });

  test('正向流程：Loading→成功→發票→Pro 解鎖', async ({ page }) => {
    await fillBase(page);
    await page.locator('#inv-gui').fill('12345678');
    await page.locator('#checkout-form button[type="submit"]').click();
    await expect(page.locator('[data-step="processing"]')).toBeVisible();
    await expect(page.locator('[data-step="success"]')).toBeVisible({ timeout: 6000 });
    await expect(page.locator('#inv-number')).toHaveText(/^[A-Z]{2}-\d{8}$/);
    await expect(page.locator('#inv-method')).toContainText('統編 12345678');
    await page.locator('#checkout-done').click();
    const pro = page.locator('.strategy[data-strategy="pro"]');
    await expect(pro).not.toHaveClass(/locked/);
    await expect(pro.locator('.s-desc')).toContainText('Pro 已解鎖');
  });
});

test('官網定價按鈕帶入方案參數', async ({ page }) => {
  await page.goto('/');
  await page.locator('#pricing').scrollIntoViewIfNeeded();
  await page.locator('.plan.hot [data-open-checkout]').click();
  await expect(page.locator('#checkout-modal')).toHaveClass(/show/);
  await expect(page.locator('#plan-label')).toContainText('Pro 月訂閱');
  await expect(page.locator('#pay-label')).toContainText('NT$ 1,290');
});

test('Pro 資格跨頁保存：官網完成結帳後進 DEMO 仍為解鎖', async ({ page }) => {
  const futureExp = `12/${String((new Date().getFullYear() + 3) % 100).padStart(2, '0')}`;
  await page.goto('/');
  await page.locator('#pricing').scrollIntoViewIfNeeded();
  await page.locator('.plan.hot [data-open-checkout]').click();
  await expect(page.locator('#checkout-modal')).toHaveClass(/show/);
  await page.locator('#cc-name').fill('楊測試');
  await page.locator('#cc-number').fill('4242 4242 4242 4242');
  await page.locator('#cc-exp').fill(futureExp);
  await page.locator('#cc-cvc').fill('123');
  await page.locator('#checkout-form button[type="submit"]').click();
  await expect(page.locator('[data-step="success"]')).toBeVisible({ timeout: 6000 });

  // 同分頁跳轉進 DEMO：Pro 策略卡應仍解鎖，升級入口隱藏（跨頁保存）
  await page.goto('/app.html');
  await expect(page.locator('.strategy[data-strategy="pro"]')).not.toHaveClass(/locked/);
  await expect(page.locator('#btn-upgrade')).toBeHidden();

  // 重新整理 DEMO 頁後仍保持解鎖
  await page.reload();
  await expect(page.locator('.strategy[data-strategy="pro"]')).not.toHaveClass(/locked/);
});
