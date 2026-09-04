// BLACK ROYAL — lector estructural de tiradas por cuadrícula
let brOcrDraft=[];
let brOcrCells=[];
let brCropNorm=null;
let brPreviewImage=null;

function brLoadImage(file){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=URL.createObjectURL(file)})}
function brValidNumber(v){if(v==null)return null;const s=String(v).trim();if(/x/i.test(s))return null;const m=s.match(/^\D*(\d{1,2})\D*$/);if(!m)return null;const n=Number(m[1]);return n>=0&&n<=36?String(n):null}

async function brInitCropPreview(){
 const files=[...(document.querySelector('#historyImages')?.files||[])],wrap=document.querySelector('#ocrCropWrap');
 if(!files.length||!wrap)return;
 brPreviewImage=await brLoadImage(files[0]);
 brCropNorm={x:.015,y:.13,w:.285,h:.80};
 wrap.classList.remove('hidden');brDrawCropPreview();
}

function brDrawCropPreview(){
 const c=document.querySelector('#ocrCropCanvas');if(!c||!brPreviewImage)return;
 const maxW=Math.min(720,brPreviewImage.width),scale=maxW/brPreviewImage.width;c.width=maxW;c.height=Math.round(brPreviewImage.height*scale);
 const ctx=c.getContext('2d');ctx.drawImage(brPreviewImage,0,0,c.width,c.height);
 const r=brCropNorm||{x:0,y:0,w:1,h:1};ctx.fillStyle='rgba(0,0,0,.48)';ctx.fillRect(0,0,c.width,c.height);
 const x=r.x*c.width,y=r.y*c.height,w=r.w*c.width,h=r.h*c.height;ctx.drawImage(brPreviewImage,r.x*brPreviewImage.width,r.y*brPreviewImage.height,r.w*brPreviewImage.width,r.h*brPreviewImage.height,x,y,w,h);
 ctx.strokeStyle='#d2aa52';ctx.lineWidth=3;ctx.strokeRect(x,y,w,h);ctx.fillStyle='#d2aa52';for(const [cx,cy] of [[x,y],[x+w,y],[x,y+h],[x+w,y+h]]){ctx.beginPath();ctx.arc(cx,cy,7,0,Math.PI*2);ctx.fill()}
}

function brInstallCropPointer(){
 const c=document.querySelector('#ocrCropCanvas');if(!c||c.dataset.ready)return;c.dataset.ready='1';let start=null;
 c.addEventListener('pointerdown',e=>{const b=c.getBoundingClientRect();start={x:(e.clientX-b.left)/b.width,y:(e.clientY-b.top)/b.height};c.setPointerCapture?.(e.pointerId)});
 c.addEventListener('pointermove',e=>{if(!start)return;const b=c.getBoundingClientRect(),x=(e.clientX-b.left)/b.width,y=(e.clientY-b.top)/b.height;const x0=Math.max(0,Math.min(start.x,x)),y0=Math.max(0,Math.min(start.y,y)),x1=Math.min(1,Math.max(start.x,x)),y1=Math.min(1,Math.max(start.y,y));if(x1-x0>.04&&y1-y0>.04){brCropNorm={x:x0,y:y0,w:x1-x0,h:y1-y0};brDrawCropPreview()}});
 c.addEventListener('pointerup',()=>{start=null});c.addEventListener('pointercancel',()=>{start=null});
}

function brCropCanvas(img){
 const r=brCropNorm||{x:.015,y:.13,w:.285,h:.80};const sx=Math.max(0,Math.round(img.width*r.x)),sy=Math.max(0,Math.round(img.height*r.y)),sw=Math.max(10,Math.round(img.width*r.w)),sh=Math.max(10,Math.round(img.height*r.h));
 const scale=Math.min(3.5,2400/sw),c=document.createElement('canvas');c.width=Math.round(sw*scale);c.height=Math.round(sh*scale);c.getContext('2d').drawImage(img,sx,sy,sw,sh,0,0,c.width,c.height);return c;
}

function brRowLineScore(c){
 const ctx=c.getContext('2d',{willReadFrequently:true}),{data}=ctx.getImageData(0,0,c.width,c.height),scores=new Float32Array(c.height),step=Math.max(1,Math.floor(c.width/500));
 for(let y=0;y<c.height;y++){let s=0,n=0;for(let x=0;x<c.width;x+=step){const i=(y*c.width+x)*4,r=data[i],g=data[i+1],b=data[i+2],lum=.299*r+.587*g+.114*b,ch=Math.max(r,g,b)-Math.min(r,g,b);if(lum>65||ch>28)s++;n++}scores[y]=s/n}
 const sm=new Float32Array(scores.length);for(let y=2;y<scores.length-2;y++)sm[y]=(scores[y-2]+scores[y-1]+scores[y]+scores[y+1]+scores[y+2])/5;return sm;
}

function brDetectRows(c){
 const scores=brRowLineScore(c),cellW=c.width/10,minStep=Math.max(18,Math.floor(cellW*.52)),maxStep=Math.min(Math.floor(cellW*1.18),Math.floor(c.height/3));let best={score:-1,step:minStep,phase:0};
 for(let step=minStep;step<=maxStep;step++){for(let phase=0;phase<step;phase+=2){let s=0,n=0;for(let y=phase;y<scores.length;y+=step){s+=scores[Math.min(scores.length-1,Math.round(y))];n++}const avg=n?s/n:0;if(avg>best.score)best={score:avg,step,phase}}}
 let lines=[];for(let y=best.phase;y<c.height;y+=best.step){let by=Math.round(y),bs=-1;for(let d=-Math.floor(best.step*.18);d<=Math.floor(best.step*.18);d++){const yy=by+d;if(yy>=0&&yy<scores.length&&scores[yy]>bs){bs=scores[yy];by=yy}}if(!lines.length||by-lines.at(-1)>best.step*.55)lines.push(by)}
 if(lines[0]>best.step*.45)lines.unshift(Math.max(0,lines[0]-best.step));if(c.height-lines.at(-1)>best.step*.45)lines.push(Math.min(c.height-1,lines.at(-1)+best.step));
 return lines.slice(0,70);
}

function brMakeRowCanvas(c,y0,y1){
 const pad=Math.max(2,Math.round((y1-y0)*.08)),h=Math.max(4,y1-y0-pad*2),out=document.createElement('canvas'),scale=3;out.width=c.width*scale;out.height=h*scale;const ctx=out.getContext('2d',{willReadFrequently:true});ctx.drawImage(c,0,y0+pad,c.width,h,0,0,out.width,out.height);
 const im=ctx.getImageData(0,0,out.width,out.height),d=im.data;for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2],lum=.299*r+.587*g+.114*b,ch=Math.max(r,g,b)-Math.min(r,g,b);const ink=(lum>120||ch>35)?0:255;d[i]=d[i+1]=d[i+2]=ink;d[i+3]=255}ctx.putImageData(im,0,0);return out;
}

async function brReadRow(rowCanvas){
 const result=await Tesseract.recognize(rowCanvas,'eng',{tessedit_char_whitelist:'0123456789xX ',preserve_interword_spaces:'1',tessedit_pageseg_mode:'6'}),cells=Array(10).fill(null),conf=Array(10).fill(0);
 for(const w of result?.data?.words||[]){const n=brValidNumber(w.text);if(n==null)continue;const b=w.bbox||{},cx=((b.x0||0)+(b.x1||0))/2,col=Math.max(0,Math.min(9,Math.floor(cx/rowCanvas.width*10)));const cf=Number(w.confidence||w.conf||0);if(cells[col]==null||cf>conf[col]){cells[col]=n;conf[col]=cf}}
 // Fallback: el texto puede traer tokens aunque words venga vacío.
 if(cells.filter(Boolean).length<4){const toks=(result?.data?.text||'').split(/\s+/).map(brValidNumber).filter(v=>v!=null);if(toks.length>=7&&toks.length<=10){for(let i=0;i<toks.length;i++)if(cells[i]==null)cells[i]=toks[i]}}
 return cells;
}

function brFlatten(rows){return rows.flat()}
function brKnownCount(arr){return arr.filter(v=>v!=null).length}
function brOverlapCells(a,b,max=180){
 const lim=Math.min(max,a.length,b.length);let best=0;
 for(let n=lim;n>=10;n--){let compared=0,ok=0;for(let i=0;i<n;i++){const x=a[a.length-n+i],y=b[i];if(x==null||y==null)continue;compared++;if(x===y)ok++}if(compared>=6&&ok/compared>=.88){best=n;break}}
 return best;
}
function brJoinCellSegments(segs){let out=[];for(const s of segs){if(!out.length){out=[...s];continue}const ov=brOverlapCells(out,s);if(!ov){out.push(...s);continue}for(let i=0;i<ov;i++){const oi=out.length-ov+i;if(out[oi]==null&&s[i]!=null)out[oi]=s[i]}out.push(...s.slice(ov))}return out}

function brRenderGridPreview(){
 const grid=document.querySelector('#ocrGridPreview'),info=document.querySelector('#ocrInfo'),confirm=document.querySelector('#ocrConfirmBtn'),box=document.querySelector('#ocrPreview');if(!grid)return;
 grid.innerHTML='';brOcrCells.forEach((v,i)=>{const inp=document.createElement('input');inp.inputMode='numeric';inp.maxLength=2;inp.value=v??'';inp.placeholder='?';inp.className=v==null?'uncertain':'';inp.dataset.i=i;inp.addEventListener('input',e=>{const n=brValidNumber(e.target.value);brOcrCells[i]=n;e.target.classList.toggle('uncertain',n==null);brSyncDraft()});grid.appendChild(inp)});brSyncDraft();
 function noop(){}
}
function brSyncDraft(){
 brOcrDraft=brOcrCells.filter(v=>v!=null);const missing=brOcrCells.filter(v=>v==null).length,info=document.querySelector('#ocrInfo'),confirm=document.querySelector('#ocrConfirmBtn'),box=document.querySelector('#ocrPreview');if(box)box.value=brOcrDraft.join(', ');if(info)info.textContent=`${brOcrDraft.length} verificadas · ${missing} por revisar.`;confirm?.classList.toggle('hidden',brOcrDraft.length<2||missing>0);
}

async function brReadScreenshots(){
 const input=document.querySelector('#historyImages'),status=document.querySelector('#ocrStatus'),files=[...(input?.files||[])];if(!files.length){status.textContent='Selecciona una o varias capturas.';return}if(typeof Tesseract==='undefined'){status.textContent='No se cargó el motor OCR. Revisa tu conexión.';return}
 const btn=document.querySelector('#ocrReadBtn');if(btn)btn.disabled=true;
 try{const segs=[];for(let fi=0;fi<files.length;fi++){
   status.textContent=`Preparando captura ${fi+1}/${files.length}…`;const img=await brLoadImage(files[fi]),crop=brCropCanvas(img),lines=brDetectRows(crop),rows=[];
   for(let r=0;r<lines.length-1;r++){if(lines[r+1]-lines[r]<8)continue;status.textContent=`Captura ${fi+1}/${files.length} · fila ${r+1}/${lines.length-1}…`;const vals=await brReadRow(brMakeRowCanvas(crop,lines[r],lines[r+1]));if(brKnownCount(vals)>=2)rows.push(vals)}
   const flat=brFlatten(rows);segs.push(flat);status.textContent=`Captura ${fi+1}: ${brKnownCount(flat)} números · ${flat.filter(v=>v==null).length} celdas dudosas.`;
  }
  brOcrCells=brJoinCellSegments(segs);while(brOcrCells.length&&brOcrCells.at(-1)==null)brOcrCells.pop();brRenderGridPreview();const missing=brOcrCells.filter(v=>v==null).length;status.textContent=`Lectura estructural terminada: ${brKnownCount(brOcrCells)} números detectados${missing?` · ${missing} celdas requieren revisión`:''}.`;
 }catch(e){console.error(e);status.textContent='No pude reconstruir la cuadrícula. Ajusta el marco dorado para incluir sólo las celdas de “Últimos resultados” y vuelve a leer.'}finally{if(btn)btn.disabled=false}
}

function brConfirmOcr(){const status=document.querySelector('#ocrStatus');if(brOcrCells.some(v=>v==null)){status.textContent='Corrige primero todas las celdas marcadas con ?.';return}let vals=[...brOcrCells];if(vals.length<2)return;if(document.querySelector('#ocrOrder')?.value==='newest')vals.reverse();const mode=document.querySelector('#ocrMode')?.value||'replace';if(mode==='replace')store[type]={results:vals,rounds:[]};else store[type].results.push(...vals);save();locked=null;centers=[];historyLimit=50;renderAll();status.textContent=`Historial ${mode==='replace'?'reemplazado':'actualizado'} con ${vals.length} resultados.`;brOcrCells=[];brOcrDraft=[];document.querySelector('#ocrGridPreview').innerHTML='';document.querySelector('#historyImages').value='';document.querySelector('#ocrConfirmBtn')?.classList.add('hidden')}

document.querySelector('#historyImages')?.addEventListener('change',()=>{brInitCropPreview().then(brInstallCropPointer)});document.querySelector('#ocrReadBtn')?.addEventListener('click',brReadScreenshots);document.querySelector('#ocrConfirmBtn')?.addEventListener('click',brConfirmOcr);brInstallCropPointer();