// BLACK ROYAL ROULETTE V10 — dictado de historial 0–36
(() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const textarea = document.querySelector('#bulkResults');
  const button = document.querySelector('#voiceBtn');
  const status = document.querySelector('#voiceStatus');
  const interim = document.querySelector('#voiceInterim');
  if (!textarea || !button || !status) return;

  const strip = s => String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();

  const words = {
    'cero':0,'uno':1,'una':1,'un':1,'dos':2,'tres':3,'cuatro':4,'cinco':5,'seis':6,'siete':7,'ocho':8,'nueve':9,
    'diez':10,'once':11,'doce':12,'trece':13,'catorce':14,'quince':15,'dieciseis':16,'diez y seis':16,
    'diecisiete':17,'diez y siete':17,'dieciocho':18,'diez y ocho':18,'diecinueve':19,'diez y nueve':19,
    'veinte':20,'veintiuno':21,'veintiun':21,'veinte y uno':21,'veinte uno':21,'veintidos':22,'veinte y dos':22,'veinte dos':22,
    'veintitres':23,'veinte y tres':23,'veinte tres':23,'veinticuatro':24,'veinte y cuatro':24,'veinte cuatro':24,
    'veinticinco':25,'veinte y cinco':25,'veinte cinco':25,'veintiseis':26,'veinte y seis':26,'veinte seis':26,
    'veintisiete':27,'veinte y siete':27,'veinte siete':27,'veintiocho':28,'veinte y ocho':28,'veinte ocho':28,
    'veintinueve':29,'veinte y nueve':29,'veinte nueve':29,'treinta':30,'treinta y uno':31,'treinta uno':31,
    'treinta y dos':32,'treinta dos':32,'treinta y tres':33,'treinta tres':33,'treinta y cuatro':34,'treinta cuatro':34,
    'treinta y cinco':35,'treinta cinco':35,'treinta y seis':36,'treinta seis':36
  };
  const fillers = new Set(['numero','numeros','coma','comas','siguiente','siguientes','resultado','resultados','salio','sale','despues','luego','y']);

  function parseSpoken(text) {
    const cleaned = strip(text);
    if (!cleaned) return [];
    const tokens = cleaned.split(' ');
    const out = [];
    for (let i = 0; i < tokens.length;) {
      const t = tokens[i];
      if (/^\d{1,2}$/.test(t)) {
        const n = Number(t);
        if (n >= 0 && n <= 36) out.push(String(n));
        i++; continue;
      }
      let matched = false;
      for (let len = Math.min(4, tokens.length - i); len >= 1; len--) {
        const phrase = tokens.slice(i, i + len).join(' ');
        if (Object.prototype.hasOwnProperty.call(words, phrase)) {
          out.push(String(words[phrase]));
          i += len; matched = true; break;
        }
      }
      if (!matched) i++;
    }
    return out;
  }

  function appendNumbers(nums) {
    if (!nums.length) return;
    const current = textarea.value.trim();
    textarea.value = current ? `${current}, ${nums.join(', ')}` : nums.join(', ');
    textarea.dispatchEvent(new Event('input', { bubbles:true }));
    textarea.scrollTop = textarea.scrollHeight;
  }

  if (!SpeechRecognition) {
    button.disabled = true;
    button.textContent = '🎙 MICRÓFONO NO DISPONIBLE';
    status.textContent = 'Este navegador no ofrece reconocimiento de voz directo. Puedes tocar el campo y usar el micrófono del teclado de iPhone/iPad.';
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'es-MX';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  let active = false;
  let restarting = false;

  function paint(on) {
    button.classList.toggle('listening', on);
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
    button.innerHTML = on ? '<span class="mic-dot"></span> DETENER DICTADO' : '🎙 DICTAR NÚMEROS';
  }

  function start() {
    if (active) return;
    active = true; restarting = false; paint(true);
    status.textContent = 'Escuchando… di los números uno tras otro. Ejemplo: “32, 20, 15, 34, 6”.';
    try { recognition.start(); }
    catch { /* Safari puede seguir cerrando una sesión anterior */ }
  }

  function stop() {
    active = false; restarting = false; paint(false);
    if (interim) interim.textContent = '';
    status.textContent = 'Dictado detenido. Revisa la secuencia antes de cargarla al historial.';
    try { recognition.stop(); } catch {}
  }

  button.addEventListener('click', () => active ? stop() : start());

  recognition.onresult = e => {
    let preview = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const transcript = e.results[i][0]?.transcript || '';
      if (e.results[i].isFinal) {
        const nums = parseSpoken(transcript);
        appendNumbers(nums);
        status.textContent = nums.length
          ? `Añadidos ${nums.length}: ${nums.join(', ')}`
          : `No reconocí números válidos en: “${transcript.trim()}”`;
      } else preview += transcript;
    }
    if (interim) interim.textContent = preview ? `Oyendo: ${preview.trim()}` : '';
  };

  recognition.onerror = e => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      active = false; paint(false);
      status.textContent = 'Permiso de micrófono bloqueado. Autoriza el micrófono para este sitio en Safari y vuelve a intentarlo.';
    } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
      status.textContent = `El dictado se interrumpió (${e.error}). Toca el micrófono para continuar.`;
    }
  };

  recognition.onend = () => {
    if (!active || restarting) return;
    restarting = true;
    setTimeout(() => {
      restarting = false;
      if (!active) return;
      try { recognition.start(); }
      catch { active = false; paint(false); status.textContent = 'El dictado se detuvo. Toca el micrófono para continuar.'; }
    }, 250);
  };

  document.addEventListener('visibilitychange', () => { if (document.hidden && active) stop(); });
})();
