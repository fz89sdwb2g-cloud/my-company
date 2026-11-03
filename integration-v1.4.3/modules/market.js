(function () {
  'use strict';
  const $ = id => document.getElementById('market-' + id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
  const uid=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
  const store=CompanyStore.create('myCompanyMarket_v1',CompanyStore.market,()=>JSON.parse(JSON.stringify(window.CompanyMarketArchive)));
  let db=store.data,tab='competitors',editor=null;
  function normalize(){db.competitors??=[];db.manufacturers??=[];}
  normalize();
  function change(fn){
    const previous=JSON.stringify(db);
    try{store.check();if(fn()===false)return false;store.write(db);editor=null;render();$('storageNotice').textContent='✅ Зміни збережено.';return true;}
    catch(error){db=JSON.parse(previous);const errorBox=$('form-error')||$('storageNotice');errorBox.textContent='❌ '+error.message;return false;}
  }
  function ordered(x){return [...(x.checks||[])].sort((a,b)=>a.date.localeCompare(b.date));}
  function latestPrice(x,id){const check=ordered(x).reverse().find(c=>Object.prototype.hasOwnProperty.call(c.prices||{},id));return {value:check?.prices[id]??null,date:check?.date||''};}
  const field=(id,title,value='',extra='')=>`<div class="field"><label for="market-${id}">${esc(title)}</label><input id="market-${id}" value="${esc(value)}" ${extra}></div>`;
  function editorHTML(x){
    if(!editor||editor.id!==String(x.id))return '';
    const action=editor.action,products=action==='price'?x.products.filter(p=>String(p.id)===editor.productId):x.products||[];
    let fields,title;
    if(action==='edit'){
      title='Редагувати назву та контакти';
      fields=field('edit-name','Назва',x.name,'required')+field('edit-phone','Контакт',x.phone||'')+`<div class="field"><label for="market-edit-notes">Примітка</label><textarea id="market-edit-notes">${esc(x.notes||'')}</textarea></div>`;
    }else if(action==='product'){
      title='Додати товар';fields=field('product-name','Назва товару','','required')+field('product-unit','Одиниця виміру','шт','required')+field('product-price','Ціна, грн (необов’язково)','','inputmode="decimal"');
    }else{
      title=action==='price'?'Змінити ціну товару':'Нова перевірка цін';
      fields=products.map((p,i)=>field('price-'+i,p.name+' — грн / '+p.unit,latestPrice(x,p.id).value??'','inputmode="decimal" data-price-product="'+esc(p.id)+'"')).join('')+field('check-date','Дата ціни',today(),'type="date" required')+field('check-next','Наступна перевірка (необов’язково)','','type="date"')+field('check-note','Примітка');
    }
    return `<form id="market-editor" data-kind="${action}" data-id="${esc(x.id)}" class="box" style="background:#edf5ff"><h3>${title}</h3><div class="form">${fields}</div><p id="market-form-error" role="alert"></p><button type="submit" class="primary">Зберегти</button> <button type="button" data-market-cancel>Скасувати</button></form>`;
  }
  function render(){
    $('list').innerHTML='<h2>'+(tab==='competitors'?'Конкуренти':'Виробники')+'</h2>'+db[tab].map(x=>{
      const checks=ordered(x),last=checks.at(-1);
      return `<div class="card"><b>${esc(x.name)}</b> <span class="small">${esc(x.phone||'')}</span><p>${esc(x.notes||'')}</p><div class="row">${[['edit','Редагувати'],['product','+ товар'],['check','+ перевірка цін']].map(([action,title])=>`<button type="button" data-action="${action}" data-id="${esc(x.id)}">${title}</button>`).join('')}</div><p class="small">Остання перевірка: ${esc(last?.date||'—')} • Наступна: ${esc(last?.next||'—')}</p><div class="scroll"><table><tr><th>Товар</th><th>Од.</th><th>Ціна, грн</th><th>Дата ціни</th><th></th></tr>${(x.products||[]).map(p=>{const price=latestPrice(x,p.id);return `<tr><td>${esc(p.name)}</td><td>${esc(p.unit)}</td><td>${esc(price.value??'—')}</td><td>${esc(price.date||'—')}</td><td><button type="button" data-action="price" data-id="${esc(x.id)}" data-product-id="${esc(p.id)}">Змінити ціну</button></td></tr>`;}).join('')}</table></div>${editorHTML(x)}<details><summary>Історія перевірок (${checks.length})</summary>${checks.map(c=>`<p>${esc(c.date)} • ${esc(c.note||'')} | ${(x.products||[]).filter(p=>Object.prototype.hasOwnProperty.call(c.prices||{},p.id)).map(p=>esc(p.name)+': '+esc(c.prices[p.id]??'—')+' грн / '+esc(p.unit)).join('; ')}</p>`).join('')}</details></div>`;
    }).join('')+(db[tab].length?'':'<p>Записів немає.</p>');
  }
  $('addEntity').onclick=()=>{if(change(()=>{const name=$('name').value.trim();if(!name)return false;db[tab].push({id:uid(),name,phone:$('phone').value.trim(),notes:$('notes').value.trim(),products:[],checks:[]});})){$('name').value='';$('phone').value='';$('notes').value='';}};
  $('list').onclick=e=>{
    if(e.target.closest('[data-market-cancel]')){editor=null;render();return;}
    const b=e.target.closest('button[data-action]');if(!b)return;
    const x=db[tab].find(x=>String(x.id)===b.dataset.id);if(!x)return;
    if(b.dataset.action==='check'&&!x.products?.length){editor={id:String(x.id),action:'product'};render();$('form-error').textContent='Спочатку додайте товар, потім внесіть ціну.';return;}
    editor={id:String(x.id),action:b.dataset.action,productId:b.dataset.productId};render();
    $('editor').scrollIntoView?.({block:'nearest',behavior:'smooth'});
  };
  function parsePrice(value){const text=value.trim();if(!text)return null;const amount=Number(text.replace(',','.'));if(!Number.isFinite(amount)||amount<0)throw new Error('Вкажіть невід’ємну числову ціну, наприклад 219 або 219,50.');return amount;}
  function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
  $('list').onsubmit=e=>{
    const form=e.target.closest('#market-editor');if(!form)return;e.preventDefault();
    const kind=form.dataset.kind;
    try{
      const values=kind==='edit'?{name:$('edit-name').value.trim(),phone:$('edit-phone').value.trim(),notes:$('edit-notes').value.trim()}:kind==='product'?{name:$('product-name').value.trim(),unit:$('product-unit').value.trim(),price:parsePrice($('product-price').value)}:{date:$('check-date').value,next:$('check-next').value,note:$('check-note').value.trim(),prices:Object.fromEntries([...form.querySelectorAll('[data-price-product]')].map(input=>[input.dataset.priceProduct,parsePrice(input.value)]).filter(([,price])=>price!==null))};
      if((kind==='edit'||kind==='product')&&!values.name)throw new Error('Вкажіть назву.');
      if(kind==='product'&&!values.unit)throw new Error('Вкажіть одиницю виміру.');
      if(kind==='check'||kind==='price'){if(!Object.keys(values.prices).length)throw new Error('Введіть хоча б одну ціну. Порожнє поле залишає попередню ціну.');if(!validDate(values.date)||values.next&&!validDate(values.next))throw new Error('Перевірте дату.');}
      change(()=>{
        const x=db[tab].find(x=>String(x.id)===form.dataset.id);if(!x)throw new Error('Запис не знайдено. Оновіть сторінку.');
        if(kind==='edit')Object.assign(x,values);
        else if(kind==='product'){const id=uid();(x.products??=[]).push({id,name:values.name,unit:values.unit});if(values.price!==null)(x.checks??=[]).push({id:uid(),date:today(),prices:{[id]:values.price},note:'Ціна при додаванні товару.'});}
        else (x.checks??=[]).push({id:uid(),...values});
      });
    }catch(error){$('form-error').textContent='❌ '+error.message;}
  };
  document.querySelectorAll('#market [data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;editor=null;render();});
  $('storageNotice').textContent=store.message;
  $('exportMarket').onclick=()=>{try{store.exportFile()}catch(e){$('storageNotice').textContent=e.message;}};
  $('importMarket').onchange=async e=>{try{const next=await store.importFile(e.target.files[0]);if(next){db=next;normalize();editor=null;$('storageNotice').textContent='Копію відновлено';render();}}catch(error){$('storageNotice').textContent=error.message;}finally{e.target.value='';}};

  $('restore-archive').onclick=()=>{
    try {
      store.check();
      const next=JSON.parse(JSON.stringify(db)), archive=window.CompanyMarketArchive;
      for (const kind of ['competitors','manufacturers']) for (const old of archive[kind]) {
        let current=next[kind].find(e=>e.id===old.id||e.name.trim().toLocaleLowerCase('uk-UA')===old.name.trim().toLocaleLowerCase('uk-UA'));
        if(!current){next[kind].push(JSON.parse(JSON.stringify(old)));continue;}
        current.products??=[];current.checks??=[];
        const map={};
        for(const product of old.products){let existing=current.products.find(p=>p.id===product.id||p.name===product.name&&p.unit===product.unit);if(!existing){existing={...product};current.products.push(existing);}map[product.id]=existing.id;}
        for(const check of old.checks){
          const restored={...check,prices:Object.fromEntries(Object.entries(check.prices).map(([key,value])=>[map[key],value]))};
          if(!current.checks.some(c=>c.id===restored.id||c.date===restored.date&&JSON.stringify(c.prices)===JSON.stringify(restored.prices)))current.checks.unshift(restored);
        }
        // Latest prices are chosen by date; archived checks cannot replace a newer check.
        current.checks.sort((a,b)=>a.date.localeCompare(b.date));
        if(!current.phone)current.phone=old.phone;
      }
      store.exportFile(); // Preserve the exact pre-restore state as a download.
      store.write(next);db=next;render();
      $('restore-result').textContent='✅ Архівні записи додано. Раніше внесені дані збережено.';
    } catch(error) {$('restore-result').textContent='❌ Відновлення не виконано: '+error.message;}
  };
  render();
})();
