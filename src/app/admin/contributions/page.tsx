import { notFound, redirect } from 'next/navigation';
import { getServerAuthSession } from '@/server/auth';
import { getUserById } from '@/server/utils/queries/userQueries';
import { getAdminContributions } from '@/server/utils/contributions/getAdminContributions';
import ContributionWorkspace from './ContributionWorkspace';

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
 return <ContributionWorkspace data={data} accountName={account ? account.username || account.email || account.id : undefined}/>;
}
