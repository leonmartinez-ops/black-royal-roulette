// BLACK ROYAL — importación de historial desde capturas (cliente, sin subir imágenes al servidor)
let brOcrDraft=[];
function brLoadImage(file){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=URL.createObjectURL(file)})}

function brMakeCrop(img,variant=0){
 // El proveedor coloca “Últimos resultados” en el panel izquierdo. Tomamos una zona amplia
 // para soportar cambios de altura/encuadre y luego ordenamos por coordenadas OCR.
 const sx=0, sy=Math.round(img.height*.055), sw=Math.round(img.width*.31), sh=Math.round(img.height*.92);
 const scale=Math.min(3.4,2400/sw);const c=document.createElement('canvas');c.width=Math.round(sw*scale);c.height=Math.round(sh*scale);
 const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,sx,sy,sw,sh,0,0,c.width,c.height);
 if(variant===0)return c;
 const im=ctx.getImageData(0,0,c.width,c.height),d=im.data;
 for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2],lum=.299*r+.587*g+.114*b,max=Math.max(r,g,b),min=Math.min(r,g,b);let v;
   if(variant===1){v=lum>105?0:255;}
   else {v=(max-min>28&&max>90)?0:(lum>135?0:255);}
   d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;
 }
 ctx.putImageData(im,0,0);return c;
}

function brCleanNumber(s){const m=String(s||'').replace(/[^0-9]/g,'');if(!m)return null;const n=Number(m);return n>=0&&n<=36?String(n):null}

function brWordsToGrid(words,w,h){
 const pts=[];
 for(const wd of words||[]){const n=brCleanNumber(wd.text);if(n==null)continue;const b=wd.bbox||{};const x=((b.x0||0)+(b.x1||0))/2,y=((b.y0||0)+(b.y1||0))/2;
   // Quita cabecera y pie; la cuadrícula ocupa la zona central/inferior del panel.
   if(x<w*.02||x>w*.98||y<h*.10||y>h*.985)continue;pts.push({n,x,y,conf:Number(wd.confidence||wd.conf||0)});
 }
 if(!pts.length)return [];
 // Agrupa por filas usando tolerancia basada en altura de imagen y ordena izquierda→derecha.
 pts.sort((a,b)=>a.y-b.y||a.x-b.x);const rows=[];const tol=Math.max(12,h*.012);
 for(const p of pts){let row=rows.find(r=>Math.abs(r.y-p.y)<=tol);if(!row){row={y:p.y,items:[]};rows.push(row)}row.items.push(p);row.y=row.items.reduce((s,q)=>s+q.y,0)/row.items.length}
 rows.sort((a,b)=>a.y-b.y);const out=[];
 for(const r of rows){r.items.sort((a,b)=>a.x-b.x);const ded=[];for(const p of r.items){if(!ded.some(q=>Math.abs(q.x-p.x)<w*.018))ded.push(p)}
   // Una fila real suele tener hasta 10 celdas; descartamos filas aisladas de UI.
   if(ded.length>=3)out.push(...ded.slice(0,10).map(p=>p.n));
 }
 return out;
}

function brOverlap(a,b,max=140){const lim=Math.min(max,a.length,b.length);for(let n=lim;n>=4;n--)if(a.slice(-n).every((v,i)=>v===b[i]))return n;return 0}
function brJoinSegments(segments){let joined=[];for(const seg0 of segments.filter(x=>x.length)){const seg=[...seg0];if(!joined.length){joined=seg;continue}const ab=brOverlap(joined,seg),ba=brOverlap(seg,joined);if(ab>=ba&&ab){joined.push(...seg.slice(ab));continue}if(ba){joined=[...seg,...joined.slice(ba)];continue}joined.push(...seg)}return joined}
function brRenderOcrPreview(){const box=document.querySelector('#ocrPreview'),info=document.querySelector('#ocrInfo');if(!box||!info)return;box.value=brOcrDraft.join(', ');info.textContent=brOcrDraft.length?`Detectados ${brOcrDraft.length} resultados · revisa antes de guardar.`:'No se detectaron resultados todavía.';document.querySelector('#ocrConfirmBtn')?.classList.toggle('hidden',!brOcrDraft.length)}

async function brRecognize(canvas,psm,logger){const result=await Tesseract.recognize(canvas,'eng',{logger,tessedit_char_whitelist:'0123456789 ',preserve_interword_spaces:'1',tessedit_pageseg_mode:String(psm)});return brWordsToGrid(result?.data?.words,canvas.width,canvas.height)}

function brBestPass(passes){passes.sort((a,b)=>b.length-a.length);return passes[0]||[]}

async function brReadScreenshots(){
 const input=document.querySelector('#historyImages'),status=document.querySelector('#ocrStatus'),files=[...(input?.files||[])];
 if(!files.length){status.textContent='Selecciona una o varias capturas.';return}
 if(typeof Tesseract==='undefined'){status.textContent='No se pudo cargar el lector de imágenes. Revisa tu conexión e inténtalo otra vez.';return}
 const btn=document.querySelector('#ocrReadBtn');if(btn)btn.disabled=true;
 try{const segments=[];
  for(let i=0;i<files.length;i++){
    const img=await brLoadImage(files[i]),passes=[];
    for(let variant=0;variant<3;variant++){
      const crop=brMakeCrop(img,variant);for(const psm of [6,11]){
        status.textContent=`Captura ${i+1}/${files.length} · lectura ${variant*2+(psm===11?2:1)}/6…`;
        const vals=await brRecognize(crop,psm,m=>{if(m.status==='recognizing text')status.textContent=`Captura ${i+1}/${files.length} · ${Math.round((m.progress||0)*100)}%`});passes.push(vals);
      }
    }
    const best=brBestPass(passes);segments.push(best);status.textContent=`Captura ${i+1}/${files.length}: ${best.length} números detectados.`;
  }
  brOcrDraft=brJoinSegments(segments);brRenderOcrPreview();
  status.textContent=brOcrDraft.length?`Lectura terminada. ${brOcrDraft.length} números encontrados en ${files.length} captura${files.length>1?'s':''}. Revísalos antes de guardar.`:'No pude detectar suficientes celdas. Prueba subiendo una captura a la vez y, si hace falta, recórtala dejando sólo “Últimos resultados”.';
 }catch(e){console.error(e);status.textContent='No pude leer esa captura. Prueba con la imagen original o recórtala dejando sólo “Últimos resultados”.'}finally{if(btn)btn.disabled=false}
}

function brConfirmOcr(){const box=document.querySelector('#ocrPreview'),status=document.querySelector('#ocrStatus');let vals=parseBulk(box.value).filter(v=>valid(v));if(vals.length<2){status.textContent='Revisa la lista: necesito al menos 2 números válidos.';return}if(document.querySelector('#ocrOrder')?.value==='newest')vals.reverse();const mode=document.querySelector('#ocrMode')?.value||'replace';if(mode==='replace')store[type]={results:vals,rounds:[]};else store[type].results.push(...vals);save();locked=null;centers=[];historyLimit=50;renderAll();status.textContent=`Historial ${mode==='replace'?'reemplazado':'actualizado'} con ${vals.length} resultados · último ${store[type].results.at(-1)}.`;brOcrDraft=[];box.value='';document.querySelector('#historyImages').value='';document.querySelector('#ocrConfirmBtn')?.classList.add('hidden')}

document.querySelector('#ocrReadBtn')?.addEventListener('click',brReadScreenshots);document.querySelector('#ocrConfirmBtn')?.addEventListener('click',brConfirmOcr);document.querySelector('#ocrPreview')?.addEventListener('input',e=>{brOcrDraft=parseBulk(e.target.value).filter(v=>valid(v));document.querySelector('#ocrInfo').textContent=`Lista editada · ${brOcrDraft.length} números válidos.`});