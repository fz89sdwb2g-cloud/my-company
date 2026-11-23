/* Private inventory aggregates for each CUST location; no manual cloud data overwritten. */
(() => {
  'use strict';
  let currentUser=null,revision=0,historyRevision=0;
  const status=document.getElementById('inventory-refresh-status'),history=document.getElementById('inventory-history');
  const groups=[{id:'loc-01',kind:'stores',scope:'КУСТ передає одну спільну локацію «Магазин»; окремих залишків магазину будматеріалів і ламінату в API немає.'},{id:'loc-02',kind:'warehouse',scope:'Окрема локація «Склад 1».'}];
  const money=new Intl.NumberFormat('uk-UA',{style:'currency',currency:'UAH'});
  const date=new Intl.DateTimeFormat('uk-UA',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Kyiv'});
  function display(g,value,note){
    document.querySelectorAll('[data-cust-'+g.kind+'-value]').forEach(n=>n.textContent=value);
    document.querySelectorAll('[data-cust-'+g.kind+'-note]').forEach(n=>n.textContent=note);
  }
  const all=(value,note)=>groups.forEach(g=>display(g,value,note));
  function paint(g,data){
    if(!data){display(g,'Немає даних','Для цієї локації ще немає повного перевіреного залишку.');return;}
    const details=data.valuation_details;
    if(g.id==='loc-01'&&details?.method!=='reviewed_product_classification_v1'){display(g,'Потребує перевірки','Попередню суму приховано: джерело включало нетоварні позиції. Очікуємо перерахунок лише товарних запасів.');return;}
    const cost=Number(data.stock_cost),asOf=new Date(data.as_of),interval=Number(data.sync_interval_minutes);
    if(!data.complete||data.stock_cost==null||!Number.isFinite(cost)||data.currency!=='UAH'||!Number.isFinite(asOf.getTime())||!Number.isInteger(data.product_count)||data.product_count<0||!Number.isInteger(data.negative_quantity_count)||data.negative_quantity_count<0){display(g,'Не вдалося перевірити','Дані локації мають невідомий формат.');return;}
    const stale=Date.now()-asOf.getTime()>(interval>0?interval*60000+3600000:86400000);
    display(g,money.format(cost),
      'КУСТ · '+data.location_name+' ('+g.id+') · '+data.product_count.toLocaleString('uk-UA')+' товарних позицій · станом на '+date.format(asOf)+' за Києвом. '+g.scope+' За собівартістю, за даними обліку КУСТ. '+
      (g.id==='loc-01'?'До суми входять лише класифіковані товарні позиції. Кольори палітри, доставка й послуги виключені ('+details.excluded_count+' позицій). '+(details.unclassified_count?'Окремо під перевіркою: '+details.unclassified_count+' позицій на '+money.format(Number(details.unclassified_stock_cost))+' — НЕ включені в суму. '+(details.unclassified_items||[]).map(x=>x.name+': '+money.format(Number(x.stock_cost))).join('; ')+'. ':''):'')+
      (data.negative_quantity_count?'Увага: позицій із від’ємною кількістю — '+data.negative_quantity_count+'; вони враховані в сумі й потребують звірки обліку. ':'')+
      (stale?'Дані застаріли — перевірте стан оновлення. ':'')+
      (data.last_error_code?'Остання спроба оновлення невдала; показано попередні перевірені дані. ':'')+
      (interval===1440?'Автоматичне оновлення щодня о 07:00 за Києвом.':'')
    );
  }
  async function load(user,manual=false){
    currentUser=user;const request=++revision;
    if(manual)status.textContent="Завантажуємо останні збережені залишки…";
    if(!user){if(manual)status.textContent='Спочатку увійдіть у хмару.';all('Увійдіть у хмару','Дані КУСТ доступні після входу у ваш обліковий запис у блоці «Хмара».');return;}
    try{
      const {data,error}=await cloud.from('cust_inventory_snapshots').select('location_id,location_name,stock_cost,currency,product_count,negative_quantity_count,as_of,complete,last_error_code,sync_interval_minutes,valuation_details').eq('user_id',user.id).in('location_id',groups.map(g=>g.id));
      if(request!==revision)return;if(error||!Array.isArray(data))throw Error();
      for(const g of groups){const matches=data.filter(r=>r.location_id===g.id);if(matches.length>1)throw Error();paint(g,matches[0]);}
      if(manual)status.textContent="Збережені залишки завантажено. Це повторне читання хмари, без нового запиту до КУСТ.";
    }catch{if(request===revision){if(manual)status.textContent='Не вдалося завантажити. Перевірте з’єднання та вхід у хмару.';all('Не вдалося завантажити','Перевірте вхід у хмару та натисніть «Оновити показані дані».');}}
  }
  document.querySelectorAll('[data-cust-warehouse-reload],[data-cust-stores-reload]').forEach(b=>b.addEventListener('click',()=>load(currentUser,true)));
  cloud.auth.onAuthStateChange((_event,session)=>{
    const next=session?.user??null;
    if(next?.id!==currentUser?.id){++historyRevision;history.replaceChildren();document.getElementById('inventory-history-status').textContent='';}
    if(next?.id!==currentUser?.id){++revision;currentUser=next;all(next?'Завантаження…':'Увійдіть у хмару','Перевіряємо обліковий запис.');setTimeout(()=>load(next),0);}
  });
  setInterval(()=>{if(currentUser&&!document.hidden)load(currentUser);},60000);
  window.addEventListener('focus',()=>{if(currentUser)load(currentUser);});

  document.getElementById('inventory-history-load').addEventListener('click',async()=>{
    const request=++historyRevision,owner=currentUser?.id,note=document.getElementById('inventory-history-status');
    history.replaceChildren();if(!owner){note.textContent='Спочатку увійдіть у хмару.';return;}
    note.textContent='Завантажуємо історію…';
    try{
      const {data,error}=await cloud.from('cust_inventory_history').select('location_id,as_of,imported_at,stock_cost,currency,product_count,negative_quantity_count').eq('user_id',owner).order('as_of',{ascending:false}).limit(120);
      if(request!==historyRevision||owner!==currentUser?.id)return;
      if(error||!Array.isArray(data))throw Error();
      const table=document.createElement('table');table.style.width='100%';
      function row(values,tag='td'){const tr=document.createElement('tr');for(const v of values){const cell=document.createElement(tag);cell.textContent=String(v);tr.append(cell);}table.append(tr);}
      row(['Станом на (Київ)','Локація','Вартість товару','Позицій','Із мінусом'],'th');
      for(const r of data)row([date.format(new Date(r.as_of)),r.location_id==='loc-01'?'Магазини спільно':'Склад 1',money.format(Number(r.stock_cost)),r.product_count,r.negative_quantity_count]);
      history.append(table);note.textContent=data.length?'Показано '+data.length+' останніх збережених знімків. Знімки за минулі дні до початку накопичення відсутні.':'Збережених знімків ще немає.';
    }catch{if(request===historyRevision)note.textContent='Історію не вдалося завантажити. Перевірте вхід і доступність хмари.';}
  });
  const initialRevision=revision;
  cloud.auth.getSession().then(({data})=>{if(initialRevision===revision)load(data.session?.user??null);}).catch(()=>{if(initialRevision===revision)load(null);});
})();

