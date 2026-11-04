import Link from 'next/link';
import { AccountAvatar } from '@/components/auth/account-avatar';
export function TripHeader() {
  return (
    <header className="topbar">
      <Link className="brand" href="/">
        TRAVEL <span>✳</span>　PLANNER
      </Link>
      <AccountAvatar />
    </header>
  );
}
