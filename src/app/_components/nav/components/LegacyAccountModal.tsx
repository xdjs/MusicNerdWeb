'use client';

import { useLinkAccount } from '@privy-io/react-auth';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface LegacyAccountModalProps {
  open: boolean;
  onClose: () => void;
}

export function LegacyAccountModal({ open, onClose }: LegacyAccountModalProps) {
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

          onClose();
        } catch (err) {
          console.error('[LegacyAccountModal] Error linking wallet:', err);
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
      console.error('[LegacyAccountModal] Wallet link error:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect wallet. Please try again.',
        variant: 'destructive',
      });
      setIsLinking(false);
    },
  });

  const handleLinkWallet = () => {
    setIsLinking(true);
    linkWallet();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to Music Nerd!</DialogTitle>
          <DialogDescription className="pt-2">
            Have an existing Music Nerd wallet-based account? Connect your
            wallet to link your old account and restore your contribution history.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLinking}
          >
            Skip for now
          </Button>
          <Button
            onClick={handleLinkWallet}
            disabled={isLinking}
            className="bg-[#E91E8C] hover:bg-[#C4177A]"
          >
            {isLinking ? 'Connecting...' : 'Connect Wallet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
