'use client';

import { useMemo, useState } from 'react';

import { Checkbox } from '../ui/checkbox';
import { EmptyState } from '../ui/empty-state';
import { Icon } from '../ui/icon';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../ui/table';

import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface DataTableColumn<Row> {
  readonly key: string;
  readonly header: string;
  readonly sortable?: boolean;
  readonly render: (row: Row) => ReactNode;
  readonly sortValue?: (row: Row) => string | number;
}

export interface DataTableProps<Row> {
  readonly columns: readonly DataTableColumn<Row>[];
  readonly rows: readonly Row[];
  readonly getRowId: (row: Row) => string;
  readonly emptyMessage: string;
  readonly selectable?: boolean;
  readonly selectedIds?: ReadonlySet<string>;
  readonly onSelectedIdsChange?: (ids: ReadonlySet<string>) => void;
  readonly selectAllLabel?: string;
  readonly selectRowLabel?: (row: Row) => string;
}

export function DataTable<Row>({
  columns,
  rows,
  getRowId,
  emptyMessage,
  selectable = false,
  selectedIds,
  onSelectedIdsChange,
  selectAllLabel,
  selectRowLabel,
}: DataTableProps<Row>) {
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((candidate) => candidate.key === sort.key);
    if (!column?.sortValue) return rows;

    return [...rows].sort((a, b) => {
      const aValue = column.sortValue!(a);
      const bValue = column.sortValue!(b);
      const compared = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sort.direction === 'asc' ? compared : -compared;
    });
  }, [rows, sort, columns]);

  if (rows.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  const allSelected = Boolean(
    selectable && selectedIds && rows.every((row) => selectedIds.has(getRowId(row))),
  );

  function toggleSort(key: string) {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: 'asc' };
      if (current.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  }

  function toggleAll() {
    if (!onSelectedIdsChange) return;
    onSelectedIdsChange(allSelected ? new Set() : new Set(rows.map(getRowId)));
  }

  function toggleRow(id: string) {
    if (!onSelectedIdsChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedIdsChange(next);
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          {selectable && (
            <TableHeaderCell className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                aria-label={selectAllLabel}
              />
            </TableHeaderCell>
          )}
          {columns.map((column) => (
            <TableHeaderCell key={column.key}>
              {column.sortable ? (
                <button
                  type="button"
                  onClick={() => toggleSort(column.key)}
                  className="flex items-center gap-1 hover:text-ink"
                >
                  {column.header}
                  <Icon
                    name={
                      sort?.key === column.key && sort.direction === 'desc'
                        ? 'caret-down'
                        : 'caret-up'
                    }
                    size={12}
                    className={cn(sort?.key !== column.key && 'text-ink-3')}
                  />
                </button>
              ) : (
                column.header
              )}
            </TableHeaderCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {sortedRows.map((row) => {
          const id = getRowId(row);
          return (
            <TableRow key={id}>
              {selectable && (
                <TableCell>
                  <Checkbox
                    checked={selectedIds?.has(id) ?? false}
                    onCheckedChange={() => toggleRow(id)}
                    aria-label={selectRowLabel?.(row)}
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell key={column.key}>{column.render(row)}</TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
