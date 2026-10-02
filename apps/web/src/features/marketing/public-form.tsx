'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { InlineNotice } from '@/components/ui/inline-notice';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type Status = 'idle' | 'sending' | 'sent' | 'error' | 'rate_limited';

/** Contact and copyright-notice form. Posts JSON to /api/public/submit. */
export function PublicForm({ kind }: { readonly kind: 'contact' | 'copyright' }) {
  const t = useTranslations(`marketing.forms.${kind}`);
  const tc = useTranslations('marketing.forms.common');
  const [status, setStatus] = useState<Status>('idle');

  async function onSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setStatus('sending');

    const rawContentUrl = data.get('contentUrl');
    const contentUrl = typeof rawContentUrl === 'string' ? rawContentUrl.trim() : '';
    try {
      const response = await fetch('/api/public/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind,
          name: typeof data.get('name') === 'string' ? data.get('name') : '',
          email: typeof data.get('email') === 'string' ? data.get('email') : '',
          subject: typeof data.get('subject') === 'string' ? data.get('subject') : '',
          body: typeof data.get('body') === 'string' ? data.get('body') : '',
          ...(contentUrl ? { contentUrl } : {}),
          website: typeof data.get('website') === 'string' ? data.get('website') : '',
        }),
      });
      setStatus(response.ok ? 'sent' : response.status === 429 ? 'rate_limited' : 'error');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return <InlineNotice tone="ok">{t('sent')}</InlineNotice>;
  }

  return (
    <form
      onSubmit={(event) => {
        void onSubmit(event);
      }}
      className="flex max-w-lg flex-col gap-4"
    >
      <FormField label={tc('name')} required>
        {(props) => <Input {...props} name="name" required maxLength={200} autoComplete="name" />}
      </FormField>
      <FormField label={tc('email')} required>
        {(props) => <Input {...props} name="email" type="email" required autoComplete="email" />}
      </FormField>
      {kind === 'contact' ? (
        <FormField label={tc('subject')}>
          {(props) => <Input {...props} name="subject" maxLength={300} />}
        </FormField>
      ) : (
        <FormField label={t('contentUrl')} hint={t('contentUrlHint')} required>
          {(props) => <Input {...props} name="contentUrl" type="url" required />}
        </FormField>
      )}
      <FormField label={t('body')} required>
        {(props) => <Textarea {...props} name="body" required rows={6} maxLength={5000} />}
      </FormField>
      {/* Honeypot: hidden from people, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <input name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {status === 'error' && <InlineNotice tone="err">{tc('error')}</InlineNotice>}
      {status === 'rate_limited' && <InlineNotice tone="warn">{tc('rateLimited')}</InlineNotice>}
      <div>
        <Button type="submit" loading={status === 'sending'}>
          {t('submit')}
        </Button>
      </div>
    </form>
  );
}
