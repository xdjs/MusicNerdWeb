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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookmarks</h1>
        <p className="text-gray-600">
          Your saved artists and musicians
        </p>
      </div>
      
      <BookmarksList />
    </div>
  );
}

