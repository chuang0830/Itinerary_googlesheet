'use client';
import { useEffect, useState } from 'react';
import type { PublicUser } from '@/lib/auth/core';

export function AccountAvatar() {
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
      title={`已登入：${user.name}`}
      aria-label={`已登入：${user.name}`}
    >
      {initial}
    </span>
  );
}
