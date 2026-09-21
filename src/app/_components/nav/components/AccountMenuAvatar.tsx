'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { readProfileJson } from '@/lib/profile/readProfileJson';

export default function AccountMenuAvatar({userId}: {userId: string}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const photo = useQuery({
    queryKey: ['profile-photo', userId],
    queryFn: ({signal}) => readProfileJson<{url: string | null}>('/api/user/profile-image', userId, signal),
    staleTime: 45 * 60 * 1000,
    refetchInterval: 45 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: false,
  });
  const url = photo.isError ? null : photo.data?.url;
  return <div className="profile-account-avatar w-8 h-8 rounded-full overflow-hidden">
    <img src={url && url !== failedUrl ? url : '/default_pfp_pink.png'} alt="Your profile"
      className="w-full h-full rounded-full object-cover" onError={() => setFailedUrl(url ?? null)} />
  </div>;
}
