'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/menu';
import {
  listNotifications,
  markNotificationRead,
  type NotificationRow,
} from '@/features/notifications/actions.server';

const POLL_INTERVAL_MS = 30_000;

function notificationLabel(notification: NotificationRow, t: (key: string) => string): string {
  return notification.kind === 'mention' ? t('mentionLabel') : t('approvalRequestLabel');
}

export function NotificationBell() {
  const t = useTranslations('notifications');
  const [notifications, setNotifications] = useState<readonly NotificationRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    function refresh() {
      void listNotifications().then((rows) => {
        if (!cancelled) setNotifications(rows);
      });
    }

    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  function handleOpen(notification: NotificationRow) {
    if (notification.read_at) return;
    void markNotificationRead(notification.id).then(() => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n,
        ),
      );
    });
  }

  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          type="button"
          aria-label={t('bellLabel')}
          className="relative flex h-9 w-9 items-center justify-center rounded-control text-ink-2 hover:bg-canvas hover:text-ink"
        >
          <Icon name="bell" size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1">
              <Badge tone="accent">{unreadCount}</Badge>
            </span>
          )}
        </button>
      </MenuTrigger>
      <MenuContent align="end" className="w-80">
        {notifications.length === 0 && (
          <div className="px-3 py-2 text-sm text-ink-2">{t('empty')}</div>
        )}
        {notifications.map((notification) => (
          <MenuItem key={notification.id} onSelect={() => handleOpen(notification)}>
            <div className="flex w-full items-center justify-between gap-2">
              <span className={notification.read_at ? 'text-ink-2' : 'font-medium text-ink'}>
                {notificationLabel(notification, t)}
              </span>
              {!notification.read_at && <Badge tone="accent">{t('newBadge')}</Badge>}
            </div>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
