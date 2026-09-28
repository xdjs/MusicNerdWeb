import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerAuthSession } from '@/server/auth';
import { getUserById } from '@/server/utils/queries/userQueries';
import { getAdminContributions } from '@/server/utils/contributions/getAdminContributions';
import ContributionReview from './ContributionReview';
import styles from '@/components/community/Community.module.css';
import surface from '@/app/profile/ProfileConcept.module.css';

type Params = Record<string, string | string[] | undefined>;
export default async function Contributions({searchParams}:{searchParams:Promise<Params>}) {
 const session = await getServerAuthSession();
 if(!session?.user?.id) redirect('/');
 const admin = await getUserById(session.user.id);
 if(!admin?.isAdmin) redirect('/');
 const params = await searchParams;
 const value = (name:string) => typeof params[name] === 'string' ? params[name] : params[name]?.[0] ?? '';
 const userId = value('userId');
 if(userId && !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(userId)) notFound();
 const [data, account] = await Promise.all([
  getAdminContributions({userId,query:value('query'),origin:value('origin'),type:value('type'),status:value('status') || (userId?'all':'pending'),page:Number(value('page'))}),
  userId ? getUserById(userId) : Promise.resolve(null),
 ]);
 if(userId && !account) notFound();
 return <section className={`${surface.concept} ${styles.page} mx-auto w-full min-w-0 max-w-6xl px-5 pb-16 sm:px-10 text-foreground`}>
  <header className={styles.header}><div><h1>{account ? 'User contributions' : 'Contributions'}</h1><p className={styles.description}>{account ? account.username || account.email || account.id : 'Review link submissions, Lore sources and uploads by origin.'}</p></div><Link className={styles.pill} href="/admin?section=users">Back to People</Link></header>
  {userId && <div className="mb-5 flex flex-wrap gap-4 text-sm"><Link className="underline" href={`/admin?section=activity&activityQuery=${userId}`}>Research and activity for this user</Link><Link className="underline" href="/admin/contributions">All contributions</Link></div>}
  <ContributionReview key={`${data.userId}:${data.query}:${data.origin}:${data.type}:${data.status}:${data.page}`} data={data}/>
 </section>;
}
