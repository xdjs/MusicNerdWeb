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
  const [error, setError] = useState<string | null>(null);

  const { linkWallet } = useLinkAccount({
    onSuccess: async ({ linkedAccount }) => {
      if (linkedAccount.type === 'wallet') {
        try {
          const response = await fetch('/api/auth/link-wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              walletAddress: (linkedAccount as { address?: string }).address
            }),
          });

          const result = await response.json();

          if (result.success) {
            toast({
              title: result.merged ? 'Account Merged!' : 'Wallet Linked!',
              description: result.message,
            });
            await updateSession();
            onClose();
          } else {
            setError(result.error || 'Failed to link wallet');
            toast({
              title: 'Error',
              description: result.error || 'Failed to link wallet',
              variant: 'destructive',
            });
          }
        } catch (err) {
          setError('Failed to link wallet. Please try again.');
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
      console.error('[LinkWallet] Error:', error);
      setError('Failed to connect wallet. Please try again.');
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
    setError(null);
    linkWallet();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to Music Nerd!</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Have an existing Music Nerd wallet-based account? Connect your
            wallet to link your old account and restore your contribution history.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="text-red-500 text-sm bg-red-50 dark:bg-red-950 p-3 rounded-md">
            {error}
          </div>
        )}

        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
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
            className="bg-pastypink hover:bg-pastypink/80"
          >
            {isLinking ? 'Connecting...' : 'Connect Wallet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
