/**
 * QuantPulse 共用結帳模組（模擬金流）——自帶樣式與 DOM，注入後即用。
 * 依賴：logic.js（QP 驗證工具）。
 * 用法：任何帶 data-open-checkout 的元素點擊即開窗；
 *       可用 data-plan-name / data-plan-desc / data-plan-price / data-plan-period 覆寫方案；
 *       結帳成功後會呼叫 window.onCheckoutSuccess()（若頁面有定義）。
 */
(function () {
  'use strict';

  const CSS = `
/* ============ 結帳 Modal ============ */
.modal-backdrop{
  position:fixed;inset:0;z-index:450;display:grid;place-items:center;padding:18px;
  background:rgba(4,8,14,.66);backdrop-filter:blur(6px);
  opacity:0;pointer-events:none;transition:opacity .25s;
}
.modal-backdrop.show{opacity:1;pointer-events:auto}
.modal{
  width:min(440px,100%);max-height:92vh;overflow-y:auto;
  background:var(--panel-solid);border:1px solid var(--border-strong);border-radius:var(--radius);
  box-shadow:0 30px 80px -20px rgba(0,0,0,.7);
  transform:translateY(12px);transition:transform .25s ease-out;
}
.modal-backdrop.show .modal{transform:none}
.m-step{padding:24px 26px 26px}
.m-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px}
.m-eyebrow{font-family:var(--font-mono);font-size:.66rem;letter-spacing:.22em;color:var(--brand)}
.m-head h2{font-size:1.25rem;font-weight:700;margin-top:2px}
.m-close{background:none;border:none;color:var(--ink-3);font-size:1.5rem;line-height:1;padding:4px;transition:color .15s}
.m-close:hover{color:var(--ink)}
.m-plan{
  display:flex;justify-content:space-between;align-items:center;font-size:.84rem;color:var(--ink-2);
  border:1px solid var(--brand);border-radius:var(--radius);padding:11px 14px;margin-bottom:16px;
}
.m-plan b{font-family:var(--font-mono);font-size:1.05rem;color:var(--ink);white-space:nowrap;margin-left:10px}
.m-plan small{font-size:.7rem;color:var(--ink-3);font-weight:400}
#checkout-form label{display:block;font-size:.78rem;color:var(--ink-2);margin-bottom:8px}
#checkout-form input{
  display:block;width:100%;height:44px;margin-top:4px;padding:0 13px;font-size:.95rem;color:var(--ink);
  font-family:var(--font-mono);background:var(--panel-2);border:1px solid var(--border);border-radius:var(--radius);
  outline:2px solid transparent;outline-offset:1px;transition:border-color .15s,outline-color .15s;
}
#checkout-form input::placeholder{color:var(--ink-3);opacity:.55}
#checkout-form input:focus{outline:2px solid var(--brand)}
#checkout-form label.invalid input{border-color:var(--up);outline-color:transparent;animation:shake .3s}
#checkout-form .err{display:block;min-height:1.2em;font-size:.72rem;color:var(--up);margin-top:3px;visibility:hidden}
#checkout-form label.invalid .err{visibility:visible}
@keyframes shake{20%,60%{transform:translateX(-5px)}40%,80%{transform:translateX(5px)}}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.m-divider{
  display:flex;align-items:center;gap:10px;font-family:var(--font-mono);font-size:.68rem;
  letter-spacing:.16em;color:var(--ink-3);margin:16px 0 12px;
}
.m-divider::before,.m-divider::after{content:"";flex:1;height:1px;background:var(--border)}
.m-pay{margin-top:6px}
.m-secure{text-align:center;font-size:.72rem;color:var(--ink-3);margin-top:12px}
/* processing */
.m-processing{text-align:center;padding:46px 26px 50px}
.m-processing .big-spin{
  width:52px;height:52px;margin:0 auto 18px;border-radius:50%;
  border:3px solid color-mix(in srgb,var(--brand) 20%,transparent);border-top-color:var(--brand);
  animation:spin .8s linear infinite;
}
.m-processing h3{font-size:1.05rem;font-weight:700;margin-bottom:6px}
.m-processing p{font-size:.8rem;color:var(--ink-3);font-family:var(--font-mono)}
/* success */
.m-success{text-align:center;padding:40px 26px 34px}
.m-success .check{width:74px;height:74px;margin:0 auto 16px}
.m-success .check circle{stroke:var(--brand);stroke-width:2.4;fill:none;stroke-dasharray:214;stroke-dashoffset:214;animation:draw .7s .1s forwards}
.m-success .check path{stroke:var(--brand);stroke-width:3;fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:60;stroke-dashoffset:60;animation:draw .45s .65s forwards}
@keyframes draw{to{stroke-dashoffset:0}}
.m-success h3{font-size:1.3rem;font-weight:700}
.m-success .inv{
  margin:16px auto 6px;max-width:300px;text-align:left;font-size:.8rem;color:var(--ink-2);
  border:1px dashed var(--border-strong);border-radius:var(--radius);padding:13px 16px;line-height:2;
}
.m-success .inv b{font-family:var(--font-mono);color:var(--ink);float:right}
.m-success .sub-note{font-size:.72rem;color:var(--ink-3);margin-top:10px}
.m-done{margin-top:18px;width:100%}
`;

  const HTML = `
<!-- Pro 訂閱模擬結帳 -->
<div class="modal-backdrop" id="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
  <div class="modal">
    <section class="m-step" data-step="form">
      <header class="m-head">
        <div>
          <span class="m-eyebrow">QUANTPULSE PRO</span>
          <h2 id="checkout-title">升級 Pro 訂閱</h2>
        </div>
        <button class="m-close" id="checkout-close" aria-label="關閉結帳視窗">×</button>
      </header>
      <div class="m-plan">
        <span id="plan-label">Pro 月訂閱<br>解鎖全部 AI 策略與即時訊號</span>
        <b id="plan-price">NT$ 1,290<small> /月</small></b>
      </div>
      <form id="checkout-form" novalidate>
        <label>持卡人姓名
          <input id="cc-name" autocomplete="cc-name" placeholder="王小明">
          <span class="err"></span>
        </label>
        <label>信用卡卡號
          <input id="cc-number" inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242">
          <span class="err"></span>
        </label>
        <div class="row2">
          <label>有效期限
            <input id="cc-exp" inputmode="numeric" placeholder="MM/YY" maxlength="5">
            <span class="err"></span>
          </label>
          <label>安全碼
            <input id="cc-cvc" inputmode="numeric" placeholder="123" maxlength="3">
            <span class="err"></span>
          </label>
        </div>
        <div class="m-divider">電子發票（模擬開立）</div>
        <label>統一編號（選填，公司戶報帳）
          <input id="inv-gui" inputmode="numeric" placeholder="12345678" maxlength="8">
          <span class="err"></span>
        </label>
        <label>手機條碼載具（選填）
          <input id="inv-carrier" placeholder="/ABC1234" maxlength="8">
          <span class="err"></span>
        </label>
        <button type="submit" class="btn-scan m-pay">[ <span class="btn-label" id="pay-label">確認付款 NT$ 1,290</span> ]</button>
        <p class="m-secure"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="vertical-align:-1px" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg> 此為模擬結帳視窗，不會進行任何實際請款</p>
      </form>
    </section>

    <section class="m-step m-processing" data-step="processing" hidden>
      <div class="big-spin"></div>
      <h3>正在處理付款…</h3>
      <p>銀行 3D 驗證・模擬流程</p>
    </section>

    <section class="m-step m-success" data-step="success" hidden>
      <svg class="check" viewBox="0 0 74 74">
        <circle cx="37" cy="37" r="34"/>
        <path d="M23 38.5 L33 48 L52 28"/>
      </svg>
      <h3>付款成功！</h3>
      <p style="color:var(--ink-2);font-size:.9rem;margin-top:4px">已自動開立電子發票（模擬）</p>
      <div class="inv">
        <div>發票號碼 <b id="inv-number">--</b></div>
        <div>開立方式 <b id="inv-method">--</b></div>
        <div>金額 <b id="inv-amount">NT$ 1,290</b></div>
      </div>
      <p class="sub-note" id="checkout-success-note">本視窗為前端展示，未進行任何實際交易</p>
      <button class="btn-scan m-done" id="checkout-done">[ <span class="btn-label">開始使用 Pro</span> ]</button>
    </section>
  </div>
</div>
`;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
  document.body.insertAdjacentHTML('beforeend', HTML);


  const backdrop = document.getElementById('checkout-modal');
  const form = document.getElementById('checkout-form');
  const steps = backdrop.querySelectorAll('.m-step');
  const $ = (id) => document.getElementById(id);
  const DEFAULT_PLAN = { name: 'Pro 月訂閱', desc: '解鎖全部 AI 策略與即時訊號', price: 'NT$ 1,290', period: '/月' };
  let processing = false;

  function goStep(name) {
    steps.forEach((s) => { s.hidden = s.dataset.step !== name; });
  }
  function openCheckout(plan) {
    const p = Object.assign({}, DEFAULT_PLAN, plan || {});
    $('plan-label').innerHTML = `${p.name}<br>${p.desc}`;
    $('plan-price').innerHTML = `${p.price}<small> ${p.period}</small>`;
    $('pay-label').textContent = `確認付款 ${p.price}`;
    $('inv-amount').textContent = p.price;
    goStep('form');
    backdrop.classList.add('show');
    setTimeout(() => $('cc-name').focus(), 260);
  }
  function closeCheckout() {
    if (processing) return; // 模擬請款中不可關閉
    backdrop.classList.remove('show');
  }
  window.openCheckout = openCheckout;
  document.querySelectorAll('[data-open-checkout]').forEach((btn) => {
    btn.addEventListener('click', () => openCheckout({
      name: btn.dataset.planName, desc: btn.dataset.planDesc,
      price: btn.dataset.planPrice, period: btn.dataset.planPeriod,
    }));
  });
  $('checkout-close').addEventListener('click', closeCheckout);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeCheckout(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && backdrop.classList.contains('show')) closeCheckout();
  });

  /* 輸入即時格式化 */
  $('cc-number').addEventListener('input', (e) => { e.target.value = QP.formatCardNumber(e.target.value); });
  $('cc-cvc').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3); });
  $('inv-gui').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8); });
  $('cc-exp').addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 3) v = `${v.slice(0, 2)}/${v.slice(2)}`;
    e.target.value = v;
  });
  $('inv-carrier').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase().slice(0, 8);
  });

  function setError(input, message) {
    const label = input.closest('label');
    label.classList.remove('invalid');
    if (message) {
      label.querySelector('.err').textContent = message;
      void label.offsetWidth; // 重觸發 shake 動畫
      label.classList.add('invalid');
      return false;
    }
    return true;
  }

  function validateForm() {
    let firstBad = null;
    const check = (input, ok, msg) => {
      if (!setError(input, ok ? '' : msg) && !firstBad) firstBad = input;
    };
    check($('cc-name'), $('cc-name').value.trim().length >= 2, '請輸入持卡人姓名');
    const card = QP.validateCard($('cc-number').value);
    check($('cc-number'), card.valid, card.error || '');
    check($('cc-exp'), /^(0[1-9]|1[0-2])\/\d{2}$/.test($('cc-exp').value), '格式需為 MM/YY');
    check($('cc-cvc'), /^\d{3}$/.test($('cc-cvc').value), '需為 3 碼數字');
    const gui = QP.validateGui($('inv-gui').value);
    check($('inv-gui'), gui.valid, gui.error || '');
    const carrier = $('inv-carrier').value.trim();
    check($('inv-carrier'), carrier === '' || /^\/[0-9A-Z.+-]{7}$/.test(carrier), '手機條碼格式如 /ABC1234');
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    processing = true;
    goStep('processing');
    setTimeout(() => {
      $('inv-number').textContent = QP.mockInvoiceNumber(Math.random);
      const gui = $('inv-gui').value.trim();
      const carrier = $('inv-carrier').value.trim();
      $('inv-method').textContent = gui ? `統編 ${gui}` : (carrier ? `載具 ${carrier}` : '會員載具（雲端發票）');
      processing = false;
      goStep('success');
      if (typeof window.onCheckoutSuccess === 'function') window.onCheckoutSuccess();
    }, 2200);
  });

  $('checkout-done').addEventListener('click', () => backdrop.classList.remove('show'));

})();
