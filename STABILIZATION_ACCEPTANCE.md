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
