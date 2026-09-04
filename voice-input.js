// BLACK ROYAL ROULETTE V10 — dictado iOS/Safari 0–36
(() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const textarea = document.querySelector('#bulkResults');
  const button = document.querySelector('#voiceBtn');
  const status = document.querySelector('#voiceStatus');
  const interim = document.querySelector('#voiceInterim');
  if (!textarea || !button || !status) return;

  const strip=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  const words={cero:0,uno:1,una:1,un:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,'diez y seis':16,diecisiete:17,'diez y siete':17,dieciocho:18,'diez y ocho':18,diecinueve:19,'diez y nueve':19,veinte:20,veintiuno:21,veintiun:21,'veinte y uno':21,'veinte uno':21,veintidos:22,'veinte y dos':22,'veinte dos':22,veintitres:23,'veinte y tres':23,'veinte tres':23,veinticuatro:24,'veinte y cuatro':24,'veinte cuatro':24,veinticinco:25,'veinte y cinco':25,'veinte cinco':25,veintiseis:26,'veinte y seis':26,'veinte seis':26,veintisiete:27,'veinte y siete':27,'veinte siete':27,veintiocho:28,'veinte y ocho':28,'veinte ocho':28,veintinueve:29,'veinte y nueve':29,'veinte nueve':29,treinta:30,'treinta y uno':31,'treinta uno':31,'treinta y dos':32,'treinta dos':32,'treinta y tres':33,'treinta tres':33,'treinta y cuatro':34,'treinta cuatro':34,'treinta y cinco':35,'treinta cinco':35,'treinta y seis':36,'treinta seis':36};

  function parseSpoken(text){const tokens=strip(text).split(' ').filter(Boolean),out=[];for(let i=0;i<tokens.length;){if(/^\d{1,2}$/.test(tokens[i])){const n=+tokens[i];if(n>=0&&n<=36)out.push(String(n));i++;continue}let ok=false;for(let len=Math.min(4,tokens.length-i);len>=1;len--){const p=tokens.slice(i,i+len).join(' ');if(Object.prototype.hasOwnProperty.call(words,p)){out.push(String(words[p]));i+=len;ok=true;break}}if(!ok)i++}return out}
  function add(nums){if(!nums.length)return;const cur=textarea.value.trim();textarea.value=cur?`${cur}, ${nums.join(', ')}`:nums.join(', ');textarea.dispatchEvent(new Event('input',{bubbles:true}));textarea.scrollTop=textarea.scrollHeight}

  if(!SpeechRecognition){button.disabled=true;button.textContent='🎙 USA EL MICRÓFONO DEL TECLADO';status.textContent='Safari no ofrece reconocimiento directo en este dispositivo. Toca el campo y usa el micrófono del teclado.';return}

  let active=false,recognition=null,lastCycleText='';
  function paint(on){button.classList.toggle('listening',on);button.setAttribute('aria-pressed',on?'true':'false');button.innerHTML=on?'<span class="mic-dot"></span> DETENER DICTADO':'🎙 DICTAR NÚMEROS'}
  function makeRecognition(){const r=new SpeechRecognition();r.lang='es-MX';r.continuous=false;r.interimResults=true;r.maxAlternatives=1;
    r.onstart=()=>{status.textContent='Escuchando… di los números uno tras otro.'};
    r.onresult=e=>{let heard='';for(let i=0;i<e.results.length;i++)heard+=(e.results[i][0]?.transcript||'')+' ';heard=heard.trim();if(!heard)return;lastCycleText=heard;const nums=parseSpoken(heard);if(interim)interim.textContent=`Oyendo: ${heard}`;status.textContent=nums.length?`Detectados: ${nums.join(', ')}`:'Escuchando… todavía no identifico números 0–36.';
      // En iOS escribimos incluso el resultado provisional para confirmar visualmente que Safari sí está entregando voz.
      const existingPreview=textarea.dataset.voicePreview||'';if(existingPreview){const base=textarea.value.slice(0,Math.max(0,textarea.value.length-existingPreview.length)).replace(/[,\s]+$/,'');textarea.value=base}
      if(nums.length){const prefix=textarea.value.trim();const preview=(prefix?', ':'')+nums.join(', ');textarea.value=prefix+preview;textarea.dataset.voicePreview=preview}else textarea.dataset.voicePreview='';
    };
    r.onerror=e=>{if(e.error==='not-allowed'||e.error==='service-not-allowed'){active=false;paint(false);status.textContent='Safari bloqueó el reconocimiento. Revisa el permiso de micrófono del sitio.'}else if(e.error!=='no-speech'&&e.error!=='aborted')status.textContent=`Error de dictado: ${e.error}.`};
    r.onend=()=>{const preview=textarea.dataset.voicePreview||'';if(preview){textarea.dataset.voicePreview='';textarea.dispatchEvent(new Event('input',{bubbles:true}));textarea.scrollTop=textarea.scrollHeight}if(interim)interim.textContent='';if(active)setTimeout(startCycle,180);else status.textContent='Dictado detenido. Revisa la secuencia antes de cargarla.'};return r}
  function startCycle(){if(!active)return;try{recognition=makeRecognition();recognition.start()}catch{setTimeout(()=>{if(active)startCycle()},300)}}
  function start(){if(active)return;active=true;paint(true);status.textContent='Iniciando micrófono…';textarea.dataset.voicePreview='';startCycle()}
  function stop(){active=false;paint(false);textarea.dataset.voicePreview='';try{recognition?.stop()}catch{};status.textContent='Dictado detenido. Revisa la secuencia antes de cargarla.';if(interim)interim.textContent=''}
  button.addEventListener('click',()=>active?stop():start());
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)stop()});
})();