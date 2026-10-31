# Stabilization acceptance — v1.4

## Scope
Restore lost v1.3.6 operational functionality without changing production/main, org v2.1, cloud synchronization logic, or established localStorage keys.

## Staff
- [x] isolated restored implementation exists
- [x] uses `myCompanyStaff_v13`
- [x] shift/time/pay
- [x] work output
- [x] daily standards
- [x] monthly revision/photos
- [x] instruction
- [x] rates/settings
- [x] isolated test page
- [ ] browser acceptance by owner before production merge

## Market
- [x] isolated test implementation exists
- [x] uses `myCompanyMarket_v1`
- [x] competitors/manufacturers
- [x] add/edit entity
- [x] products and units
- [x] price checks append history rather than overwrite
- [x] last/next check date
- [x] notes/contact
- [x] history visible
- [ ] browser acceptance by owner before production merge

## Regression guard
- [x] main not modified by stabilization work
- [x] org v2.1 not modified
- [x] cloud code not modified
- [x] old storage keys retained

## Next integration gate
Do not merge this draft PR until the isolated Staff and Market pages are manually checked in a browser. After acceptance, integrate the two restored modules into the stabilization `index.html`, run the eight-section regression checklist, then merge only with owner approval.

## Follow-up fixes — 31 October 2026
- [x] Validate stored JSON and supported data structure before allowing writes.
- [x] Keep malformed stored bytes unchanged and show a blocking explanation.
- [x] Reject writes from stale pages when another tab has changed the data.
- [x] Report storage/quota failures without claiming success.
- [x] Export/import separate Staff and Market backups; validate module/version, confirm replacement, download prior raw bytes before importing.
- [x] Correct quantity/comment of a work entry with a required reason and before/after audit record.
- [x] Cancel work without deleting its history; exclude cancelled work from pay.
- [x] Preserve price-check history; reject invalid prices/dates and cancelled input.
- [x] 18 automated DOM/storage scenarios passed using jsdom.
- [x] Automated Chromium acceptance: all 17 Playwright scenarios passed on 31 October 2026. Includes downloads/import recovery, stale tabs, malformed data, quota failure, work adjustment/cancellation and price history.
- [x] Initial Staff and Market screens visually checked at 390 and 1280 px; no horizontal page overflow. Emoji icons were not rendered by the test browser's font set. Owner acceptance remains pending.
- [ ] Integration into stabilization index.html and eight-section regression.

Tests: `node tests/storage-and-actions.test.cjs` requires jsdom. `node tests/stabilization.test.cjs` requires Playwright with Chromium. Run in a separate test browser profile with synthetic data, not on the working application's origin or personal business data. These isolated pages retain the existing keys and intentionally do not change production or cloud synchronization.

Known scope limits: imports replace one module, not the whole company database. Audit history is local and is not tamper-proof or tied to authenticated staff identities. Salary checks cover the tested work adjustments; they do not certify every payroll rule. Future cloud integration must preserve these storage guards rather than bypass them.
