#!/usr/bin/env tsx
// Imports the hand-curated curriculum data files under scripts/curriculum/data/
// into curriculum_subjects/curriculum_topics/curriculum_outcomes. Idempotent
// (upsert on the unique `code` columns) so re-running after fixing a typo in
// a data file is safe.
//
// Requires service-role access (RLS on these tables allows select to
// anon/authenticated only; writes are meant to come only from a migration or
// this script, per docs/02 §6 and docs/prompts/08).
//
// Usage: pnpm --filter @testcim/scripts exec tsx curriculum/import.ts

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { validateCurriculumFile } from './validate';

import type { CurriculumDatabase } from './db-types';
import type { CurriculumSourceFile } from './types';

const DATA_DIR = join(import.meta.dirname, 'data');

async function loadDataFiles(): Promise<CurriculumSourceFile[]> {
  const names = (await readdir(DATA_DIR)).filter((n) => n.endsWith('.json'));
  const files: CurriculumSourceFile[] = [];
  for (const name of names) {
    const raw = await readFile(join(DATA_DIR, name), 'utf8');
    files.push(JSON.parse(raw) as CurriculumSourceFile);
  }
  return files;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
    process.exit(1);
  }

  const files = await loadDataFiles();
  if (files.length === 0) {
    console.error(`No curriculum data files found in ${DATA_DIR}.`);
    process.exit(1);
  }

  let hasIssues = false;
  for (const file of files) {
    const issues = validateCurriculumFile(file);
    if (issues.length > 0) {
      hasIssues = true;
      console.error(`Validation failed for subject ${file.subject.code}:`);
      for (const issue of issues) console.error(`  ${issue.code}: ${issue.message}`);
    }
  }
  if (hasIssues) {
    process.exit(1);
  }

  const supabase = createClient<CurriculumDatabase>(url, serviceKey, {
    auth: { persistSession: false },
  });

  for (const file of files) {
    console.warn(`Importing ${file.subject.name} (${file.subject.code})...`);

    const { data: subjectRow, error: subjectError } = await supabase
      .from('curriculum_subjects')
      .upsert(
        {
          code: file.subject.code,
          name: file.subject.name,
          grade_from: file.subject.grade_from,
          grade_to: file.subject.grade_to,
        },
        { onConflict: 'code' },
      )
      .select('id, code')
      .single();

    if (subjectError || !subjectRow) {
      throw new Error(`Failed to upsert subject ${file.subject.code}: ${subjectError?.message}`);
    }

    // curriculum_topics has no unique(code) column in the database (the
    // `code` in our JSON is only for cross-referencing outcomes within this
    // script) — find-or-insert by (subject_id, name) so re-imports update
    // in place instead of duplicating rows.
    const topicIdByCode = new Map<string, string>();
    for (const topic of file.topics) {
      const { data: existing } = await supabase
        .from('curriculum_topics')
        .select('id')
        .eq('subject_id', subjectRow.id)
        .eq('name', topic.name)
        .maybeSingle();
      const existingId = existing?.id;

      if (existingId) {
        topicIdByCode.set(topic.code, existingId);
        continue;
      }

      const { data: inserted, error: topicError } = await supabase
        .from('curriculum_topics')
        .insert({
          subject_id: subjectRow.id,
          name: topic.name,
          parent_id: topic.parent_code ? (topicIdByCode.get(topic.parent_code) ?? null) : null,
        })
        .select('id')
        .single();

      const insertedId = inserted?.id;
      if (topicError || !insertedId) {
        throw new Error(`Failed to insert topic ${topic.code}: ${topicError?.message}`);
      }
      topicIdByCode.set(topic.code, insertedId);
    }

    for (const outcome of file.outcomes) {
      const topicId = topicIdByCode.get(outcome.topic_code);
      const { error: outcomeError } = await supabase.from('curriculum_outcomes').upsert(
        {
          subject_id: subjectRow.id,
          topic_id: topicId ?? null,
          grade: outcome.grade,
          code: outcome.code,
          description: outcome.description,
        },
        { onConflict: 'code' },
      );
      if (outcomeError) {
        throw new Error(`Failed to upsert outcome ${outcome.code}: ${outcomeError.message}`);
      }
    }

    console.warn(
      `  ${file.topics.length} topics, ${file.outcomes.length} outcomes (source: ${file.source.url})`,
    );
  }

  console.warn('Curriculum import complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
