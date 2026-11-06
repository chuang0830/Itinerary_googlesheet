import Link from 'next/link';
import type { ReactNode } from 'react';
import { AccountAvatar } from '@/components/auth/account-avatar';
export function TripHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="topbar">
      <Link className="brand" href="/">
        TRAVEL <span>✳</span>　PLANNER
      </Link>
      <div className="top-actions">
        {children}
        <AccountAvatar />
      </div>
    </header>
  );
}
