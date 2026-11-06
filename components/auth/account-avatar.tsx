'use client';
import { useTripLanguage } from '@/components/trip/trip-language';
import { useEffect, useState } from 'react';
import type { PublicUser } from '@/lib/auth/core';

export function AccountAvatar() {
  const { t } = useTripLanguage();
  const [user, setUser] = useState<PublicUser | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/session', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (!controller.signal.aborted) setUser(data.session?.user || null);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  if (!user) return null;
  const initial =
    Array.from(user.email.trim().split('@')[0] || user.name.trim())[0]?.toUpperCase() || '?';
  return (
    <span
      className="account-avatar"
      role="img"
      title={`${t('signedInAs')}${user.name}`}
      aria-label={`${t('signedInAs')}${user.name}`}
    >
      {initial}
    </span>
  );
}
