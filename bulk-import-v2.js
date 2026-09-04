// BLACK ROYAL ROULETTE V10 — carga múltiple unificada
(() => {
  const oldBtn = document.querySelector('#bulkImportBtn');
  const input = document.querySelector('#bulkResults');
  const order = document.querySelector('#bulkOrder');
  const status = document.querySelector('#bulkStatus');
  if (!oldBtn || !input || !order || !status) return;

  // Sustituimos el botón para eliminar cualquier listener de versiones anteriores.
  const btn = oldBtn.cloneNode(true);
  oldBtn.replaceWith(btn);

  const parse = () => input.value
    .split(/[\s,;→]+/)
    .map(v => v.trim())
    .filter(Boolean)
    .map(v => v === '00' ? '00' : /^\d+$/.test(v) ? String(Number(v)) : v);

  const normalized = () => {
    const vals = parse();
    return order.value === 'newest' ? [...vals].reverse() : [...vals];
  };

  const isValid = n => rouletteType === 'american'
    ? (n === '00' || (/^\d+$/.test(n) && Number(n) >= 0 && Number(n) <= 36))
    : (/^\d+$/.test(n) && Number(n) >= 0 && Number(n) <= 36);

  function preview() {
    const vals = parse();
    if (!vals.length) {
      status.textContent = 'Pega o dicta una secuencia para verificar su orden.';
      return;
    }
    const bad = vals.filter(n => !isValid(n));
    if (bad.length) {
      status.textContent = `Valores inválidos: ${[...new Set(bad)].join(', ')}`;
      return;
    }
    const list = normalized();
    status.textContent = `VERIFICACIÓN · Más antiguo: ${list[0]} · Más reciente: ${list.at(-1)} · ${list.length} tiradas`;
  }

  input.addEventListener('input', preview);
  order.addEventListener('change', preview);

  btn.addEventListener('click', () => {
    const vals = parse();
    const bad = vals.filter(n => !isValid(n));
    if (vals.length < 2 || vals.length > 500 || bad.length) {
      status.textContent = bad.length
        ? `Valores inválidos: ${[...new Set(bad)].join(', ')}`
        : 'Usa entre 2 y 500 resultados.';
      return;
    }

    const list = normalized();
    const oldest = list[0];
    const newest = list.at(-1);
    const current = db.tables[activeTable];
    if (!current) {
      status.textContent = 'No pude identificar la mesa seleccionada.';
      return;
    }

    if (!confirm(`Reemplazar ${current.name} con ${list.length} tiradas?\n\nMás antiguo: ${oldest}\nMás reciente: ${newest}`)) return;

    // ÚNICA fuente de verdad: el mismo objeto db que usa toda la interfaz.
    current.results = list;
    current.events = [];
    current.version = `manual-${Date.now()}`;
    if (activeTable === 't1') localStorage.setItem(AGE_VERSION_KEY, current.version);
    selectedResult = null;
    saveDB();

    // Redibujamos TODO desde el mismo estado, sin recargar y sin depender de caché.
    renderAll();
    input.value = '';
    status.textContent = `ACTUALIZADO · Más antiguo: ${oldest} · Más reciente: ${newest} · ${list.length} tiradas`;
    toast(`Historial reemplazado: ${list.length} tiradas · último ${newest}`);
    showView('live');
  });

  preview();
})();
