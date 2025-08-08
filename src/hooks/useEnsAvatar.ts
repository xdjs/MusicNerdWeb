"use client"
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { createPublicClient, http } from 'viem';
import { getEnsAvatar, getEnsName } from 'viem/ens';

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http()
});

export function useEnsAvatar() {
  const { address } = useAccount();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchAvatar() {
      if (!address) {
        setAvatar(null);
        return;
      }

      setLoading(true);
      try {
        // First get the ENS name for the address
        const ensName = await getEnsName(publicClient, {
          address: address as `0x${string}`,
        });

        if (ensName) {
          // Then get the avatar for the ENS name
          const ensAvatar = await getEnsAvatar(publicClient, {
            name: ensName,
          });
          
          setAvatar(ensAvatar);
        } else {
          setAvatar(null);
        }
      } catch (error) {
        console.error('Error fetching ENS avatar:', error);
        setAvatar(null);
      } finally {
        setLoading(false);
      }
    }

    fetchAvatar();
  }, [address]);

  return { avatar, loading };
}
