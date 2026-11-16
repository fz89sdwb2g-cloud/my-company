# Перевірка безпеки — 16.11.2026

## Межі
Крок 1: читальна перевірка робочої Supabase та пропозиція міграції. Зміни робочої бази, Auth, main і сайту не виконувалися. Резервні копії робочих даних ще не створювалися, оскільки змін немає; до застосування міграції потрібні приватний JSON-експорт програми й копія company_data разом зі схемою та політиками. Файли браузера, не збережені в хмару, неможливо відновити лише з company_data.

## Фактичні таблиці public
| Таблиця | RLS | Політики | Доступ браузера |
|---|---|---|---|
| company_data | увімкнено | SELECT/INSERT/UPDATE: auth.uid() = user_id, роль PUBLIC | authenticated має CRUD, anon має табличні привілеї, але політики не дають чужих рядків; DELETE-політики немає |
| marketing_photos | увімкнено | SELECT/INSERT/UPDATE/DELETE, authenticated, user_id = auth.uid(); UPDATE має WITH CHECK | власні записи |
| cust_sales_snapshots | увімкнено | SELECT, authenticated, user_id = auth.uid() | лише читання власного знімка |
| cust_inventory_snapshots | увімкнено | SELECT, authenticated, user_id = auth.uid() | лише читання власного знімка |
| cust_analysis_snapshots | увімкнено | SELECT, authenticated, user_id = auth.uid() | лише читання власного знімка |
| cust_inventory_classification | увімкнено | немає | anon/authenticated не мають SELECT; доступ лише серверний |

Для UPDATE/INSERT company_data та marketing_photos перевірка user_id є у WITH CHECK. Таблиці автоматичних знімків не слід відкривати для запису користувачем.

## Storage
Єдиний бакет: marketing-photos, public=false. Ліміт 15 MiB; JPEG/PNG/WebP. RLS storage.objects увімкнено. Чотири політики SELECT/INSERT/UPDATE/DELETE для authenticated: bucket_id='marketing-photos' і перша папка шляху = auth.uid()::text; INSERT та UPDATE мають WITH CHECK з тією самою умовою. Загального анонімного читання немає.

## Що запускалося
1. Читання pg_class, pg_policies, has_table_privilege, information_schema.columns, storage.buckets — таблиці й права перелічені вище. Жодні фінансові записи не виводилися.
2. Транзакція BEGIN; SET LOCAL ROLE authenticated; request.jwt.claims з синтетичним чужим UUID; COUNT(*) по company_data, трьох snapshot-таблицях, marketing_photos і storage.objects; ROLLBACK — кожен результат 0. Це перевірка RLS на рівні PostgreSQL, НЕ реальна сесія другого тестового акаунта.
3. Supabase security advisors: INFO про відсутність політик cust_inventory_classification (очікувано для серверної таблиці); WARN: leaked-password protection вимкнено. Автоматичне додавання політик класифікатору не потрібне. Захист від скомпрометованих паролів потребує окремої перевірки можливостей тарифу.

4. Реальні HTTP GET з publishable-ключем без Authorization: company_data — HTTP 200, порожній масив; інші п’ять таблиць — HTTP 401. Дані не повернуті.
5. GET /auth/v1/settings: disable_signup=false, email=true, mailer_autoconfirm=false, anonymous_users=false. Вільна email-реєстрація увімкнена з підтвердженням пошти. Пропозиція: вимкнути відкриту реєстрацію після підтвердження списку дозволених користувачів; наявні акаунти не видаляти. Налаштування не змінювалося.

## Пропозиція
supabase/company-data-rls.sql — відтворювана транзакційна міграція, не застосована. Замінює три попередні політики чотирма явними owner-only політиками для authenticated, прибирає загальні й анонімні привілеї. Формат даних та ключі localStorage не змінює. DELETE дозволяється лише власнику відповідно до погодженої вимоги.

## Ще не підтверджено
- Справжній HTTP-запит під другим тестовим акаунтом: немає наданої тестової сесії; імітація ролі її не замінює.
- Повний сценарій входу власника, редагування, відновлення й фото в браузері.
- Копії робочих таблиць і локального JSON до зміни.
- Приватний репозиторій і доступність Pages на поточному тарифі; видимість не змінювати.
- Вилучення публічних файлів і перенос цін — окремі наступні зміни; ця гілка їх не виконує. Зараз реальні ціни та старі документи залишаються публічними, включно з історією git.

## Довідки
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Тести репозиторію
Встановлено залежності npm install --ignore-scripts --no-package-lock. npm test завершився з кодом 1 ще на першому сценарії: TypeError cloud.auth.onAuthStateChange is not a function у tests/integration.cjs. Поточна тестова заглушка Supabase містить тільки getSession, а програма вже використовує onAuthStateChange. Це відтворено на незміненій main; запропонований SQL не був причиною. Заглушку та решту сценаріїв треба актуалізувати окремо; npm test зараз НЕ вважається пройденим. Міграція не запускалася в робочій базі навіть для перевірки, щоб не виконувати DDL до резервування й погодження.
