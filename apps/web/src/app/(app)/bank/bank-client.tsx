'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState, useTransition } from 'react';

import type { BankFilter } from '@testcim/shared';

import type { BankQuestionRow, TagRow } from '@/features/bank/actions.server';
import type { FolderRow } from '@/features/bank/folder-tree';
import type {
  CurriculumOutcomeRow,
  CurriculumSubjectRow,
  CurriculumTopicRow,
} from '@/features/bank/types';

import { DataTable, type DataTableColumn } from '@/components/patterns/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import {
  addQuestionsToTest,
  bulkTagQuestions,
  createFolder,
  createTag,
  listBankQuestions,
  listExistingInTest,
  moveQuestionsToFolder,
  renameFolder,
} from '@/features/bank/actions.server';
import { FilterBar } from '@/features/bank/filter-bar';
import { FolderTree } from '@/features/bank/folder-tree';
import { InspectorContent } from '@/features/bank/inspector-content';
import { QuestionGrid } from '@/features/bank/question-grid';

export interface TestRow {
  readonly id: string;
  readonly title: string;
}

export interface BankClientProps {
  readonly folders: readonly FolderRow[];
  readonly tags: readonly TagRow[];
  readonly subjects: readonly CurriculumSubjectRow[];
  readonly topics: readonly CurriculumTopicRow[];
  readonly outcomes: readonly CurriculumOutcomeRow[];
  readonly tests: readonly TestRow[];
}

export function BankClient({ folders, tags, subjects, topics, outcomes, tests }: BankClientProps) {
  const t = useTranslations('bank');
  const [folderList, setFolderList] = useState(folders);
  const [tagList, setTagList] = useState(tags);
  const [filter, setFilter] = useState<BankFilter>({});
  const [selectedFolderId, setSelectedFolderId] = useState<string | null | undefined>(undefined);
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [questions, setQuestions] = useState<readonly BankQuestionRow[]>([]);
  const [quotaWarning, setQuotaWarning] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [newTagName, setNewTagName] = useState('');
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string | null>(null);
  const [addToTestId, setAddToTestId] = useState<string | null>(tests[0]?.id ?? null);
  const [existingInTestIds, setExistingInTestIds] = useState<ReadonlySet<string>>(new Set());
  const [addToTestMessage, setAddToTestMessage] = useState<string | null>(null);

  const effectiveFilter = useMemo<BankFilter>(
    () => ({ ...filter, folderId: selectedFolderId }),
    [filter, selectedFolderId],
  );

  useEffect(() => {
    startTransition(async () => {
      const result = await listBankQuestions(effectiveFilter, null);
      if (result.ok) {
        setQuestions(result.questions);
        setQuotaWarning(result.quotaWarning);
      }
      setSelectedIds(new Set());
    });
  }, [effectiveFilter]);

  useEffect(() => {
    startTransition(async () => {
      if (!addToTestId || questions.length === 0) {
        setExistingInTestIds(new Set());
        return;
      }
      const result = await listExistingInTest({
        testId: addToTestId,
        questionIds: questions.map((q) => q.id),
      });
      setExistingInTestIds(result.ok ? new Set(result.existingQuestionIds) : new Set());
    });
  }, [addToTestId, questions]);

  async function handleAddToTest() {
    if (!addToTestId || selectedIds.size === 0) return;
    const result = await addQuestionsToTest({ testId: addToTestId, questionIds: [...selectedIds] });
    setAddToTestMessage(
      result.ok ? t('list.addedToTest', { count: result.addedCount }) : t('list.addToTestFailed'),
    );
    if (result.ok) {
      const refreshed = await listExistingInTest({
        testId: addToTestId,
        questionIds: questions.map((q) => q.id),
      });
      setExistingInTestIds(refreshed.ok ? new Set(refreshed.existingQuestionIds) : new Set());
    }
  }

  async function handleCreateFolder(name: string, parentId: string | null) {
    const result = await createFolder({ name, parentId });
    if (result.ok) {
      setFolderList((current) => [...current, { id: result.folderId, name, parent_id: parentId }]);
    }
  }

  async function handleRenameFolder(folderId: string, name: string) {
    const result = await renameFolder({ folderId, name });
    if (result.ok) {
      setFolderList((current) => current.map((f) => (f.id === folderId ? { ...f, name } : f)));
    }
  }

  async function handleCreateTag() {
    const name = newTagName.trim();
    if (!name) return;
    const result = await createTag({ name });
    if (result.ok) {
      setTagList((current) => [...current, result.tag]);
      await bulkTagQuestions({ questionIds: [...selectedIds], tagIds: [result.tag.id] });
    }
    setNewTagName('');
  }

  async function handleBulkTag(tagId: string) {
    if (selectedIds.size === 0) return;
    await bulkTagQuestions({ questionIds: [...selectedIds], tagIds: [tagId] });
  }

  async function handleMoveSelected() {
    if (selectedIds.size === 0) return;
    await moveQuestionsToFolder({ questionIds: [...selectedIds], folderId: moveTargetFolderId });
    setQuestions((current) => current.filter((q) => !selectedIds.has(q.id)));
    setSelectedIds(new Set());
  }

  const columns: DataTableColumn<BankQuestionRow>[] = [
    {
      key: 'stem',
      header: t('list.columns.question'),
      render: (row) => (
        <button
          type="button"
          onClick={() => setActiveId(row.id)}
          className="flex items-center gap-2 text-left"
        >
          <span className="line-clamp-2 text-sm text-ink">
            {row.stem_text || t('list.noPreview')}
          </span>
          {existingInTestIds.has(row.id) && <Badge>{t('list.alreadyInTest')}</Badge>}
        </button>
      ),
    },
    {
      key: 'type',
      header: t('list.columns.type'),
      sortable: true,
      sortValue: (row) => row.question_type,
      render: (row) => t(`filters.types.${row.question_type}`),
    },
    {
      key: 'difficulty',
      header: t('list.columns.difficulty'),
      sortable: true,
      sortValue: (row) => row.difficulty ?? 0,
      render: (row) => row.difficulty ?? '—',
    },
    {
      key: 'ai',
      header: t('list.columns.aiStatus'),
      render: (row) =>
        row.ai_review_status ? (
          <Badge tone={row.ai_review_status === 'approved' ? 'ok' : 'warn'}>
            {t(`filters.aiStatus${row.ai_review_status === 'approved' ? 'Approved' : 'Draft'}`)}
          </Badge>
        ) : (
          '—'
        ),
    },
    {
      key: 'created',
      header: t('list.columns.createdAt'),
      sortable: true,
      sortValue: (row) => row.created_at,
      render: (row) => new Date(row.created_at).toLocaleDateString('tr-TR'),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1">
      <FolderTree
        folders={folderList}
        selectedFolderId={selectedFolderId ?? null}
        onSelect={(id) => setSelectedFolderId(id)}
        onCreate={(name, parentId) => void handleCreateFolder(name, parentId)}
        onRename={(folderId, name) => void handleRenameFolder(folderId, name)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <FilterBar
          filter={filter}
          onChange={setFilter}
          subjects={subjects}
          topics={topics}
          outcomes={outcomes}
          tags={tagList}
        />

        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <span className="text-sm text-ink-2">
                  {t('list.selectedCount', { count: selectedIds.size })}
                </span>
                <Combobox
                  options={tagList.map((tagRow) => ({ value: tagRow.id, label: tagRow.name }))}
                  value={null}
                  onValueChange={(value) => void handleBulkTag(value)}
                  placeholder={t('list.bulkTagPlaceholder')}
                  searchPlaceholder={t('filters.searchPlaceholder')}
                  emptyMessage={t('filters.emptyOptions')}
                  className="w-40"
                />
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="sm">
                      {t('list.moveTo')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent title={t('list.moveTo')} closeLabel={t('list.closeDialog')}>
                    <div className="flex flex-col gap-3">
                      <Combobox
                        options={[
                          { value: '__inbox__', label: t('folders.inbox') },
                          ...folderList.map((f) => ({ value: f.id, label: f.name })),
                        ]}
                        value={moveTargetFolderId ?? '__inbox__'}
                        onValueChange={(value) =>
                          setMoveTargetFolderId(value === '__inbox__' ? null : value)
                        }
                        placeholder={t('folders.inbox')}
                        searchPlaceholder={t('filters.searchPlaceholder')}
                        emptyMessage={t('filters.emptyOptions')}
                      />
                      <Button onClick={() => void handleMoveSelected()}>{t('list.moveTo')}</Button>
                    </div>
                  </DialogContent>
                </Dialog>
                {tests.length > 0 && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">{t('list.addToTest')}</Button>
                    </DialogTrigger>
                    <DialogContent title={t('list.addToTest')} closeLabel={t('list.closeDialog')}>
                      <div className="flex flex-col gap-3">
                        <Combobox
                          options={tests.map((testRow) => ({
                            value: testRow.id,
                            label: testRow.title,
                          }))}
                          value={addToTestId}
                          onValueChange={setAddToTestId}
                          placeholder={t('list.addToTest')}
                          searchPlaceholder={t('filters.searchPlaceholder')}
                          emptyMessage={t('filters.emptyOptions')}
                        />
                        <Button onClick={() => void handleAddToTest()}>
                          {t('list.addToTest')}
                        </Button>
                        {addToTestMessage && (
                          <p className="text-sm text-ink-2">{addToTestMessage}</p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {quotaWarning && (
              <span className="flex items-center gap-1 text-xs text-warn">
                <Icon name="warning-circle" size={14} />
                {t('quotaWarning')}
              </span>
            )}
            <Segmented
              aria-label={t('list.viewToggleLabel')}
              options={[
                { value: 'list', label: t('list.viewList') },
                { value: 'grid', label: t('list.viewGrid') },
              ]}
              value={view}
              onValueChange={(value) => setView(value as 'list' | 'grid')}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isPending ? (
            <p className="p-4 text-sm text-ink-3">{t('list.loading')}</p>
          ) : view === 'list' ? (
            <div className="p-4">
              <DataTable
                columns={columns}
                rows={questions}
                getRowId={(row) => row.id}
                emptyMessage={t('list.empty')}
                selectable
                selectedIds={selectedIds}
                onSelectedIdsChange={setSelectedIds}
                selectAllLabel={t('list.selectAll')}
                selectRowLabel={() => t('list.selectRow')}
              />
            </div>
          ) : (
            <QuestionGrid
              questions={questions}
              selectedIds={selectedIds}
              onSelectedIdsChange={setSelectedIds}
              activeId={activeId}
              onActivate={setActiveId}
              existingInTestIds={existingInTestIds}
            />
          )}
        </div>

        <div className="border-t border-line px-4 py-2">
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreateTag();
            }}
            placeholder={t('list.newTagPlaceholder')}
            className="h-8 w-48"
            disabled={selectedIds.size === 0}
          />
        </div>
      </div>

      <InspectorContent questionId={activeId} outcomes={outcomes} />
    </div>
  );
}
