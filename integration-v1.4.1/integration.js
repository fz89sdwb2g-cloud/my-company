/* Integration fixes for the supplied Replit snapshot; no cloud connection. */
(() => {
  const keys = ['myCompanyStaff_v13','myCompanyOrg_v13','myCompanyOrgRoles_v2','myCompanyMonthly_v1','myCompanyPartners_v1','myCompanyTasks_v1','myCompanyMarket_v1'];
  window.exportCompanyBackup = () => {
    const data = Object.fromEntries(keys.map(k => [k, localStorage.getItem(k)]));
    const url = URL.createObjectURL(new Blob([JSON.stringify({format:'my-company-full-backup',version:1,createdAt:new Date().toISOString(),data}, null, 2)], {type:'application/json'}));
    const a = document.createElement('a'); a.href=url; a.download=`my-company-full-backup-${day()}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const oldDash = dash;
  dash = () => {
    oldDash();
    const data=JSON.parse(localStorage.getItem('myCompanyMonthly_v1')||'{}')[$('dm').value]||{};
    $('ds').value=data.sales??''; $('dc').value=data.checks??''; $('dp').value=data.profit??'';
  };
  $('dm').onchange=dash; dash();
  renderPartners = () => {
    const area=$('pterritory').value, spec=$('pspecfilter').value;
    const options=(field,value)=>'<option value="">Усі '+(field==='area'?'території':'спеціалізації')+'</option>'+[...new Set(P.map(p=>p[field]).filter(Boolean))].map(v=>`<option value="${esc(v)}" ${v===value?'selected':''}>${esc(v)}</option>`).join('');
    $('pterritory').innerHTML=options('area',area); $('pspecfilter').innerHTML=options('spec',spec);
    const query=$('psearch').value.trim().toLocaleLowerCase('uk-UA');
    const list=P.filter(p=>(!area||p.area===area)&&(!spec||p.spec===spec)&&(!query||[p.name,p.phone,p.city,p.spec].join(' ').toLocaleLowerCase('uk-UA').includes(query)));
    $('partnerlist').innerHTML=list.map(p=>`<div class="partnercard"><b>${esc(p.name)}</b><p>${esc(p.phone)} • ${esc(p.city||'')}</p><span class="badge">${esc(p.spec||'')}</span><span class="badge">${esc(p.rate)}%</span><p>${esc(p.notes||'')}</p></div>`).join('')||'<p class="note">Майстрів за цими умовами немає.</p>';
  }; $("pterritory").onchange=renderPartners; $("pspecfilter").onchange=renderPartners; $("psearch").oninput=renderPartners; renderPartners();
  renderTasks = () => {
    const filter=$('taskfilter').value;
    const list=T.filter(t=>filter==='all'||(filter==='done'?t.done:filter==='today'?!t.done&&t.date<=day():!t.done));
    $('tasklist').innerHTML=list.map(t=>`<div class="partnercard"><b>${esc(t.name)}</b><p>${esc(t.action)}</p><small>${esc(t.date)} • ${esc(t.owner)} • ${esc(t.phone||'')}</small><p><button data-task-toggle="${esc(t.id)}">${t.done?'Повернути в роботу':'Виконано'}</button></p></div>`).join('')||'<p class="note">Завдань немає.</p>';
  };
  $('taskfilter').onchange=renderTasks;
  $('tasklist').onclick=e=>{
    const b=e.target.closest('[data-task-toggle]'); if(!b)return;
    const next=T.map(t=>t.id===b.dataset.taskToggle?{...t,done:!t.done}:t);
    try{localStorage.setItem(TK,JSON.stringify(next));T=next;renderTasks();}catch(error){alert('Не вдалося зберегти завдання.');}
  }; renderTasks();
  const oldPaint=paintOrg;
  paintOrg=()=>{
    oldPaint();
    const owner=orgRole('owner');
    document.querySelectorAll('#org .orgowner b,#org .orgmanagement .orgperson b').forEach(e=>e.textContent=owner.name);
  }; paintOrg();
})();
