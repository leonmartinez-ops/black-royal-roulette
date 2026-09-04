// BLACK ROYAL ROULETTE V10 — dictado robusto de historial 0–36
(() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const textarea = document.querySelector('#bulkResults');
  const button = document.querySelector('#voiceBtn');
  const status = document.querySelector('#voiceStatus');
  const interim = document.querySelector('#voiceInterim');
  if (!textarea || !button || !status) return;

  const strip = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
  const words = {
    cero:0,uno:1,una:1,un:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,
    dieciseis:16,'diez y seis':16,diecisiete:17,'diez y siete':17,dieciocho:18,'diez y ocho':18,diecinueve:19,'diez y nueve':19,veinte:20,
    veintiuno:21,veintiun:21,'veinte y uno':21,'veinte uno':21,veintidos:22,'veinte y dos':22,'veinte dos':22,veintitres:23,'veinte y tres':23,'veinte tres':23,
    veinticuatro:24,'veinte y cuatro':24,'veinte cuatro':24,veinticinco:25,'veinte y cinco':25,'veinte cinco':25,veintiseis:26,'veinte y seis':26,'veinte seis':26,
    veintisiete:27,'veinte y siete':27,'veinte siete':27,veintiocho:28,'veinte y ocho':28,'veinte ocho':28,veintinueve:29,'veinte y nueve':29,'veinte nueve':29,
    treinta:30,'treinta y uno':31,'treinta uno':31,'treinta y dos':32,'treinta dos':32,'treinta y tres':33,'treinta tres':33,'treinta y cuatro':34,'treinta cuatro':34,
    'treinta y cinco':35,'treinta cinco':35,'treinta y seis':36,'treinta seis':36
  };

  function parseSpoken(text){
    const cleaned=strip(text); if(!cleaned)return[];
    const tokens=cleaned.split(' '),out=[];
    for(let i=0;i<tokens.length;){
      if(/^\d{1,2}$/.test(tokens[i])){const n=+tokens[i];if(n>=0&&n<=36)out.push(String(n));i++;continue}
      let found=false;
      for(let len=Math.min(4,tokens.length-i);len>=1;len--){const p=tokens.slice(i,i+len).join(' ');if(Object.prototype.hasOwnProperty.call(words,p)){out.push(String(words[p]));i+=len;found=true;break}}
      if(!found)i++;
    }
    return out;
  }

  if(!SpeechRecognition){
    button.disabled=true;button.textContent='🎙 MICRÓFONO NO DISPONIBLE';
    status.textContent='Este navegador no ofrece reconocimiento de voz directo. Usa el micrófono del teclado de iPhone/iPad dentro del campo.';return;
  }

  const recognition=new SpeechRecognition();
  recognition.lang='es-MX';recognition.continuous=true;recognition.interimResults=true;recognition.maxAlternatives=3;
  let active=false,restarting=false,baseText='',segments=[];

  function paint(on){button.classList.toggle('listening',on);button.setAttribute('aria-pressed',on?'true':'false');button.innerHTML=on?'<span class="mic-dot"></span> DETENER DICTADO':'🎙 DICTAR NÚMEROS'}
  function writeSession(){
    const spoken=segments.map(x=>x.text).join(' '),nums=parseSpoken(spoken),base=baseText.trim();
    textarea.value=base?(nums.length?`${base}, ${nums.join(', ')}`:base):nums.join(', ');
    textarea.dispatchEvent(new Event('input',{bubbles:true}));textarea.scrollTop=textarea.scrollHeight;
    return nums;
  }
  function beginCycle(){segments=[];baseText=textarea.value.trim();try{recognition.start()}catch{}}
  function start(){if(active)return;active=true;restarting=false;paint(true);status.textContent='Escuchando… los números aparecerán mientras hablas.';if(interim)interim.textContent='Di una secuencia, por ejemplo: 32, 20, 15, 34…';beginCycle()}
  function stop(){active=false;restarting=false;paint(false);try{recognition.stop()}catch{};if(interim)interim.textContent='';status.textContent='Dictado detenido. Revisa la secuencia antes de cargarla al historial.'}
  button.addEventListener('click',()=>active?stop():start());

  recognition.onresult=e=>{
    for(let i=e.resultIndex;i<e.results.length;i++){
      const alt=e.results[i][0]?.transcript||'';
      segments[i]={text:alt,final:e.results[i].isFinal};
    }
    const nums=writeSession();
    const heard=segments.map(x=>x.text).join(' ').trim();
    if(interim)interim.textContent=heard?`Oyendo: ${heard}`:'';
    status.textContent=nums.length?`Detectados ${nums.length}: ${nums.join(', ')}`:'Escuchando… aún no detecto un número entre 0 y 36.';
  };

  recognition.onerror=e=>{
    if(e.error==='not-allowed'||e.error==='service-not-allowed'){
      active=false;paint(false);status.textContent='Permiso de micrófono bloqueado. Autorízalo para este sitio en Safari y vuelve a intentarlo.';
    }else if(e.error!=='no-speech'&&e.error!=='aborted') status.textContent=`El dictado se interrumpió (${e.error}). Toca el micrófono para continuar.`;
  };

  recognition.onend=()=>{
    if(!active||restarting)return;
    // Safari/iOS suele cerrar sesiones cortas. Conservamos lo reconocido y reiniciamos sin duplicarlo.
    restarting=true;baseText=textarea.value.trim();segments=[];
    setTimeout(()=>{restarting=false;if(!active)return;try{recognition.start()}catch{active=false;paint(false);status.textContent='El dictado se detuvo. Toca el micrófono para continuar.'}},220);
  };
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)stop()});
})();