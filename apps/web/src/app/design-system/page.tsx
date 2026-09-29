import { notFound } from 'next/navigation';

import { DesignSystemClient } from './design-system-client';

import { Logo, LogoMark } from '@/components/patterns';

export default function DesignSystemPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  return <DesignSystemClient logo={<Logo />} logoMark={<LogoMark />} />;
}
