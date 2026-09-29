-- Raises the `assets` bucket's hard file-size cap from 25 MB to 50 MB.
-- docs/adr/0003-pdf-kirpma-studyosu.md §1 fixes the PDF upload ceiling at
-- 50 MB (20 MB+ goes through TUS resumable upload); the bucket-level limit
-- set in 20250101000006_files_and_curriculum.sql predates that decision and
-- would otherwise reject a valid 20-50 MB PDF before it ever reaches the
-- application's own page-count check.
update storage.buckets
set file_size_limit = 52428800
where id = 'assets';
