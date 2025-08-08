"use client"
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { createPublicClient, http } from 'viem';
import { getEnsAvatar, getEnsName } from 'viem/ens';
import { jsNumberForAddress } from 'react-jazzicon';

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http()
});

export function useEnsAvatar(existingJazziconSeed?: number | null) {
  const { address, connector } = useAccount();
  const [ensAvatar, setEnsAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  // Use existing Jazzicon seed if provided, but don't generate new ones
  return { 
    ensAvatar, 
    jazziconSeed: existingJazziconSeed || null,
    address,
    loading
  };
}
