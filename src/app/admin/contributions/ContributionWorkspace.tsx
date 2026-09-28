import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { getAdminContributions } from '@/server/utils/contributions/getAdminContributions';
import ContributionReview from './ContributionReview';
import community from '@/components/community/Community.module.css';
import surface from '@/app/profile/ProfileConcept.module.css';
import styles from './Contributions.module.css';

export default function ContributionWorkspace({data,accountName}:{data:Awaited<ReturnType<typeof getAdminContributions>>;accountName?:string}) {
 return <section className={`${surface.concept} ${community.page} ${styles.workspace} mx-auto w-full min-w-0 max-w-6xl px-5 pb-16 sm:px-10 text-foreground`}>
  <header className={styles.header}>
   <div className={styles.breadcrumbs}>
    <Link href={data.userId?'/admin?section=users':'/admin'}><ArrowLeft size={15} aria-hidden="true"/>{data.userId?'Back to People':'Back to Admin'}</Link>
    {data.userId && <Link href="/admin/contributions">All contributors</Link>}
   </div>
   <h1>{accountName || 'Contributions'}</h1>
   <p className={styles.subtitle}>{data.userId?'Contribution history':'Review links, Lore sources and uploads.'}</p>
  </header>
  {data.userId && <nav className={styles.navigation} aria-label="Contributor views">
   <Link href={`/admin/contributions?userId=${data.userId}&status=all`} aria-current="page">Contributions</Link>
   <Link href={`/admin?section=activity&activityQuery=${data.userId}`}>Research activity</Link>
  </nav>}
  <ContributionReview key={data.userId} data={data}/>
 </section>;
}
