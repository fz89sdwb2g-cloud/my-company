/* Local storage for the isolated stabilization pages. Does not change cloud sync. */
(function () {
  'use strict';
  const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const number = x => typeof x === 'number' && Number.isFinite(x) && x >= 0;
  const text = x => typeof x === 'string';
  const date = x => text(x) && Number.isFinite(Date.parse(x));
  const id = x => text(x) || (typeof x === 'number' && Number.isFinite(x));
  function staff(x) {
    return object(x) && number(x.base) && Array.isArray(x.rates) && x.rates.every(r => object(r) && id(r.id) && text(r.name) && text(r.unit) && number(r.rate)) &&
      Array.isArray(x.shifts) && x.shifts.every(s => object(s) && date(s.start) && date(s.end) && Date.parse(s.end) >= Date.parse(s.start)) &&
      (x.active == null || date(x.active)) && Array.isArray(x.works) && x.works.every(w => object(w) && id(w.id) && date(w.date) && text(w.name) && text(w.unit) && number(w.qty) && number(w.rate) && number(w.amount)) &&
      object(x.standards) && Object.values(x.standards).every(s => object(s) && object(s.status)) &&
      object(x.revisions) && Object.values(x.revisions).every(r => object(r) && object(r.status) && (r.photos === undefined || (Array.isArray(r.photos) && r.photos.every(text)))) &&
      (x.audit === undefined || Array.isArray(x.audit));
  }
  function market(x) {
    return object(x) && (Object.keys(x).length === 0 || Array.isArray(x.competitors) || Array.isArray(x.manufacturers)) && ['competitors', 'manufacturers'].every(k => x[k] === undefined || (Array.isArray(x[k]) && x[k].every(e =>
      object(e) && id(e.id) && text(e.name) && (e.products === undefined || (Array.isArray(e.products) && e.products.every(p => object(p) && id(p.id) && text(p.name) && text(p.unit)))) &&
      (e.checks === undefined || (Array.isArray(e.checks) && e.checks.every(c => object(c) && date(c.date) && object(c.prices) && Object.values(c.prices).every(number)))))));
  }
  function download(name, content) {
    const url = URL.createObjectURL(new Blob([content], {type: 'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function create(key, validate, fresh) {
    let raw = null, blocked = false, message = '';
    function decode(value) {
      const data = JSON.parse(value);
      if (!validate(data)) throw new Error('Непідтримувана або пошкоджена структура даних.');
      return data;
    }
    let data;
    try { raw = localStorage.getItem(key); data = raw === null ? fresh() : decode(raw); }
    catch (e) { blocked = true; message = 'Збереження заблоковано: не вдалося прочитати дані. Вони не перезаписані. Збережіть копію та відновіть перевірений файл.'; data = fresh(); }
    function check() {
      if (blocked) throw new Error(message);
      if (localStorage.getItem(key) !== raw) throw new Error('Дані змінилися в іншій вкладці. Оновіть сторінку перед продовженням.');
    }
    function write(next) {
      check();
      if (!validate(next)) throw new Error('Запис не збережено: перевірте введені значення.');
      const value = JSON.stringify(next);
      try { localStorage.setItem(key, value); }
      catch (e) { throw new Error('Не вдалося зберегти: сховище недоступне або переповнене. Збережені раніше дані залишено без змін.'); }
      raw = value; data = next;
    }
    function exportFile() {
      const value = localStorage.getItem(key);
      // Invalid data are exported verbatim, never silently replaced with defaults.
      download(key + (blocked ? '-recovery' : '-backup') + '.json', value === null ? JSON.stringify({format:'my-company-backup',version:1,key,data}) : (blocked ? value : JSON.stringify({format:'my-company-backup',version:1,key,data:decode(value)})));
    }
    async function importFile(file) {
      if (!file) return null;
      const before = localStorage.getItem(key);
      let parsed = JSON.parse(await file.text());
      if (object(parsed) && parsed.format === 'my-company-backup') {
        if (parsed.version !== 1 || parsed.key !== key) throw new Error('Це резервна копія іншого модуля або версії.');
        parsed = parsed.data;
      }
      if (!validate(parsed)) throw new Error('Файл не пройшов перевірку. Поточні дані не змінені.');
      if (!confirm('Замінити дані цього модуля резервною копією? Поточний стан буде завантажено окремим файлом.')) return null;
      if (localStorage.getItem(key) !== before) throw new Error('Дані змінилися під час імпорту. Оновіть сторінку.');
      if (before !== null) download(key + '-before-import.json', before);
      try { localStorage.setItem(key, JSON.stringify(parsed)); }
      catch (e) { throw new Error('Імпорт не збережено: сховище недоступне або переповнене.'); }
      raw = JSON.stringify(parsed); data = parsed; blocked = false; message = '';
      return parsed;
    }
    return {data, check, write, exportFile, importFile, get message(){return message;}};
  }
  window.CompanyStore = {create, staff, market};
})();
