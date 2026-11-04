# 1.6.0 — advertising photo library

Marketing now contains a private cloud photo library with multi-file upload, categories, title search, pagination, editable descriptions, original previews/downloads and confirmed deletion. Up to 10 JPG/PNG/WebP images per batch, 15 MiB each. Originals are retained without recompression; a separate JPEG thumbnail is generated in the browser.

## One-time activation (required)

Apply `supabase/marketing-photos.sql` in the existing project's SQL Editor. It creates an independent metadata table and private Storage bucket, with authenticated user ownership policies. No company_data records, local data keys or manual cloud-sync functions change. Existing login is reused. Devices must use the same cloud account; there is no team-sharing model in this release.

The UI explains missing setup/login, provides a copy-settings action and a link to this project's SQL Editor. The migration is rerunnable. A read-only check of the existing API confirmed PGRST205 (table not created) before publication. The migration has NOT been applied and real cloud uploads/RLS have NOT been verified yet; they need administrator access. Supabase connection was offered to complete activation.

## Data and failure behavior

Photo files and records are separate from the company's manual cloud snapshot; uploading an old company snapshot cannot delete this photo library. The JSON export includes an explicit `externalFiles.marketingPhotos.included:false` declaration; the UI says photo binaries are excluded and recommends keeping originals. No private photos or credentials are committed in the public repository.

Uploads preserve pending selection on failure; a committed insert with a lost response is reconciled before rollback/retry to prevent deleting a successful original. Metadata edits use optimistic updated_at matching. Storage and database cannot be deleted in one transaction: a failed metadata deletion after file deletion gives an explicit retry message. Interrupted uploads can leave private orphan objects, completed by a retry of the same pending selection. There is no claim of automatic orphan cleanup.

## Validation

- 23 existing integration and persistence scenarios passed.
- 13 existing owner dashboard scenarios passed.
- 19 photo-library scenarios passed using an in-memory Supabase/Storage contract mock (not live service verification).
- Browser checked real markup/navigation/login-required state, plus a 390px iframe viewport with no visible horizontal overflow.
- Cloud activation and first real photo upload remain pending.
