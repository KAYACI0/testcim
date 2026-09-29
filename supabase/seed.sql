-- Local seed data. Applied by `pnpm db:reset` after every migration. Never
-- runs against a real project (`db push` ignores seed files), so this is
-- safe even though it's system-table data.
--
-- Placeholder curriculum only: real MEB data arrives via the official-source
-- import script in slice 08 (docs/prompts/08-soru-bankasi-ve-mufredat.md).
-- These rows are deliberately generic ("yer tutucu") rather than resembling
-- real curriculum codes, per CLAUDE.md's "don't add fabricated curriculum
-- data" — they exist only to exercise the schema locally.

insert into public.curriculum_subjects (id, code, name, grade_from, grade_to)
values ('00000000-0000-0000-0000-000000000001', 'PLACEHOLDER-SUBJ', 'Yer Tutucu Ders', 9, 12)
on conflict (id) do nothing;

insert into public.curriculum_topics (id, subject_id, parent_id, name)
values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  null,
  'Yer Tutucu Konu'
)
on conflict (id) do nothing;

insert into public.curriculum_outcomes (id, subject_id, topic_id, grade, code, description)
values (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  9,
  'PLACEHOLDER-OUT-1',
  'Yer tutucu kazanım açıklaması (şema testleri için).'
)
on conflict (id) do nothing;
