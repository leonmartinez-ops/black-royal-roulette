// BLACK ROYAL ROULETTE V10 — reemplazo robusto de historial
(() => {
  const btn = document.querySelector('#bulkImportBtn');
  const input = document.querySelector('#bulkResults');
  const order = document.querySelector('#bulkOrder');
  const status = document.querySelector('#bulkStatus');
  if (!btn || !input || !order || !status) return;

  function parseValues() {
    return input.value
      .split(/[\s,;→]+/)
      .map(v => v.trim())
      .filter(Boolean)
      .map(v => v === '00' ? '00' : /^\d+$/.test(v) ? String(Number(v)) : v);
  }

  function validValue(n) {
    if (n === '00') return window.localStorage.getItem('brr.type') === 'american';
    const x = Number(n);
    return Number.isInteger(x) && x >= 0 && x <= 36;
  }

  function chronology(vals) {
    // Internamente V10 siempre guarda: más antiguo -> más reciente.
    return order.value === 'newest' ? [...vals].reverse() : [...vals];
  }

  function preview() {
    const vals = parseValues();
    if (!vals.length) {
      status.textContent = 'Pega o dicta una secuencia para verificar su orden.';
      return;
    }
    const bad = vals.filter(n => !validValue(n));
    if (bad.length) {
      status.textContent = `Valores inválidos: ${[...new Set(bad)].join(', ')}`;
      return;
    }
    const internal = chronology(vals);
    status.textContent = `VERIFICACIÓN · Más antiguo: ${internal[0]} · Más reciente: ${internal.at(-1)} · ${internal.length} tiradas`;
  }

  input.addEventListener('input', preview);
  order.addEventListener('change', preview);

  btn.addEventListener('click', e => {
    // Intercepta la versión antigua del manejador para evitar dobles reemplazos.
    e.preventDefault();
    e.stopImmediatePropagation();

    const vals = parseValues();
    const bad = vals.filter(n => !validValue(n));
    if (vals.length < 2 || vals.length > 500 || bad.length) {
      status.textContent = bad.length
        ? `Valores inválidos: ${[...new Set(bad)].join(', ')}`
        : 'Usa entre 2 y 500 resultados.';
      return;
    }

    const internal = chronology(vals);
    const oldest = internal[0];
    const newest = internal.at(-1);
    const target = window.activeTable || 't1';

    // Lee directamente la base persistida para que el reemplazo sea inequívoco.
    const key = 'brr.v10.tables';
    let data;
    try { data = JSON.parse(localStorage.getItem(key)); } catch {}
    if (!data?.tables?.[target]) {
      status.textContent = 'No pude identificar la mesa activa. Vuelve a la pantalla principal, selecciona la mesa y regresa a Carga.';
      return;
    }

    const tableName = data.tables[target].name || 'esta mesa';
    if (!confirm(`Reemplazar ${tableName} con ${internal.length} tiradas?\n\nMás antiguo: ${oldest}\nMás reciente: ${newest}`)) return;

    data.tables[target].results = internal;
    data.tables[target].events = [];
    data.tables[target].version = `manual-${Date.now()}`;
    data.active = target;
    localStorage.setItem(key, JSON.stringify(data));
    if (target === 't1') localStorage.setItem('brr.v10.age.version', data.tables[target].version);

    status.textContent = `Historial reemplazado · Más antiguo: ${oldest} · Más reciente: ${newest} · ${internal.length} tiradas`;
    input.value = '';

    // La V10 mantiene su estado en memoria. Recargamos para que lea exactamente lo recién persistido.
    location.reload();
  }, true);
})();