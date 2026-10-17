// Mockup behaviour only: theme override, Add-to-stepper, Cart totals, recipe total.
// Money stays integer centavos (ADR 0002) and is formatted only when painted.
(() => {
  const theme = new URLSearchParams(location.search).get('theme');
  if (theme === 'dark' || theme === 'light') document.documentElement.dataset.theme = theme;

  const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
  const fmt = (centavos) => peso.format(centavos / 100);
  const FEE = 5900;
  const FREE_FROM = 150000;

  const live = document.getElementById('live');
  const say = (msg) => { if (live) live.textContent = msg; };

  const cart = document.querySelector('[data-cart]');
  let count = cart ? Number(cart.dataset.count) : 0;
  let total = cart ? Number(cart.dataset.total) : 0;

  const paint = (sel, text) => document.querySelectorAll(sel).forEach((el) => { el.textContent = text; });
  const paintCart = () => {
    const fee = total >= FREE_FROM ? 0 : FEE;
    paint('[data-cart-count]', count);
    paint('[data-cart-total]', fmt(total));
    paint('[data-cart-fee]', fee ? fmt(fee) : 'Free');
    paint('[data-cart-grand]', fmt(total + fee));
    paint('[data-free-left]', fee ? `Add ${fmt(FREE_FROM - total)} more for free delivery.` : 'Free delivery unlocked for this order.');
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-step]');
    if (!btn) return;
    const box = btn.closest('[data-qty]');
    const before = Number(box.dataset.qty);
    const next = Math.max(Number(box.dataset.min || 0), before + Number(btn.dataset.step));
    if (next === before) return;
    box.dataset.qty = next;

    const out = box.querySelector('output');
    if (out) {
      out.textContent = next;
      out.classList.remove('bump');
      void out.offsetWidth; // restart the bump animation
      out.classList.add('bump');
    }
    paint(`[data-qty-of="${box.id}"]`, next);

    if (box.dataset.price) {
      count += next - before;
      total += (next - before) * Number(box.dataset.price);
      paintCart();
      const line = box.dataset.lineTotal && document.getElementById(box.dataset.lineTotal);
      if (line) line.textContent = fmt(next * Number(box.dataset.price));
    }
    if (box.dataset.name) say(next ? `${box.dataset.name}, ${next} in cart` : `${box.dataset.name} removed from cart`);

    // Keep focus on a visible control when Add and the stepper swap places
    if (btn.classList.contains('add')) box.querySelector('.stepper [data-step="1"]')?.focus();
    else if (next === 0) box.querySelector('.add')?.focus();
  });

  const recipe = document.querySelector('[data-recipe]');
  if (recipe) {
    const sync = () => {
      const picked = [...recipe.querySelectorAll('input[type="checkbox"]:checked')];
      const sum = picked.reduce((s, i) => s + Number(i.dataset.price), 0);
      paint('[data-recipe-count]', picked.length);
      paint('[data-recipe-total]', fmt(sum));
    };
    recipe.addEventListener('change', sync);
    sync();
  }
})();
