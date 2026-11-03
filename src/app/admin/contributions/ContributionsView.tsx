'use client';

import { useEffect } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { useMusicNerdUser } from '@/hooks/useMusicNerdUser';
import { useAdminQuery } from '@/hooks/useAdminQuery';
import { flattenFilters } from '@/lib/admin/flattenFilters';
import type { ContributionsPage, PagedResponse } from '@/lib/admin/adminReadTypes';
import ContributionWorkspace from './ContributionWorkspace';

/** The admin contributions page, read from MusicNerdAPI with the signed-in admin's token. Everyone else goes home. */
export default function ContributionsView({path}:{path:string}) {
 const router = useRouter();
 const { user, status } = useMusicNerdUser();
 const isAdmin = !!user?.isAdmin;
 useEffect(() => { if(status !== 'loading' && !isAdmin) router.replace('/'); }, [status, isAdmin, router]);
 const read = useAdminQuery<PagedResponse<ContributionsPage, 'userId'|'query'|'origin'|'type'|'status'>>(path, isAdmin);
 const frame = (message: React.ReactNode) => <section className="mx-auto w-full max-w-6xl px-5 py-16 text-sm text-muted-foreground sm:px-10">{message}</section>;
 if(read.isError && !read.data) {
  if((read.error as { status?: number }).status === 404) notFound();
  return frame(<p role="alert">Could not load contributions. Reload to try again.</p>);
 }
 if(!isAdmin || !read.data) return frame(<p role="status">Loading contributions…</p>);
 const data = flattenFilters(read.data);
 return <ContributionWorkspace data={data} accountName={data.account ? data.account.username || data.account.email || data.account.id : undefined}/>;
}
