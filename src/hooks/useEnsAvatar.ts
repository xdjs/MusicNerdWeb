"use client"
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useSession } from 'next-auth/react';
import { mainnet } from 'wagmi/chains';
import { createPublicClient, http } from 'viem';
import { getEnsAvatar, getEnsName } from 'viem/ens';
import { jsNumberForAddress } from 'react-jazzicon';

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http()
});

export function useEnsAvatar() {
  const { address, connector } = useAccount();
  const { data: session } = useSession();
  const [ensAvatar, setEnsAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Debug logging to understand address and connector differences
  useEffect(() => {
    if (address && connector) {
      console.log('[useEnsAvatar] Address and connector info:', {
        wagmiAddress: address,
        sessionWalletAddress: session?.user?.walletAddress,
        addressesMatch: address?.toLowerCase() === session?.user?.walletAddress?.toLowerCase(),
        addressLength: address.length,
        addressLowerCase: address.toLowerCase(),
        connectorName: connector.name,
        connectorType: connector.type,
        connectorId: connector.id,
        connector: connector
      });
    }
  }, [address, connector, session]);

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

  // Generate Jazzicon seed from address when no ENS avatar is available
  // Use session wallet address for consistency across different connection methods
  const addressToUse = session?.user?.walletAddress || address;
  const jazziconSeed = addressToUse && !ensAvatar ? jsNumberForAddress(addressToUse.toLowerCase()) : null;
  
  // Debug Jazzicon seed generation
  useEffect(() => {
    if (addressToUse && !ensAvatar) {
      const seed = jsNumberForAddress(addressToUse.toLowerCase());
      console.log('[useEnsAvatar] Jazzicon generation:', {
        wagmiAddress: address,
        sessionAddress: session?.user?.walletAddress,
        addressToUse,
        addressLowerCase: addressToUse.toLowerCase(),
        jazziconSeed: seed,
        ensAvatar,
        connectorName: connector?.name,
        usingSessionAddress: !!session?.user?.walletAddress
      });
    }
  }, [address, addressToUse, ensAvatar, connector, session]);
  
  return { 
    ensAvatar, 
    jazziconSeed,
    address,
    loading
  };
}
