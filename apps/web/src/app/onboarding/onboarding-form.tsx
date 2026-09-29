'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { saveOnboarding, skipOnboarding } from '@/lib/onboarding/actions';

export function OnboardingForm() {
  const t = useTranslations('onboarding');

  return (
    <form action={saveOnboarding} className="mt-8 flex flex-col gap-5">
      <FormField label={t('roleLabel')}>
        {(fieldProps) => (
          <Select name="role">
            <SelectTrigger id={fieldProps.id} aria-describedby={fieldProps['aria-describedby']}>
              <SelectValue placeholder={t('rolePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="teacher">{t('roles.teacher')}</SelectItem>
              <SelectItem value="institution">{t('roles.institution')}</SelectItem>
            </SelectContent>
          </Select>
        )}
      </FormField>

      <FormField label={t('subjectLabel')}>
        {(fieldProps) => (
          <Select name="subject">
            <SelectTrigger id={fieldProps.id} aria-describedby={fieldProps['aria-describedby']}>
              <SelectValue placeholder={t('subjectPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="math">{t('subjects.math')}</SelectItem>
              <SelectItem value="turkish">{t('subjects.turkish')}</SelectItem>
              <SelectItem value="science">{t('subjects.science')}</SelectItem>
              <SelectItem value="social">{t('subjects.social')}</SelectItem>
              <SelectItem value="english">{t('subjects.english')}</SelectItem>
              <SelectItem value="other">{t('subjects.other')}</SelectItem>
            </SelectContent>
          </Select>
        )}
      </FormField>

      <FormField label={t('gradeLevelLabel')}>
        {(fieldProps) => (
          <Select name="gradeLevel">
            <SelectTrigger id={fieldProps.id} aria-describedby={fieldProps['aria-describedby']}>
              <SelectValue placeholder={t('gradeLevelPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">{t('gradeLevels.primary')}</SelectItem>
              <SelectItem value="middle">{t('gradeLevels.middle')}</SelectItem>
              <SelectItem value="high">{t('gradeLevels.high')}</SelectItem>
            </SelectContent>
          </Select>
        )}
      </FormField>

      <div className="mt-2 flex items-center justify-between">
        <Button type="submit" variant="secondary" formAction={skipOnboarding}>
          {t('skip')}
        </Button>
        <Button type="submit">{t('continue')}</Button>
      </div>
    </form>
  );
}
