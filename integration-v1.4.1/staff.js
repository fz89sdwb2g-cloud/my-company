/* Employee module restored from the verified v1.3.6 reference. */
(() => {
  const root = document.getElementById("staff");
  if (!root) throw new Error("Employee module container #staff was not found.");

  root.innerHTML = `
    <div class="box">
      <h2>👷 Завідувач складу, водій</h2>
      <p>Завідувач складу, водій — відповідає за правильне приймання, розміщення, зберігання та підготовку товару, навантаження і розвантаження, видачу товару клієнтам, порядок на складі, правильність залишків та своєчасну доставку товару клієнтам.</p>
      <p><b>ЦКП:</b> Товар правильно прийнятий, розміщений, збережений, підготовлений, завантажений і вчасно доставлений клієнту; на складі підтримується порядок і правильні залишки товару.</p>
      <div class="tabs" aria-label="Розділи працівника">
        <button type="button" class="on" data-t="staff-shift">🕒 Зміна</button>
        <button type="button" data-t="staff-work">🧾 Виробіток</button>
        <button type="button" data-t="staff-standard">✅ Стандарт</button>
        <button type="button" data-t="staff-revision">📋 Ревізія</button>
        <button type="button" data-t="staff-instruction">📘 Інструкція</button>
        <button type="button" data-t="staff-settings">⚙️ Налаштування</button>
      </div>
    </div>
    <div id="staffnotice" class="box" role="status" hidden></div>
    <div id="staff-shift" class="stafftab on">
      <div class="metrics">
        <div class="metric">База за повний місяць<b id="staff-baseview">—</b></div>
        <div class="metric">Відпрацьовано<b id="staff-hoursview">—</b><span id="staff-planview" class="note"></span></div>
        <div class="metric">Попередньо нараховано<b id="staff-salaryview">—</b><span class="note">час + виробіток</span></div>
      </div>
      <div class="box">
        <h3>Робоча зміна</h3>
        <p><b>Пн–Пт, 08:00–17:00.</b> Обід — у зручний час, окремо не фіксується.</p>
        <div id="staff-shiftstate"></div>
        <button type="button" id="staff-start" class="primary" onclick="startStaffShift()">▶️ Почати зміну</button>
        <button type="button" id="staff-end" class="danger hide" onclick="endStaffShift()">⏹ Закінчити зміну</button>
        <p class="note">Фактичний час рахується автоматично. Запізнення/відсутність не оплачуються. Час після 17:00 — за тією ж погодинною ставкою.</p>
      </div>
      <div class="box">
        <h3>Історія змін</h3>
        <div class="scroll"><table><thead><tr><th>Дата</th><th>Початок</th><th>Завершення</th><th>Тривалість</th></tr></thead><tbody id="staff-shiftlog"></tbody></table></div>
      </div>
    </div>
    <div id="staff-work" class="stafftab">
      <div class="box">
        <h3>+ Виконана робота</h3>
        <div class="form">
          <div class="field"><label for="staff-wt">Вид роботи</label><select id="staff-wt" onchange="calculateStaffWork()"></select></div>
          <div class="field"><label id="staff-ql" for="staff-wq">Кількість</label><input id="staff-wq" type="number" min="0" step=".01" oninput="calculateStaffWork()"></div>
          <div class="field"><label for="staff-wc">Коментар / чек / клієнт</label><input id="staff-wc" placeholder="Напр. чек №154"></div>
          <div class="field"><label>Нараховано</label><b id="staff-wcalc">0 грн</b></div>
        </div>
        <button type="button" class="primary" onclick="addStaffWork()">Зберегти роботу</button>
      </div>
      <div class="box">
        <h3>Журнал робіт</h3>
        <div class="scroll"><table><thead><tr><th>Дата</th><th>Робота</th><th>К-сть</th><th>Сума</th><th>Коментар</th><th>Дії</th></tr></thead><tbody id="staff-worklog"></tbody></table></div>
      </div>
    </div>
    <div id="staff-standard" class="stafftab">
      <div class="box">
        <h3>Щоденний стандарт — входить у базову оплату</h3>
        <div id="staff-checks"></div>
        <div class="field"><label for="staff-stdcomment">Коментар / проблема</label><textarea id="staff-stdcomment"></textarea></div>
        <button type="button" class="primary" onclick="saveStaffStandard()">Зберегти чек-лист за сьогодні</button>
      </div>
    </div>
    <div id="staff-revision" class="stafftab">
      <div class="box">
        <h3>📋 Щомісячна ревізія</h3>
        <p>Мінімум раз на місяць, в останній тиждень. Входить у базову оплату.</p>
        <div id="staff-revchecks"></div>
        <div class="field"><label for="staff-revnote">Розбіжності / пошкодження / прострочений товар / товар із коротким строком</label><textarea id="staff-revnote"></textarea></div>
        <div class="field"><label for="staff-revphotos">Фотозвіт складу — 3–4 фото (до 4 файлів)</label><input id="staff-revphotos" type="file" accept="image/*" multiple onchange="previewStaffPhotos(this)"><div id="staff-photopreview" class="photos"></div></div>
        <button type="button" class="primary" onclick="saveStaffRevision()">Завершити ревізію</button>
        <div id="staff-revhistory"></div>
      </div>
    </div>
    <div id="staff-instruction" class="stafftab">
      <div class="box"><h3>📘 Посадова інструкція</h3><p><b>Посада:</b> Завідувач складу, водій</p><p><b>ЦКП:</b> Товар правильно прийнятий, розміщений, збережений, підготовлений, завантажений і вчасно доставлений клієнту; на складі підтримується порядок і правильні залишки товару.</p></div>
      <div class="box"><h3>1. Приймання товару</h3><p>Приймати товар постачальника згідно з накладною: звіряти назву/вид товару, кількість і стан. Виявляти нестачі, надлишки, пересорт і пошкодження та одразу повідомляти відповідального і погоджувати вирішення.</p><p><b>Правило:</b> Водій постачальника має залишатися на місці до завершення перевірки товару та, у разі виявлення розбіжностей, до погодження способу їх вирішення.</p><p>Після приймання одразу передати накладну відповідальному за товарний облік (зараз — Віра) для внесення товару, кількості та закупівельної ціни в облікову програму. Якщо постачальнику передаються готівкові кошти, на накладній, що залишається в компанії, мають бути сума, дата, ПІБ і підпис особи, яка отримала гроші.</p></div>
      <div class="box"><h3>2. Розміщення та зберігання</h3><p>Розміщувати прийнятий товар у визначеному місці; зберігати так, щоб не допустити пошкодження, намокання, забруднення чи псування; підтримувати порядок і вільний доступ. Пошкоджений або проблемний товар відокремлювати від придатного до продажу та повідомляти відповідального.</p><p><b>Головне правило:</b> Кожен вид товару має своє визначене місце зберігання.</p><p><b>Піддони та вторсировина:</b> порожні піддони складати у визначеному місці та періодично продавати; використану плівку збирати й пакувати в мішки, картон — збирати компактно. Кошти від продажу піддонів і вторсировини здавати в касу компанії та повідомляти суму відповідальному за фінансовий/касовий облік.</p></div>
      <div class="box"><h3>3. Підготовка та видача товару клієнту</h3><p>Отримати чек, накладну або інший офіційний документ на видачу; підготувати товар; звірити назву і кількість із документом; видати правильний товар у правильній кількості та за потреби допомогти із завантаженням. Про пошкодження, відсутність або розбіжність залишків одразу повідомляти відповідального.</p><p><b>Правило:</b> Товар видається на підставі офіційного документа. Завідувач складу не вирішує самостійно питання оплати або відпуску в борг.</p></div>
      <div class="box"><h3>4. Доставка товару</h3><p>Завдання на доставку надходить від відповідального менеджера з продажу (зараз — Галя або Віра) у робочій Viber-групі, зазвичай разом із чеком/накладною, адресою і телефоном клієнта. Перед завантаженням і виїздом зателефонувати клієнту, підтвердити готовність прийняти товар, за потреби уточнити суму оплати та організацію розвантаження.</p><p>Перед завантаженням звірити товар і кількість із документом, правильно завантажити та захистити товар. Під час розвантаження разом із клієнтом перерахувати й перевірити товар; залишатися до завершення перевірки. Про нестачу, пошкодження або іншу розбіжність негайно повідомити відповідального менеджера.</p><p>Якщо отримана оплата — після повернення здати гроші в касу. Після доставки повідомити у Viber-групі номер чека/накладної та статус доставки; якщо отримана оплата — суму і факт здачі грошей у касу.</p></div>
      <div class="box"><h3>5. Ревізія та контроль залишків</h3><p>Не рідше одного разу на місяць, в останній тиждень місяця, провести фізичний перерахунок товару та звірити його з обліковою програмою. Зафіксувати нестачі, надлишки, пересорт, пошкодження, прострочений товар і товар, строк придатності якого скоро закінчується. Після ревізії зробити 3–4 фото складу.</p><p>При розбіжностях не змінювати залишки в програмі самостійно — зафіксувати їх і передати відповідальному за товарний облік (зараз — Віра) для перевірки.</p></div>
      <div class="box"><h3>6. Технічні роботи та оренда риштування</h3><p>Виконувати колерування фарби, декоративної штукатурки «баранка» та кварцової ґрунтовки; готувати мозаїчну штукатурку за каталогом/рецептурою; після роботи очищати міксер і робочу зону; виконувати дрібні господарські та прості ремонтні роботи, пов’язані зі складом, обладнанням і риштуванням.</p><p><b>Перед кожним колеруванням:</b> перевіряти рівні колорантів у ємностях колерувальної машини, за потреби доливати; завчасно повідомляти відповідального за закупівлі про необхідність поповнення запасу. Не починати колерування без перевірки потрібних колорантів.</p><p><b>Викраска:</b> після колерування фарби або «баранки» зробити викраску, підписати щонайменше номером чека, бажано також номером/кодом кольору, та зберегти у визначеному місці. Колерування вважається завершеним тільки після того, як зроблена, підписана та збережена викраска.</p><p><b>Риштування:</b> при видачі заповнити документ із датою, видом і кількістю елементів. При поверненні за тим самим документом перерахувати комплектність і перевірити стан, визначити кількість днів оренди та суму оплати. Отриману оплату здати в касу, а в документі зафіксувати дату повернення, кількість днів і суму. Пошкоджені елементи відокремити; дрібні пошкодження відремонтувати перед поверненням у доступний запас, про серйозні — повідомити відповідального та погодити компенсацію з орендарем до повного закриття оренди.</p></div>
      <div class="box"><h3>7. Автомобіль і заправка</h3><p>Підтримувати базовий технічний стан, чистоту й порядок автомобіля та вантажного відсіку. Не перевантажувати автомобіль понад дозволену вантажопідйомність. Не рідше одного разу на місяць і перед довшими поїздками перевіряти рівень моторної оливи та охолоджувальної рідини. Про несправності, сигнальні лампи й незвичні шуми повідомляти відповідального; не продовжувати рух, якщо несправність створює ризик ДТП або серйозної поломки.</p><p><b>Заправка:</b> перед заправкою отримати необхідні кошти з каси; після заправки обов’язково взяти фіскальний чек, повідомити кількість літрів і суму та передати чек/фото відповідальному за облік витрат (зараз — Віра). Невикористані кошти повернути в касу.</p></div>
      <div class="box"><h3>8. Відповідальність</h3><p>Не приховувати помилки, нестачі, пошкодження та інші проблеми; одразу повідомляти відповідального. Якщо завдання неможливо виконати правильно або вчасно — попередити завчасно. Не приймати рішення поза межами своїх повноважень.</p><p><b>Головне правило:</b> Проблему виявив → повідомив → допоміг вирішити.</p></div>
      <div class="box"><h3>💰 Система оплати</h3><p><b>Зарплата = базова оплата за виконання стандарту + відрядна оплата за виконані операції.</b></p><p>Робоча базова ставка: <b>15 000 грн/місяць</b> за дотримання стандарту посади. Відрядна частина нараховується лише за правильно виконану та зафіксовану роботу. Актуальні тарифи власник може змінювати у вкладці «⚙️ Налаштування».</p></div>
    </div>
    <div id="staff-settings" class="stafftab">
      <div class="box"><h3>⚙️ Оплата — редагує власник</h3><div class="field"><label for="staff-baseinput">Базова оплата за повний місяць, грн</label><input id="staff-baseinput" type="number" min="0" step=".01"></div><button type="button" class="primary" onclick="saveStaffBase()">Зберегти базу</button></div>
      <div class="box"><h3>Тарифи виробітку</h3><div id="staff-rates"></div><h4>Додати нову роботу</h4><div class="form"><div class="field"><label for="staff-newname">Назва</label><input id="staff-newname"></div><div class="field"><label for="staff-newrate">Тариф, грн</label><input id="staff-newrate" type="number" min="0" step=".01"></div><div class="field"><label for="staff-newunit">Одиниця</label><input id="staff-newunit" placeholder="шт., відро, км"></div></div><button type="button" class="primary" onclick="addStaffRate()">+ Додати</button></div>
      <div class="box"><h3>Резервна копія даних працівника</h3><p class="note">Експорт та імпорт стосуються лише модуля «Працівники». Інші розділи не змінюються.</p><button type="button" onclick="exportStaffData()">⬇️ Експорт даних</button> <label class="btn" style="display:inline-block;cursor:pointer">⬆️ Відновити з копії<input class="hide" type="file" accept="application/json,.json" onchange="importStaffData(this)"></label></div>
    </div>`;

  const STAFF_KEY = K;
  const staffRatesDefault = [
    ["Колерування «баранка»", 40, "відро"],
    ["Колерування фарби", 40, "відро"],
    ["Колерування кварцової ґрунтовки", 40, "відро"],
    ["Приготування мозаїчної штукатурки", 50, "відро"],
    ["Доставка — робота водієм", 4, "км"],
    ["Видача риштування + бланк", 100, "видача"],
    ["Приймання, перерахунок і складання риштування", 100, "приймання"],
    ["Приймання / розвантаження звичайного товару", 2, "од."],
    ["Завантаження / видача звичайного товару", 2, "од."],
    ["Завантаження або розвантаження вікна", 30, "шт."],
    ["Завантаження або розвантаження дверей", 50, "шт."]
  ];
  const staffChecks = [
    "Склад прибраний",
    "Товар стоїть на визначених місцях",
    "Проходи вільні",
    "Робоча зона чиста",
    "Сміття прибране",
    "Пошкоджений товар не прихований; проблеми повідомлені",
    "Автомобіль у належному стані; несправності повідомлені",
    "Вода для миття міксера чиста / замінена за потреби",
    "Міксер і робоча зона чисті",
    "Дрібні господарські роботи виконані або проблема зафіксована"
  ];
  const staffRevisionChecks = [
    "Фактичні залишки перераховані",
    "Залишки звірені з обліком",
    "Нестачі / надлишки / пересорт зафіксовані",
    "Пошкоджений товар зафіксований",
    "Прострочений товар перевірений і зафіксований",
    "Товар, строк якого скоро закінчується, зафіксований",
    "Про проблеми повідомлено відповідального",
    "Склад після ревізії прибраний; товар на місцях; проходи вільні"
  ];
  let staffReadError = "";
  let pendingRevisionPhotos = null;

  function isStaffRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function freshStaffData() {
    return {
      base: 15000,
      rates: staffRatesDefault.map((rate, index) => ({ id: `r${index}`, name: rate[0], rate: rate[1], unit: rate[2] })),
      shifts: [],
      active: null,
      works: [],
      standards: {},
      revisions: {},
      audit: []
    };
  }

  function normalizeStaffData(value) {
    const defaults = freshStaffData();
    if (!isStaffRecord(value)) return defaults;
    return {
      ...defaults,
      ...value,
      base: Number.isFinite(Number(value.base)) && Number(value.base) >= 0 ? Number(value.base) : defaults.base,
      rates: Array.isArray(value.rates) ? value.rates : defaults.rates,
      shifts: Array.isArray(value.shifts) ? value.shifts : defaults.shifts,
      active: typeof value.active === "string" ? value.active : null,
      works: Array.isArray(value.works) ? value.works : defaults.works,
      standards: isStaffRecord(value.standards) ? value.standards : defaults.standards,
      revisions: isStaffRecord(value.revisions) ? value.revisions : defaults.revisions,
      audit: Array.isArray(value.audit) ? value.audit : defaults.audit
    };
  }

  function setStaffNotice(message, isError = false) {
    const notice = document.getElementById("staffnotice");
    notice.textContent = message;
    notice.hidden = !message;
    notice.classList.toggle("danger", isError);
  }

  function loadStaffData() {
    const raw = localStorage.getItem(STAFF_KEY);
    if (!raw) return freshStaffData();
    try {
      const parsed = JSON.parse(raw);
      if (!isStaffRecord(parsed)) throw new Error("Некоректна структура даних.");
      return normalizeStaffData(parsed);
    } catch (error) {
      staffReadError = "Не вдалося прочитати myCompanyStaff_v13. Дані не перезаписано. Відновіть їх із резервної копії.";
      return freshStaffData();
    }
  }

  function saveStaffData(allowReplacingUnreadable = false) {
    if (staffReadError && !allowReplacingUnreadable) {
      setStaffNotice(staffReadError, true);
      return false;
    }
    try {
      localStorage.setItem(STAFF_KEY, JSON.stringify(S));
      staffReadError = "";
      setStaffNotice("Дані працівника збережено.");
      return true;
    } catch (error) {
      setStaffNotice("Не вдалося зберегти дані. Перевірте вільне місце в браузері та розмір фото.", true);
      return false;
    }
  }

  function staffPlan(month) {
    const [year, monthNumber] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    let hours = 0;
    for (let date = 1; date <= daysInMonth; date += 1) {
      const weekday = new Date(year, monthNumber - 1, date).getDay();
      if (weekday > 0 && weekday < 6) hours += 9;
    }
    return hours;
  }

  function staffMinutes(start, end) {
    const minutes = Math.round((new Date(end) - new Date(start)) / 60000);
    return Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
  }

  function staffFormatTime(minutes) {
    const rounded = Math.round(minutes);
    const hours = Math.floor(rounded / 60);
    const remainingMinutes = rounded % 60;
    if (hours && remainingMinutes) return `${hours} год ${remainingMinutes} хв`;
    if (hours) return `${hours} год`;
    return remainingMinutes ? `${remainingMinutes} хв` : "0 хв";
  }

  function staffFormatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? esc(value || "—") : date.toLocaleDateString("uk-UA");
  }

  function staffFormatTimeOfDay(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
  }

  function staffStatusValue(record, index, legacyField, legacyValue) {
    if (record.status && record.status[index]) return record.status[index];
    if (record[legacyField] && record[legacyField][index]) return legacyValue;
    return "";
  }

  function renderStaff() {
    const month = mon();
    const plan = staffPlan(month);
    const minutes = S.shifts
      .filter((shift) => shift && typeof shift.start === "string" && shift.start.slice(0, 7) === month)
      .reduce((total, shift) => total + staffMinutes(shift.start, shift.end), 0);
    const piecework = S.works
      .filter((work) => work && !work.voided && typeof work.date === "string" && work.date.slice(0, 7) === month)
      .reduce((total, work) => total + (Number(work.amount) || 0), 0);

    document.getElementById("staff-baseview").textContent = M(S.base);
    document.getElementById("staff-hoursview").textContent = staffFormatTime(minutes);
    document.getElementById("staff-planview").textContent = `План: ${plan} год • ${(plan ? S.base / plan : 0).toFixed(2)} грн/год`;
    document.getElementById("staff-salaryview").textContent = M(minutes / 60 * (plan ? S.base / plan : 0) + piecework);
    document.getElementById("staff-baseinput").value = S.base;
    document.getElementById("staff-start").classList.toggle("hide", Boolean(S.active));
    document.getElementById("staff-end").classList.toggle("hide", !S.active);
    document.getElementById("staff-shiftstate").innerHTML = S.active
      ? `<span class="status ok">Зміна відкрита</span> ${staffFormatTimeOfDay(S.active)}`
      : '<span class="status">Зміна не відкрита</span>';

    document.getElementById("staff-shiftlog").innerHTML = [...S.shifts].reverse().map((shift) =>
      `<tr><td>${staffFormatDate(shift.start)}</td><td>${staffFormatTimeOfDay(shift.start)}</td><td>${staffFormatTimeOfDay(shift.end)}</td><td>${staffFormatTime(staffMinutes(shift.start, shift.end))}</td></tr>`
    ).join("") || '<tr><td colspan="4" class="note">Змін ще не зафіксовано.</td></tr>';

    renderStaffRates();
    renderStaffWork();
    renderStaffChecks();
    renderStaffRevision();
  }

  function startStaffShift() {
    if (S.active) return;
    const startedAt = new Date().toISOString();
    S.active = startedAt;
    S.audit.push({ at: startedAt, type: "start" });
    if (saveStaffData()) renderStaff();
  }

  function endStaffShift() {
    if (!S.active) return;
    const endedAt = new Date().toISOString();
    S.shifts.push({ start: S.active, end: endedAt });
    S.audit.push({ at: endedAt, type: "end", start: S.active });
    S.active = null;
    if (saveStaffData()) renderStaff();
  }

  function currentStaffRate() {
    const select = document.getElementById("staff-wt");
    return S.rates.find((rate) => rate && String(rate.id) === select.value) || S.rates[0] || null;
  }

  function calculateStaffWork() {
    const rate = currentStaffRate();
    if (!rate) {
      document.getElementById("staff-ql").textContent = "Кількість";
      document.getElementById("staff-wcalc").textContent = M(0);
      return;
    }
    document.getElementById("staff-ql").textContent = `Кількість (${esc(rate.unit || "")})`;
    document.getElementById("staff-wcalc").textContent = M((Number(document.getElementById("staff-wq").value) || 0) * (Number(rate.rate) || 0));
  }

  function renderStaffWork() {
    const select = document.getElementById("staff-wt");
    const previouslySelected = select.value;
    select.innerHTML = S.rates.map((rate, index) => {
      const id = rate && rate.id != null ? String(rate.id) : `legacy-rate-${index}`;
      const name = rate && rate.name != null ? rate.name : "Робота";
      const amount = rate && Number.isFinite(Number(rate.rate)) ? Number(rate.rate) : 0;
      const unit = rate && rate.unit != null ? rate.unit : "";
      return `<option value="${esc(id)}">${esc(name)} — ${amount} грн/${esc(unit)}</option>`;
    }).join("") || '<option value="">Немає тарифів</option>';
    if (S.rates.some((rate, index) => String(rate && rate.id != null ? rate.id : `legacy-rate-${index}`) === previouslySelected)) {
      select.value = previouslySelected;
    }
    calculateStaffWork();

    document.getElementById("staff-worklog").innerHTML = [...S.works].reverse().map((work) => {
      const id = work && work.id != null ? String(work.id) : "";
      const status = work && work.voided ? `<span class="note">${work.cancelled ? "скасовано" : "виправлено"}</span>` :
        `<button type="button" data-staff-action="correct" data-id="${esc(id)}">Виправити</button> <button type="button" class="danger" data-staff-action="cancel" data-id="${esc(id)}">Скасувати</button>`;
      return `<tr style="${work && work.voided ? "opacity:.45;text-decoration:line-through" : ""}"><td>${staffFormatDate(work && work.date)}</td><td>${esc(work && work.name || "")}</td><td>${esc((work && work.qty) ?? "")} ${esc(work && work.unit || "")}</td><td>${M(work && work.amount)}</td><td>${esc(work && work.comment || "")}</td><td>${status}</td></tr>`;
    }).join("") || '<tr><td colspan="6" class="note">Робіт ще не додано.</td></tr>';
  }

  function addStaffWork() {
    const rate = currentStaffRate();
    const quantityInput = document.getElementById("staff-wq");
    const quantity = Number(quantityInput.value);
    if (!rate || !Number.isFinite(quantity) || quantity <= 0) {
      alert("Вкажіть тариф і кількість більше нуля.");
      return;
    }
    const recordedAt = new Date().toISOString();
    const work = {
      id: `w${Date.now()}`,
      date: recordedAt,
      name: String(rate.name || ""),
      qty: quantity,
      unit: String(rate.unit || ""),
      rate: Number(rate.rate) || 0,
      amount: quantity * (Number(rate.rate) || 0),
      comment: document.getElementById("staff-wc").value.trim(),
      voided: false
    };
    S.works.push(work);
    S.audit.push({ at: recordedAt, type: "work", id: work.id });
    if (saveStaffData()) {
      quantityInput.value = "";
      document.getElementById("staff-wc").value = "";
      renderStaff();
    }
  }

  function correctStaffWork(id) {
    const original = S.works.find((work) => work && String(work.id) === String(id));
    if (!original || original.voided) return;
    const quantity = prompt("Правильна кількість:", original.qty);
    if (quantity === null || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0) return;
    const comment = prompt("Правильний коментар:", original.comment || "");
    if (comment === null) return;
    const correctedAt = new Date().toISOString();
    original.voided = true;
    const corrected = {
      ...original,
      id: `w${Date.now()}`,
      date: correctedAt,
      qty: Number(quantity),
      amount: Number(quantity) * (Number(original.rate) || 0),
      comment,
      voided: false,
      correctionOf: original.id
    };
    S.works.push(corrected);
    S.audit.push({ at: correctedAt, type: "correction", old: original.id, new: corrected.id });
    if (saveStaffData()) renderStaff();
  }

  function cancelStaffWork(id) {
    const work = S.works.find((entry) => entry && String(entry.id) === String(id));
    if (!work || work.voided || !confirm("Скасувати цей запис? Він залишиться в історії, але не буде врахований у зарплаті.")) return;
    work.voided = true;
    work.cancelled = true;
    work.cancelledAt = new Date().toISOString();
    S.audit.push({ at: work.cancelledAt, type: "cancel", id: work.id });
    if (saveStaffData()) renderStaff();
  }

  function renderStaffRates() {
    document.getElementById("staff-rates").innerHTML = S.rates.map((rate, index) =>
      `<div class="rate"><div class="form"><div class="field"><label for="staff-rn${index}">Робота</label><input id="staff-rn${index}" value="${esc(rate && rate.name || "")}"></div><div class="field"><label for="staff-rr${index}">Тариф, грн</label><input id="staff-rr${index}" type="number" min="0" step=".01" value="${Number(rate && rate.rate) || 0}"></div><div class="field"><label for="staff-ru${index}">Одиниця</label><input id="staff-ru${index}" value="${esc(rate && rate.unit || "")}"></div></div><button type="button" onclick="saveStaffRate(${index})">Зберегти</button> <button type="button" class="danger" onclick="deleteStaffRate(${index})">Видалити</button></div>`
    ).join("") || '<p class="note">Тарифів ще немає.</p>';
  }

  function saveStaffRate(index) {
    const rate = S.rates[index];
    const name = document.getElementById(`staff-rn${index}`).value.trim();
    const amount = Number(document.getElementById(`staff-rr${index}`).value);
    const unit = document.getElementById(`staff-ru${index}`).value.trim();
    if (!rate || !name || !unit || !Number.isFinite(amount) || amount < 0) return alert("Перевірте назву, тариф і одиницю.");
    Object.assign(rate, { name, rate: amount, unit });
    if (saveStaffData()) {
      renderStaff();
      alert("Тариф змінено.");
    }
  }

  function deleteStaffRate(index) {
    if (!S.rates[index] || !confirm("Видалити тариф?")) return;
    S.rates.splice(index, 1);
    if (saveStaffData()) renderStaff();
  }

  function addStaffRate() {
    const name = document.getElementById("staff-newname").value.trim();
    const amountText = document.getElementById("staff-newrate").value;
    const amount = Number(amountText);
    const unit = document.getElementById("staff-newunit").value.trim();
    if (!name || amountText === "" || !Number.isFinite(amount) || amount < 0 || !unit) {
      alert("Заповніть назву, невід’ємний тариф і одиницю.");
      return;
    }
    S.rates.push({ id: `r${Date.now()}`, name, rate: amount, unit });
    if (saveStaffData()) {
      document.getElementById("staff-newname").value = "";
      document.getElementById("staff-newrate").value = "";
      document.getElementById("staff-newunit").value = "";
      renderStaff();
    }
  }

  function renderStaffChecks() {
    const record = S.standards[day()] || { status: {}, note: "" };
    document.getElementById("staff-checks").innerHTML = staffChecks.map((label, index) => {
      const value = staffStatusValue(record, index, "c", "done");
      return `<div class="statusrow"><b>${esc(label)}</b><select id="staff-c${index}"><option value="" ${value === "" ? "selected" : ""}>— Оберіть статус —</option><option value="done" ${value === "done" ? "selected" : ""}>✅ Виконано</option><option value="na" ${value === "na" ? "selected" : ""}>➖ Не було потреби</option><option value="problem" ${value === "problem" ? "selected" : ""}>⚠️ Є проблема</option></select></div>`;
    }).join("");
    document.getElementById("staff-stdcomment").value = record.note || "";
  }

  function saveStaffStandard() {
    const status = {};
    staffChecks.forEach((_, index) => { status[index] = document.getElementById(`staff-c${index}`).value; });
    const note = document.getElementById("staff-stdcomment").value.trim();
    if (Object.values(status).includes("problem") && !note) return alert("Є пункт зі статусом «Є проблема». Опишіть проблему в коментарі.");
    S.standards[day()] = { status, note, saved: new Date().toISOString() };
    if (saveStaffData()) alert("Чек-лист збережено.");
  }

  function renderStaffRevision() {
    const record = S.revisions[mon()] || { status: {}, note: "", photos: [] };
    document.getElementById("staff-revchecks").innerHTML = staffRevisionChecks.map((label, index) => {
      const value = staffStatusValue(record, index, "c", "ok");
      return `<div class="statusrow"><b>${esc(label)}</b><select id="staff-rv${index}"><option value="" ${value === "" ? "selected" : ""}>— Оберіть результат —</option><option value="ok" ${value === "ok" ? "selected" : ""}>✅ Перевірено — все добре</option><option value="problem" ${value === "problem" ? "selected" : ""}>⚠️ Виявлено проблему</option></select></div>`;
    }).join("");
    document.getElementById("staff-revnote").value = record.note || "";
    document.getElementById("staff-photopreview").innerHTML = (Array.isArray(record.photos) ? record.photos : []).map((photo) => `<img src="${esc(photo)}" alt="Фото ревізії">`).join("");
    document.getElementById("staff-revhistory").innerHTML = Object.keys(S.revisions).sort().reverse().map((month) => {
      const revision = S.revisions[month] || {};
      const photos = Array.isArray(revision.photos) ? revision.photos.length : 0;
      return `<div class="rate"><b>${esc(month)}</b> — ревізію збережено • 📷 ${photos} фото<br><span class="note">${esc(revision.note || "")}</span></div>`;
    }).join("");
  }

  function readCompressedStaffPhoto(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) return reject(new Error("Оберіть файли зображень."));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Не вдалося прочитати фото."));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("Не вдалося відкрити одне з фото."));
        image.onload = () => {
          const scale = Math.min(1, 700 / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const context = canvas.getContext("2d");
          if (!context) return reject(new Error("Браузер не зміг підготувати фото."));
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          try {
            resolve(canvas.toDataURL("image/jpeg", 0.55));
          } catch (error) {
            reject(error);
          }
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function previewStaffPhotos(input) {
    const files = [...input.files];
    if (files.length > 4) {
      input.value = "";
      alert("Для фотозвіту можна додати не більше 4 фото.");
      return;
    }
    if (!files.length) return;
    try {
      pendingRevisionPhotos = await Promise.all(files.map(readCompressedStaffPhoto));
      document.getElementById("staff-photopreview").innerHTML = pendingRevisionPhotos.map((photo) => `<img src="${photo}" alt="Попередній перегляд фото">`).join("");
    } catch (error) {
      pendingRevisionPhotos = null;
      input.value = "";
      alert(error.message || "Не вдалося підготувати фото.");
    }
  }

  function saveStaffRevision() {
    const status = {};
    staffRevisionChecks.forEach((_, index) => { status[index] = document.getElementById(`staff-rv${index}`).value; });
    const note = document.getElementById("staff-revnote").value.trim();
    if (Object.values(status).includes("problem") && !note) return alert("Виявлено проблему. Обов’язково опишіть її нижче.");
    const previous = S.revisions[mon()] || {};
    S.revisions[mon()] = {
      status,
      note,
      photos: pendingRevisionPhotos || previous.photos || [],
      saved: new Date().toISOString()
    };
    if (saveStaffData()) {
      pendingRevisionPhotos = null;
      document.getElementById("staff-revphotos").value = "";
      renderStaff();
      alert("Ревізію збережено.");
    }
  }

  function saveStaffBase() {
    const input = document.getElementById("staff-baseinput");
    const amount = Number(input.value);
    if (input.value === "" || !Number.isFinite(amount) || amount < 0) return alert("Вкажіть невід’ємну базову оплату.");
    S.base = amount;
    if (saveStaffData()) {
      renderStaff();
      alert("Базову оплату змінено.");
    }
  }

  function buildStaffBackup() {
    if (staffReadError) throw new Error(staffReadError);
    return {
      version: "1.4.0-staff",
      exportedAt: new Date().toISOString(),
      staff: S
    };
  }

  function exportStaffData() {
    let backup;
    try {
      backup = buildStaffBackup();
    } catch (error) {
      setStaffNotice(error.message, true);
      return;
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `moya-kompaniya-staff-backup-${day()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setStaffNotice("Резервну копію даних працівника створено.");
  }

  function validStaffBackup(data) {
    const candidate = isStaffRecord(data) && isStaffRecord(data.staff) ? data.staff : data;
    if (!isStaffRecord(candidate)) return false;
    const staffFields = ["base", "rates", "shifts", "active", "works", "standards", "revisions", "audit"];
    if (!staffFields.some((field) => Object.prototype.hasOwnProperty.call(candidate, field))) return false;
    for (const field of ["rates", "shifts", "works", "audit"]) {
      if (field in candidate && !Array.isArray(candidate[field])) return false;
    }
    for (const field of ["standards", "revisions"]) {
      if (field in candidate && !isStaffRecord(candidate[field])) return false;
    }
    if ("base" in candidate && (!Number.isFinite(Number(candidate.base)) || Number(candidate.base) < 0)) return false;
    return true;
  }

  function importStaffData(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => {
      setStaffNotice("Не вдалося прочитати резервну копію.", true);
      input.value = "";
    };
    reader.onload = () => {
      try {
        const backup = JSON.parse(reader.result);
        if (!validStaffBackup(backup)) throw new Error("Файл не містить коректних даних модуля «Працівники».");
        const imported = isStaffRecord(backup.staff) ? backup.staff : backup;
        if (!confirm("Відновити резервну копію модуля «Працівники»? Інші розділи не зміняться.")) return;
        const previous = S;
        S = normalizeStaffData(imported);
        if (!saveStaffData(true)) {
          S = previous;
          return;
        }
        renderStaff();
        alert("Дані працівника відновлено з резервної копії.");
      } catch (error) {
        setStaffNotice(error.message || "Не вдалося прочитати резервну копію.", true);
      } finally {
        input.value = "";
      }
    };
    reader.readAsText(file);
  }

  Object.assign(window, {
    startStaffShift,
    endStaffShift,
    calculateStaffWork,
    addStaffWork,
    saveStaffStandard,
    previewStaffPhotos,
    saveStaffRevision,
    saveStaffBase,
    saveStaffRate,
    deleteStaffRate,
    addStaffRate,
    exportStaffData,
    importStaffData
  });

  root.querySelectorAll(".tabs [data-t]").forEach((button) => {
    button.addEventListener("click", () => {
      root.querySelectorAll(".tabs [data-t]").forEach((tab) => tab.classList.remove("on"));
      root.querySelectorAll(".stafftab").forEach((tab) => tab.classList.remove("on"));
      button.classList.add("on");
      document.getElementById(button.dataset.t).classList.add("on");
      renderStaff();
    });
  });
  document.getElementById("staff-worklog").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-staff-action]");
    if (!button) return;
    if (button.dataset.staffAction === "correct") correctStaffWork(button.dataset.id);
    if (button.dataset.staffAction === "cancel") cancelStaffWork(button.dataset.id);
  });

  S = normalizeStaffData(loadStaffData());
  renderStaff();
  if (staffReadError) setStaffNotice(staffReadError, true);
})();
