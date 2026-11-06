import type { Metadata } from 'next';
import { PrivacyPolicy } from '@/components/privacy/privacy-policy';
export const metadata: Metadata = {
  title: 'Privacy policy | Travel Planner',
  description: 'How Travel Planner uses Google account, spreadsheet, and sign-in data.',
};
export default function PrivacyPage() {
  return <PrivacyPolicy />;
}
