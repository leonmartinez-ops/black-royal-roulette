// V10 — mesas europeas con color propio y nombre editable en línea
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
    </div>`).join('');

  $$('[data-table]').forEach(b=>b.addEventListener('click',()=>{
    activeTable=b.dataset.table;
    selectedResult=null;
    saveDB();
    renderAll();
  }));

  $$('[data-table-name]').forEach(input=>{
    const commit=()=>{
      const id=input.dataset.tableName;
      const clean=input.value.trim().replace(/\s+/g,' ').slice(0,32);
      if(!clean){
        input.value=db.tables[id].name;
        return;
      }
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
      if(e.key==='Enter'){
        e.preventDefault();
        commit();
        input.blur();
      }
      if(e.key==='Escape'){
        input.value=db.tables[input.dataset.tableName].name;
        input.blur();
      }
    });
  });
}

// Si V10 ya se inicializó antes de cargar este módulo, sustituimos inmediatamente el selector antiguo.
if(document.querySelector('#tableList'))renderTables();
