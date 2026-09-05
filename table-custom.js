// V10 — mesas europeas autónomas: color, nombre, carga y nuevo historial
function renderTables(){
  const wrap=$('#tableList');
  if(!wrap)return;
  wrap.innerHTML=Object.entries(db.tables).map(([id,t],i)=>`
    <div class="table-slot table-tone-${i+1} ${id===activeTable?'active':''}">
      <button type="button" class="table-select" data-table="${id}" aria-label="Seleccionar mesa ${i+1}">
        <b>0${i+1}</b>
        <small>${t.results.length?`${t.results.length} tiradas`:'Vacía'}</small>
      </button>
      <input class="table-name-input" data-table-name="${id}" value="${escapeHTML(t.name)}" maxlength="32" aria-label="Nombre de la mesa ${i+1}" autocomplete="off" spellcheck="false">
      <div class="table-tools">
        <button type="button" class="table-load" data-table-load="${id}" aria-label="Cargar historial en mesa ${i+1}">＋ HISTORIAL</button>
        <button type="button" class="table-new" data-table-new="${id}" aria-label="Iniciar historial nuevo en mesa ${i+1}">↻ NUEVO</button>
      </div>
    </div>`).join('');

  $$('[data-table]').forEach(b=>b.addEventListener('click',()=>{
    activeTable=b.dataset.table;
    selectedResult=null;
    saveDB();
    renderAll();
  }));

  $$('[data-table-load]').forEach(b=>b.addEventListener('click',e=>{
    e.stopPropagation();
    const id=b.dataset.tableLoad;
    activeTable=id;
    selectedResult=null;
    saveDB();
    renderAll();
    const title=document.querySelector('#captureView .history-head h2');
    if(title)title.textContent=`Importar · ${db.tables[id].name}`;
    const status=document.querySelector('#bulkStatus');
    if(status)status.textContent=`Cargando historial únicamente en ${db.tables[id].name}. Orden recomendado: más antiguo → más reciente.`;
    const order=document.querySelector('#bulkOrder');
    if(order)order.value='oldest';
    showView('capture');
  }));

  $$('[data-table-new]').forEach(b=>b.addEventListener('click',e=>{
    e.stopPropagation();
    const id=b.dataset.tableNew;
    const t=db.tables[id];
    const count=t.results.length;
    const ok=confirm(`¿INICIAR HISTORIAL NUEVO EN ${t.name.toUpperCase()}?\n\nSe borrarán ${count} tiradas de esta mesa.\nLas otras mesas no se modificarán.`);
    if(!ok)return;
    activeTable=id;
    selectedResult=null;
    t.results=[];
    t.events=[];
    t.version=`manual-new-${Date.now()}`;
    if(id==='t1')localStorage.setItem('brr.v10.age.version',t.version);
    saveDB();
    renderAll();
    toast(`${t.name}: historial nuevo iniciado`);
  }));

  $$('[data-table-name]').forEach(input=>{
    const commit=()=>{
      const id=input.dataset.tableName;
      const clean=input.value.trim().replace(/\s+/g,' ').slice(0,32);
      if(!clean){input.value=db.tables[id].name;return;}
      if(db.tables[id].name!==clean){
        db.tables[id].name=clean;
        saveDB();
        if(id===activeTable)renderHistory();
        toast(`Mesa ${id.slice(1)}: ${clean}`);
      }
      input.value=clean;
    };
    input.addEventListener('focus',()=>input.select());
    input.addEventListener('blur',commit);
    input.addEventListener('keydown',e=>{
      if(e.key==='Enter'){e.preventDefault();commit();input.blur();}
      if(e.key==='Escape'){input.value=db.tables[input.dataset.tableName].name;input.blur();}
    });
  });
}

if(document.querySelector('#tableList'))renderTables();
