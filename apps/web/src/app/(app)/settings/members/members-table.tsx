'use client';

import { useTranslations } from 'next-intl';

import type { WorkspaceRole } from '@testcim/shared';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';
import { changeMemberRole, removeMember } from '@/lib/workspace/actions';

export interface MemberRow {
  readonly userId: string;
  readonly role: WorkspaceRole;
  readonly fullName: string | null;
}

const ASSIGNABLE_ROLES: WorkspaceRole[] = ['owner', 'admin', 'editor', 'viewer'];

export function MembersTable({
  workspaceId,
  members,
  canManage,
}: {
  readonly workspaceId: string;
  readonly members: readonly MemberRow[];
  readonly canManage: boolean;
}) {
  const t = useTranslations('settings.members');

  return (
    <Table className="mt-4">
      <TableHead>
        <TableRow>
          <TableHeaderCell>{t('columns.name')}</TableHeaderCell>
          <TableHeaderCell>{t('columns.role')}</TableHeaderCell>
          {canManage && <TableHeaderCell>{t('columns.actions')}</TableHeaderCell>}
        </TableRow>
      </TableHead>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.userId}>
            <TableCell>{member.fullName ?? t('unnamed')}</TableCell>
            <TableCell>
              {canManage ? (
                <form action={changeMemberRole}>
                  <input type="hidden" name="workspaceId" value={workspaceId} />
                  <input type="hidden" name="userId" value={member.userId} />
                  <select
                    name="role"
                    defaultValue={member.role}
                    onChange={(event) => event.currentTarget.form?.requestSubmit()}
                    aria-label={t('columns.role')}
                    className="h-9 rounded-control border border-line-strong bg-surface px-2 text-sm text-ink outline-none focus-visible:border-accent"
                  >
                    {ASSIGNABLE_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {t(`roles.${role}`)}
                      </option>
                    ))}
                  </select>
                </form>
              ) : (
                t(`roles.${member.role}`)
              )}
            </TableCell>
            {canManage && (
              <TableCell>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="tertiary" size="sm">
                      {t('remove')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent title={t('removeDialogTitle')} closeLabel={t('closeLabel')}>
                    <p className="text-sm text-ink-2">{t('removeDialogDescription')}</p>
                    <DialogFooter>
                      <form action={removeMember}>
                        <input type="hidden" name="workspaceId" value={workspaceId} />
                        <input type="hidden" name="userId" value={member.userId} />
                        <Button type="submit" variant="secondary">
                          {t('remove')}
                        </Button>
                      </form>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
