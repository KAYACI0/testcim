'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type { AppShellNavItem, DataTableColumn } from '@/components/patterns';
import type { ReactNode } from 'react';

import {
  AppShell,
  CommandPalette,
  DataTable,
  InspectorPanel,
  PageHeader,
  UsageMeter,
  UpgradeNote,
} from '@/components/patterns';
import {
  Badge,
  Button,
  Checkbox,
  Combobox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  EmptyState,
  FormField,
  Icon,
  IconButton,
  InlineNotice,
  Input,
  Kbd,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  RadioGroup,
  RadioItem,
  Segmented,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Toast,
  ToastProvider,
  ToastViewport,
  Tooltip,
  TooltipProvider,
} from '@/components/ui';

interface SampleTest {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly questionCount: number;
  readonly lastEdited: string;
}

const TYPE_SCALE = [12, 13, 14, 16, 18, 22, 28, 36] as const;

export interface DesignSystemClientProps {
  readonly logo: ReactNode;
  readonly logoMark: ReactNode;
}

export function DesignSystemClient({ logo, logoMark }: DesignSystemClientProps) {
  const t = useTranslations('designSystem');
  const tNav = useTranslations('nav');
  const router = useRouter();

  const nav: AppShellNavItem[] = [
    { href: '/tests', label: tNav('tests'), icon: 'clipboard-text' },
    { href: '/bank', label: tNav('bank'), icon: 'folder' },
    { href: '/classes', label: tNav('classes'), icon: 'student' },
    { href: '/omr', label: tNav('omr'), icon: 'scan-smiley' },
    { href: '/exams', label: tNav('exams'), icon: 'exam' },
    { href: '/reports', label: tNav('reports'), icon: 'chart-bar' },
    { href: '/settings', label: tNav('settings'), icon: 'gear' },
  ];

  const [correctAnswer, setCorrectAnswer] = useState('a');
  const [captureMode, setCaptureMode] = useState(false);
  const [layout, setLayout] = useState('strict');
  const [testType, setTestType] = useState('exam');
  const [subject, setSubject] = useState<string | null>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  const sampleTests: SampleTest[] = [
    {
      id: '1',
      name: '8. sınıf matematik yazılısı',
      type: t('form.typeOptions.written'),
      questionCount: 20,
      lastEdited: '2026-09-28',
    },
    {
      id: '2',
      name: 'Türkçe deneme sınavı',
      type: t('form.typeOptions.mock'),
      questionCount: 40,
      lastEdited: '2026-09-25',
    },
    {
      id: '3',
      name: 'Fen bilimleri quiz',
      type: t('form.typeOptions.quiz'),
      questionCount: 10,
      lastEdited: '2026-09-20',
    },
  ];

  const columns: DataTableColumn<SampleTest>[] = [
    {
      key: 'name',
      header: t('table.name'),
      sortable: true,
      sortValue: (row) => row.name,
      render: (row) => row.name,
    },
    { key: 'type', header: t('table.type'), render: (row) => row.type },
    {
      key: 'questionCount',
      header: t('table.questionCount'),
      sortable: true,
      sortValue: (row) => row.questionCount,
      render: (row) => row.questionCount,
    },
    { key: 'lastEdited', header: t('table.lastEdited'), render: (row) => row.lastEdited },
  ];

  return (
    <ToastProvider>
      <AppShell
        nav={nav}
        activeHref="/tests"
        workspaceName={t('workspaceName')}
        railToggleLabel={t('railToggleLabel')}
        logo={logo}
        logoMark={logoMark}
        renderLink={(item, content) => <a href={item.href}>{content}</a>}
        topBarSlot={
          <div className="flex items-center gap-2 text-sm text-ink-2">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </div>
        }
      >
        <PageHeader
          title={t('title')}
          description={t('description')}
          action={<Button variant="primary">{t('patterns.pageHeaderAction')}</Button>}
        />

        <div className="flex flex-col lg:flex-row">
          <div className="min-w-0 flex-1 space-y-10 px-6 py-8">
            <section aria-labelledby="typography-heading" className="space-y-3">
              <h2 id="typography-heading" className="text-xl font-semibold text-ink">
                {t('sections.typography')}
              </h2>
              <div className="space-y-2">
                {TYPE_SCALE.map((size) => (
                  <p key={size} style={{ fontSize: size }} className="text-ink">
                    {t('typography.sample')}
                  </p>
                ))}
              </div>
            </section>

            <section aria-labelledby="buttons-heading" className="space-y-3">
              <h2 id="buttons-heading" className="text-xl font-semibold text-ink">
                {t('sections.buttons')}
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">{t('buttons.primary')}</Button>
                <Button variant="secondary">{t('buttons.secondary')}</Button>
                <Button variant="tertiary">{t('buttons.tertiary')}</Button>
                <Button variant="primary" loading>
                  {t('buttons.loading')}
                </Button>
                <Button variant="primary" disabled>
                  {t('buttons.disabled')}
                </Button>
                <TooltipProvider>
                  <Tooltip content={t('overlays.tooltipContent')}>
                    <IconButton label={t('iconButton.addLabel')}>
                      <Icon name="plus" size={18} />
                    </IconButton>
                  </Tooltip>
                </TooltipProvider>
                <IconButton label={t('iconButton.deleteLabel')}>
                  <Icon name="trash" size={18} />
                </IconButton>
                <IconButton label={t('iconButton.settingsLabel')} active>
                  <Icon name="gear" size={18} />
                </IconButton>
              </div>
            </section>

            <section aria-labelledby="form-heading" className="max-w-md space-y-5">
              <h2 id="form-heading" className="text-xl font-semibold text-ink">
                {t('sections.formControls')}
              </h2>

              <FormField label={t('form.titleLabel')} hint={t('form.titleHint')}>
                {(fieldProps) => <Input {...fieldProps} placeholder={t('form.titlePlaceholder')} />}
              </FormField>

              <FormField label={t('form.titleErrorLabel')} error={t('form.titleError')}>
                {(fieldProps) => <Input {...fieldProps} invalid defaultValue="Ab" />}
              </FormField>

              <FormField label={t('form.descriptionLabel')}>
                {(fieldProps) => (
                  <Textarea {...fieldProps} placeholder={t('form.descriptionPlaceholder')} />
                )}
              </FormField>

              <FormField label={t('form.typeLabel')}>
                {(fieldProps) => (
                  <Select value={testType} onValueChange={setTestType}>
                    <SelectTrigger id={fieldProps.id}>
                      <SelectValue>{t(`form.typeOptions.${testType}`)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exam">{t('form.typeOptions.exam')}</SelectItem>
                      <SelectItem value="testPaper">{t('form.typeOptions.testPaper')}</SelectItem>
                      <SelectItem value="mock">{t('form.typeOptions.mock')}</SelectItem>
                      <SelectItem value="written">{t('form.typeOptions.written')}</SelectItem>
                      <SelectItem value="worksheet">{t('form.typeOptions.worksheet')}</SelectItem>
                      <SelectItem value="quiz">{t('form.typeOptions.quiz')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </FormField>

              <FormField label={t('form.subjectLabel')}>
                {() => (
                  <Combobox
                    options={[
                      { value: 'math', label: t('form.subjects.math') },
                      { value: 'turkish', label: t('form.subjects.turkish') },
                      { value: 'science', label: t('form.subjects.science') },
                      { value: 'social', label: t('form.subjects.social') },
                      { value: 'english', label: t('form.subjects.english') },
                    ]}
                    value={subject}
                    onValueChange={setSubject}
                    placeholder={t('form.subjectPlaceholder')}
                    searchPlaceholder={t('form.subjectSearchPlaceholder')}
                    emptyMessage={t('form.subjectEmpty')}
                  />
                )}
              </FormField>

              <div className="space-y-2">
                <span className="text-sm font-medium text-ink">{t('form.correctAnswerLabel')}</span>
                <RadioGroup
                  value={correctAnswer}
                  onValueChange={setCorrectAnswer}
                  className="flex gap-3"
                  aria-label={t('form.correctAnswerLabel')}
                >
                  {['a', 'b', 'c', 'd', 'e'].map((option) => (
                    <label key={option} className="flex items-center gap-1.5 text-sm text-ink">
                      <RadioItem value={option} />
                      {option.toUpperCase()}
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  id="capture-checkbox"
                  checked={captureMode}
                  onCheckedChange={(state) => setCaptureMode(state === true)}
                />
                <label htmlFor="capture-checkbox" className="text-sm text-ink">
                  {t('form.captureModeLabel')}
                </label>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={captureMode}
                  onCheckedChange={setCaptureMode}
                  aria-label={t('form.captureModeLabel')}
                />
                <span className="text-sm text-ink">{t('form.captureModeLabel')}</span>
              </div>

              <Segmented
                aria-label={t('form.layoutLabel')}
                value={layout}
                onValueChange={setLayout}
                options={[
                  { value: 'strict', label: t('form.layoutOptions.strict') },
                  { value: 'flexible', label: t('form.layoutOptions.flexible') },
                  { value: 'fitPages', label: t('form.layoutOptions.fitPages') },
                ]}
              />
            </section>

            <section aria-labelledby="feedback-heading" className="max-w-md space-y-4">
              <h2 id="feedback-heading" className="text-xl font-semibold text-ink">
                {t('sections.feedback')}
              </h2>
              <div className="flex flex-wrap gap-2">
                <Badge tone="neutral">{t('feedback.badgeNeutral')}</Badge>
                <Badge tone="ok">{t('feedback.badgeOk')}</Badge>
                <Badge tone="err">{t('feedback.badgeErr')}</Badge>
                <Badge tone="warn">{t('feedback.badgeWarn')}</Badge>
                <Badge tone="accent">{t('feedback.badgeAccent')}</Badge>
              </div>
              <InlineNotice tone="neutral">{t('feedback.noticeNeutral')}</InlineNotice>
              <InlineNotice tone="ok">{t('feedback.noticeOk')}</InlineNotice>
              <InlineNotice tone="err">{t('feedback.noticeErr')}</InlineNotice>
              <InlineNotice tone="warn">{t('feedback.noticeWarn')}</InlineNotice>
              <Progress value={184} max={200} label={t('feedback.progressLabel')} />
              <EmptyState
                message={t('feedback.emptyMessage')}
                action={<Button variant="secondary">{t('patterns.pageHeaderAction')}</Button>}
              />
            </section>

            <section aria-labelledby="overlays-heading" className="space-y-3">
              <h2 id="overlays-heading" className="text-xl font-semibold text-ink">
                {t('sections.overlays')}
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="secondary">{t('overlays.popoverTrigger')}</Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <p className="text-sm font-medium text-ink">{t('overlays.popoverTitle')}</p>
                  </PopoverContent>
                </Popover>

                <Menu>
                  <MenuTrigger asChild>
                    <Button variant="secondary">{t('overlays.menuTrigger')}</Button>
                  </MenuTrigger>
                  <MenuContent>
                    <MenuItem>{t('overlays.menuEdit')}</MenuItem>
                    <MenuItem>{t('overlays.menuDuplicate')}</MenuItem>
                    <MenuItem>{t('overlays.menuDelete')}</MenuItem>
                  </MenuContent>
                </Menu>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary">{t('overlays.dialogTrigger')}</Button>
                  </DialogTrigger>
                  <DialogContent
                    title={t('overlays.dialogTitle')}
                    description={t('overlays.dialogDescription')}
                    closeLabel={t('closeLabel')}
                  >
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="tertiary">{t('overlays.dialogCancel')}</Button>
                      </DialogClose>
                      <Button variant="primary">{t('overlays.dialogConfirm')}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="secondary">{t('overlays.sheetTrigger')}</Button>
                  </SheetTrigger>
                  <SheetContent title={t('overlays.sheetTitle')} closeLabel={t('closeLabel')}>
                    <p className="text-sm text-ink-2">{t('overlays.sheetBody')}</p>
                    <DialogFooter>
                      <SheetClose asChild>
                        <Button variant="primary">{t('closeLabel')}</Button>
                      </SheetClose>
                    </DialogFooter>
                  </SheetContent>
                </Sheet>

                <Button variant="secondary" onClick={() => setToastOpen(true)}>
                  {t('overlays.toastTrigger')}
                </Button>
                <Toast
                  open={toastOpen}
                  onOpenChange={setToastOpen}
                  title={t('overlays.toastTitle')}
                  description={t('overlays.toastDescription')}
                  tone="ok"
                />
                <ToastViewport />
              </div>
            </section>

            <section aria-labelledby="tabs-heading" className="max-w-md space-y-3">
              <h2 id="tabs-heading" className="text-xl font-semibold text-ink">
                {t('sections.tabs')}
              </h2>
              <Tabs defaultValue="page">
                <TabsList>
                  <TabsTrigger value="page">{t('tabs.page')}</TabsTrigger>
                  <TabsTrigger value="booklets" disabled>
                    {t('tabs.booklets')}
                  </TabsTrigger>
                  <TabsTrigger value="answers">{t('tabs.answers')}</TabsTrigger>
                  <TabsTrigger value="output" disabled>
                    {t('tabs.output')}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="page">
                  <p className="text-sm text-ink-2">{t('tabs.pageContent')}</p>
                </TabsContent>
                <TabsContent value="answers">
                  <p className="text-sm text-ink-2">{t('tabs.answersContent')}</p>
                </TabsContent>
              </Tabs>
            </section>

            <section aria-labelledby="table-heading" className="space-y-3">
              <h2 id="table-heading" className="text-xl font-semibold text-ink">
                {t('sections.table')}
              </h2>
              <DataTable
                columns={columns}
                rows={sampleTests}
                getRowId={(row) => row.id}
                emptyMessage={t('table.empty')}
                selectable
                selectedIds={selectedIds}
                onSelectedIdsChange={setSelectedIds}
                selectAllLabel={t('table.selectAll')}
                selectRowLabel={(row) => t('table.selectRow', { name: row.name })}
              />
            </section>

            <section aria-labelledby="patterns-heading" className="max-w-md space-y-4">
              <h2 id="patterns-heading" className="text-xl font-semibold text-ink">
                {t('sections.patterns')}
              </h2>
              <UsageMeter
                label={t('patterns.usageLabel')}
                value={184}
                max={200}
                summary={t('patterns.usageSummary')}
              />
              <UpgradeNote
                message={t('patterns.upgradeMessage')}
                action={<Button variant="tertiary">{t('patterns.upgradeAction')}</Button>}
              />
            </section>

            <section
              aria-labelledby="critique-heading"
              className="max-w-2xl space-y-2 border-t border-line pt-8"
            >
              <h2 id="critique-heading" className="text-xl font-semibold text-ink">
                {t('critique.title')}
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
                {(t.raw('critique.items') as string[]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </div>

          <InspectorPanel
            title={t('patterns.inspectorTitle')}
            defaultValue="page"
            sections={[
              {
                value: 'page',
                label: t('tabs.page'),
                content: <p className="py-3 text-sm text-ink-2">{t('tabs.pageContent')}</p>,
              },
              { value: 'booklets', label: t('tabs.booklets'), disabled: true, content: null },
              {
                value: 'answers',
                label: t('tabs.answers'),
                content: <p className="py-3 text-sm text-ink-2">{t('tabs.answersContent')}</p>,
              },
              { value: 'output', label: t('tabs.output'), disabled: true, content: null },
            ]}
          />
        </div>
      </AppShell>

      <CommandPalette
        items={nav}
        label={t('patterns.commandPaletteLabel')}
        placeholder={t('patterns.commandPalettePlaceholder')}
        emptyMessage={t('patterns.commandPaletteEmpty')}
        navigate={(href) => router.push(href)}
      />
    </ToastProvider>
  );
}
