import { notFound } from 'next/navigation';
import ContributionsView from './ContributionsView';
import { adminContributionsPath } from '@/lib/admin/adminContributionsPath';
import { firstParam, type SearchParams } from '@/lib/admin/firstParam';

export default async function Contributions({searchParams}:{searchParams:Promise<SearchParams>}) {
 const params = await searchParams;
 const userId = firstParam(params.userId);
 if(userId && !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(userId)) notFound();
 return <ContributionsView path={adminContributionsPath(params)}/>;
}
