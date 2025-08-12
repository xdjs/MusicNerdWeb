import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { redirect } from 'next/navigation';
import { BookmarksList } from '@/app/_components/BookmarksList';

export default async function BookmarksPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/');
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <BookmarksList />
    </div>
  );
}

