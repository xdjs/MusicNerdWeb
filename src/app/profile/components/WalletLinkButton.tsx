'use client';

import { useLinkAccount } from '@privy-io/react-auth';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function WalletLinkButton() {
  const { update: updateSession } = useSession();
  const { toast } = useToast();
  const [isLinking, setIsLinking] = useState(false);

  const { linkWallet } = useLinkAccount({
    onSuccess: async (params) => {
      const linkedAccount = params.linkedAccount;
      if (linkedAccount.type === 'wallet') {
        try {
          const response = await fetch('/api/auth/link-wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              walletAddress: linkedAccount.address,
            }),
          });

          const result = await response.json();

          if (result.success) {
            toast({
              title: result.merged ? 'Account Merged!' : 'Wallet Linked!',
              description: result.message,
            });
            await updateSession();
          } else {
            toast({
              title: 'Error',
              description: result.error || 'Failed to link wallet',
              variant: 'destructive',
            });
          }
        } catch (err) {
          console.error('[WalletLinkButton] Error linking wallet:', err);
          toast({
            title: 'Error',
            description: 'Failed to link wallet. Please try again.',
            variant: 'destructive',
          });
        }
      }
      setIsLinking(false);
    },
    onError: (error) => {
      console.error('[WalletLinkButton] Wallet link error:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect wallet. Please try again.',
        variant: 'destructive',
      });
      setIsLinking(false);
    },
  });

  return (
    <Button
      onClick={() => {
        setIsLinking(true);
        linkWallet();
      }}
      disabled={isLinking}
      className="bg-[#E91E8C] hover:bg-[#C4177A]"
    >
      {isLinking ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  );
}
