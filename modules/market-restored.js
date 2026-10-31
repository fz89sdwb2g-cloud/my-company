(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const today = () => {const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
  const uid = () => crypto.randomUUID();
  const store = CompanyStore.create('myCompanyMarket_v1', CompanyStore.market, () => ({competitors:[],manufacturers:[]}));
  let db=store.data, tab='competitors';
  function normalize(){db.competitors ??=[];db.manufacturers ??=[];}
  normalize();
  function change(fn) {
    const previous=JSON.stringify(db);
    try {store.check();if(fn()===false)return;store.write(db);render();}
    catch(e){db=JSON.parse(previous);$('storageNotice').textContent=e.message;alert(e.message);}
  }
  function render() {
    $('list').innerHTML='<h2>'+(tab==='competitors'?'Конкуренти':'Виробники')+'</h2>'+db[tab].map(x=>{
      const checks=x.checks||[],last=checks.at(-1);
      return '<div class="card"><b>'+esc(x.name)+'</b> <span class="small">'+esc(x.phone||'')+'</span><p>'+esc(x.notes||'')+'</p><div class="row">'+[['edit','Редагувати'],['product','+ товар'],['check','+ перевірка цін']].map(([action,title])=>'<button data-action="'+action+'" data-id="'+esc(x.id)+'">'+title+'</button>').join('')+'</div><p class="small">Остання: '+esc(last?.date||'—')+' • Наступна: '+esc(last?.next||'—')+'</p><table><tr><th>Товар</th><th>Од.</th><th>Остання ціна</th></tr>'+(x.products||[]).map(p=>'<tr><td>'+esc(p.name)+'</td><td>'+esc(p.unit)+'</td><td>'+esc(last?.prices?.[p.id]??'—')+'</td></tr>').join('')+'</table><details><summary>Історія перевірок ('+checks.length+')</summary>'+checks.map(c=>'<p>'+esc(c.date)+' → наступна '+esc(c.next||'—')+' | '+esc(JSON.stringify(c.prices||{}))+'</p>').join('')+'</details></div>';
    }).join('')+(db[tab].length?'':'<p>Записів немає.</p>');
  }
  $('addEntity').onclick=()=>change(()=>{
    const name=$('name').value.trim();if(!name)return false;
    db[tab].push({id:uid(),name,phone:$('phone').value.trim(),notes:$('notes').value.trim(),products:[],checks:[]});
  });
  $('list').onclick=e=>{const b=e.target.closest('button[data-action]');if(!b)return;change(()=>{
    const x=db[tab].find(x=>String(x.id)===b.dataset.id);if(!x)return false;
    if(b.dataset.action==='product') {
      const name=prompt('Товар');if(name===null||!name.trim())return false;
      const unit=prompt('Одиниця виміру','шт');if(unit===null||!unit.trim())return false;
      (x.products??=[]).push({id:uid(),name:name.trim(),unit:unit.trim()});
    } else if(b.dataset.action==='edit') {
      const name=prompt('Назва',x.name);if(name===null||!name.trim())return false;
      const phone=prompt('Контакт',x.phone||'');if(phone===null)return false;
      const notes=prompt('Примітка',x.notes||'');if(notes===null)return false;
      Object.assign(x,{name:name.trim(),phone,notes});
    } else {
      if(!x.products?.length){alert('Спочатку додайте товар');return false;}
      const prices={};
      for(const p of x.products) {
        const input=prompt('Ціна: '+p.name);if(input===null)return false;if(!input.trim())continue;
        const price=Number(input.replace(',','.'));
        if(!Number.isFinite(price)||price<0){alert('Вкажіть невід’ємну числову ціну');return false;}
        prices[p.id]=price;
      }
      if(!Object.keys(prices).length)return false;
      const next=prompt('Наступна перевірка YYYY-MM-DD','');if(next===null)return false;
      if(next && (!/^\d{4}-\d{2}-\d{2}$/.test(next)||!Number.isFinite(Date.parse(next))||new Date(next).toISOString().slice(0,10)!==next)){alert('Перевірте дату');return false;}
      (x.checks??=[]).push({id:uid(),date:today(),next,prices});
    }
  });};
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render();});
  $('storageNotice').textContent=store.message;
  $('exportMarket').onclick=()=>{try{store.exportFile()}catch(e){alert(e.message)}};
  $('importMarket').onchange=async e=>{try{const next=await store.importFile(e.target.files[0]);if(next){db=next;normalize();$('storageNotice').textContent='Копію відновлено';render();}}catch(error){alert(error.message)}finally{e.target.value='';}};
  render();
})();
