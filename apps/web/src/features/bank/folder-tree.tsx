'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';

export interface FolderRow {
  readonly id: string;
  readonly parent_id: string | null;
  readonly name: string;
}

interface FolderNode extends FolderRow {
  readonly children: FolderNode[];
}

function buildTree(folders: readonly FolderRow[]): FolderNode[] {
  const nodes = new Map<string, FolderNode>(folders.map((f) => [f.id, { ...f, children: [] }]));
  const roots: FolderNode[] = [];
  for (const node of nodes.values()) {
    if (node.parent_id && nodes.has(node.parent_id)) {
      nodes.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export interface FolderTreeProps {
  readonly folders: readonly FolderRow[];
  readonly selectedFolderId: string | null;
  readonly onSelect: (folderId: string | null) => void;
  readonly onCreate: (name: string, parentId: string | null) => void;
  readonly onRename: (folderId: string, name: string) => void;
}

export function FolderTree({
  folders,
  selectedFolderId,
  onSelect,
  onCreate,
  onRename,
}: FolderTreeProps) {
  const t = useTranslations('bank.folders');
  const tree = useMemo(() => buildTree(folders), [folders]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  function submitCreate() {
    const name = newName.trim();
    if (name) onCreate(name, null);
    setNewName('');
    setCreating(false);
  }

  function submitRename(folderId: string) {
    const name = renameValue.trim();
    if (name) onRename(folderId, name);
    setRenamingId(null);
  }

  function renderNode(node: FolderNode, depth: number) {
    const isSelected = selectedFolderId === node.id;
    return (
      <li key={node.id}>
        {renamingId === node.id ? (
          <Input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => submitRename(node.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitRename(node.id);
              if (e.key === 'Escape') setRenamingId(null);
            }}
            className="h-8"
            style={{ marginInlineStart: depth * 16 }}
          />
        ) : (
          <div
            className="group flex items-center gap-2 rounded-control px-2 py-1.5"
            style={{ marginInlineStart: depth * 16 }}
          >
            <button
              type="button"
              onClick={() => onSelect(node.id)}
              className={cn(
                'flex flex-1 items-center gap-2 truncate text-left text-sm',
                isSelected ? 'font-medium text-accent' : 'text-ink-2 hover:text-ink',
              )}
            >
              <Icon name="folder" size={16} />
              <span className="truncate">{node.name}</span>
            </button>
            <button
              type="button"
              aria-label={t('renameLabel')}
              className="inline-flex h-7 w-7 items-center justify-center rounded-control text-ink-3 opacity-0 group-hover:opacity-100 hover:bg-canvas hover:text-ink"
              onClick={() => {
                setRenamingId(node.id);
                setRenameValue(node.name);
              }}
            >
              <Icon name="pencil-simple" size={14} />
            </button>
          </div>
        )}
        {node.children.length > 0 && (
          <ul>{node.children.map((child) => renderNode(child, depth + 1))}</ul>
        )}
      </li>
    );
  }

  return (
    <nav className="flex h-full w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r border-line p-3">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={cn(
          'flex items-center gap-2 rounded-control px-2 py-1.5 text-left text-sm',
          selectedFolderId === null ? 'font-medium text-accent' : 'text-ink-2 hover:text-ink',
        )}
      >
        <Icon name="folder" size={16} />
        {t('inbox')}
      </button>
      <ul>{tree.map((node) => renderNode(node, 0))}</ul>
      {creating ? (
        <Input
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onBlur={submitCreate}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitCreate();
            if (e.key === 'Escape') setCreating(false);
          }}
          placeholder={t('newFolderPlaceholder')}
          className="h-8"
        />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mt-1 flex items-center gap-2 rounded-control px-2 py-1.5 text-left text-sm text-ink-3 hover:text-ink"
        >
          <Icon name="plus" size={16} />
          {t('newFolder')}
        </button>
      )}
    </nav>
  );
}
