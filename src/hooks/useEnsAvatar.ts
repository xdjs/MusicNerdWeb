"use client"
import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { createPublicClient, http } from 'viem';
import { getEnsAvatar, getEnsName } from 'viem/ens';
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http()
});

export function useEnsAvatar() {
  const { address } = useAccount();
  const [ensAvatar, setEnsAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const jazziconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchAvatar() {
      if (!address) {
        setEnsAvatar(null);
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
          const avatar = await getEnsAvatar(publicClient, {
            name: ensName,
          });
          
          setEnsAvatar(avatar);
        } else {
          setEnsAvatar(null);
        }
      } catch (error) {
        console.error('Error fetching ENS avatar:', error);
        setEnsAvatar(null);
      } finally {
        setLoading(false);
      }
    }

    fetchAvatar();
  }, [address]);

  // Generate Jazzicon component for the current address
  const jazziconComponent = address ? (
    <Jazzicon diameter={32} seed={jsNumberForAddress(address)} />
  ) : null;

  return { 
    ensAvatar, 
    jazziconComponent,
    address,
    loading 
  };
}
