// BLACK ROYAL — importación de historial desde capturas (cliente, sin subir imágenes al servidor)
let brOcrDraft=[];

function brLoadImage(file){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=reject;
    img.src=URL.createObjectURL(file);
  });
}

function brPrepareCrop(img){
  // El historial del proveedor mostrado por el usuario vive en el panel izquierdo.
  // Recortamos el panel y excluimos cabecera/balance para reducir falsos positivos.
  const sx=0, sy=Math.round(img.height*.065), sw=Math.round(img.width*.29), sh=Math.round(img.height*.905);
  const scale=Math.min(2.2,1800/sw);
  const c=document.createElement('canvas');
  c.width=Math.round(sw*scale); c.height=Math.round(sh*scale);
  const ctx=c.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(img,sx,sy,sw,sh,0,0,c.width,c.height);
  const im=ctx.getImageData(0,0,c.width,c.height),d=im.data;
  // Invertir a fondo claro y aumentar contraste: mejora números blancos/rojos/verdes sobre panel oscuro.
  for(let i=0;i<d.length;i+=4){
    const lum=.299*d[i]+.587*d[i+1]+.114*d[i+2];
    let v=255-lum;
    v=Math.max(0,Math.min(255,(v-128)*1.55+128));
    d[i]=d[i+1]=d[i+2]=v; d[i+3]=255;
  }
  ctx.putImageData(im,0,0);
  return c;
}

function brNumbersFromText(text){
  const lines=String(text||'').split(/\n+/), out=[];
  for(const line of lines){
    // Una fila normal contiene 10 celdas. Conservamos sólo enteros válidos de ruleta.
    const vals=(line.match(/\b\d{1,2}\b/g)||[]).map(v=>String(Number(v))).filter(v=>+v>=0&&+v<=36);
    if(vals.length>=3) out.push(...vals);
  }
  return out;
}

function brOverlap(a,b,max=80){
  const lim=Math.min(max,a.length,b.length);
  for(let n=lim;n>=3;n--){
    if(a.slice(-n).every((v,i)=>v===b[i])) return n;
  }
  return 0;
}

function brJoinSegments(segments){
  let joined=[];
  for(const seg0 of segments.filter(x=>x.length)){
    const seg=[...seg0];
    if(!joined.length){joined=seg;continue}
    const ab=brOverlap(joined,seg), ba=brOverlap(seg,joined);
    if(ab>=ba&&ab){joined.push(...seg.slice(ab));continue}
    if(ba){joined=[...seg,...joined.slice(ba)];continue}
    joined.push(...seg);
  }
  return joined;
}

function brRenderOcrPreview(){
  const box=document.querySelector('#ocrPreview');
  const info=document.querySelector('#ocrInfo');
  if(!box||!info)return;
  box.value=brOcrDraft.join(', ');
  info.textContent=brOcrDraft.length?`Detectados ${brOcrDraft.length} resultados · revisa antes de guardar.`:'No se detectaron resultados todavía.';
  document.querySelector('#ocrConfirmBtn')?.classList.toggle('hidden',!brOcrDraft.length);
}

async function brReadScreenshots(){
  const input=document.querySelector('#historyImages'), status=document.querySelector('#ocrStatus');
  const files=[...(input?.files||[])];
  if(!files.length){status.textContent='Selecciona una o varias capturas.';return}
  if(typeof Tesseract==='undefined'){status.textContent='No se pudo cargar el lector de imágenes. Revisa tu conexión e inténtalo otra vez.';return}
  const btn=document.querySelector('#ocrReadBtn'); if(btn)btn.disabled=true;
  try{
    const segments=[];
    for(let i=0;i<files.length;i++){
      status.textContent=`Leyendo captura ${i+1} de ${files.length}… 0%`;
      const img=await brLoadImage(files[i]), crop=brPrepareCrop(img);
      const result=await Tesseract.recognize(crop,'eng',{
        logger:m=>{if(m.status==='recognizing text')status.textContent=`Leyendo captura ${i+1} de ${files.length}… ${Math.round((m.progress||0)*100)}%`},
        tessedit_char_whitelist:'0123456789 ',
        preserve_interword_spaces:'1'
      });
      const vals=brNumbersFromText(result?.data?.text);
      segments.push(vals);
    }
    brOcrDraft=brJoinSegments(segments);
    brRenderOcrPreview();
    status.textContent=brOcrDraft.length?`Lectura terminada. ${brOcrDraft.length} números encontrados.`:'No pude aislar la cuadrícula. Prueba con una captura donde se vea completo el panel “Últimos resultados”.';
  }catch(e){
    console.error(e); status.textContent='No pude leer esa captura. Intenta con la imagen original, sin recortar ni comprimir.';
  }finally{if(btn)btn.disabled=false}
}

function brConfirmOcr(){
  const box=document.querySelector('#ocrPreview'),status=document.querySelector('#ocrStatus');
  let vals=parseBulk(box.value).filter(v=>valid(v));
  if(vals.length<2){status.textContent='Revisa la lista: necesito al menos 2 números válidos.';return}
  // Las capturas del casino muestran el más reciente primero; la app guarda cronológico.
  if(document.querySelector('#ocrOrder')?.value==='newest') vals.reverse();
  const mode=document.querySelector('#ocrMode')?.value||'replace';
  if(mode==='replace') store[type]={results:vals,rounds:[]};
  else store[type].results.push(...vals);
  save(); locked=null; centers=[]; historyLimit=50; renderAll();
  status.textContent=`Historial ${mode==='replace'?'reemplazado':'actualizado'} con ${vals.length} resultados · último ${store[type].results.at(-1)}.`;
  brOcrDraft=[]; box.value=''; document.querySelector('#historyImages').value='';
  document.querySelector('#ocrConfirmBtn')?.classList.add('hidden');
}

document.querySelector('#ocrReadBtn')?.addEventListener('click',brReadScreenshots);
document.querySelector('#ocrConfirmBtn')?.addEventListener('click',brConfirmOcr);
document.querySelector('#ocrPreview')?.addEventListener('input',e=>{
  brOcrDraft=parseBulk(e.target.value).filter(v=>valid(v));
  document.querySelector('#ocrInfo').textContent=`Lista editada · ${brOcrDraft.length} números válidos.`;
});
