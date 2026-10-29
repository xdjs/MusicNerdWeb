'use client';

import { useLinkAccount } from '@privy-io/react-auth';
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
import { requestLinkWallet } from '@/lib/account/requestLinkWallet';
import { requestUserApi } from '@/lib/user/requestUserApi';
import { trackEvent } from '@/lib/analytics/trackEvent';
import { useMusicNerdUser } from '@/hooks/useMusicNerdUser';

interface LegacyAccountModalProps {
  open: boolean;
  onClose: () => void;
}

export function LegacyAccountModal({ open, onClose }: LegacyAccountModalProps) {
  const { user, refetch } = useMusicNerdUser();
  const { toast } = useToast();
  const [isLinking, setIsLinking] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBusy = isLinking || isDismissing;

  const { linkWallet } = useLinkAccount({
    onSuccess: async ({ linkedAccount }) => {
      if (linkedAccount.type === 'wallet') {
        try {
          const response = await requestLinkWallet((linkedAccount as { address?: string }).address);

          const result = await response.json();

          if (response.ok && result.success) {
            toast({
              title: result.merged ? 'Account Merged!' : 'Wallet Linked!',
              description: result.message,
            });
            await refetch();
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

  const handleDismiss = async () => {
    setIsDismissing(true);
    setError(null);
    try {
      if (!user) throw new Error('Not signed in');
      const response = await requestUserApi(`/api/user/${user.id}/dismiss-legacy-link`, { method: 'POST' });
      if (response.ok) {
        trackEvent('profile_edit', { action: 'dismiss', target: null });
        await refetch();
        onClose();
      } else {
        setError('Failed to dismiss legacy link prompt');
        toast({
          title: 'Error',
          description: 'Failed to dismiss legacy link prompt',
          variant: 'destructive',
        });
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDismissing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="dark:text-white">Welcome to Music Nerd!</DialogTitle>
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

        <DialogFooter className="flex flex-wrap justify-center gap-2 sm:flex-row sm:justify-center sm:space-x-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isBusy}
            className="dark:border-gray-500 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Skip for now
          </Button>
          <Button
            variant="outline"
            onClick={handleDismiss}
            disabled={isBusy}
            className="dark:border-gray-500 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            {isDismissing ? 'Dismissing...' : 'New user'}
          </Button>
          <Button
            onClick={handleLinkWallet}
            disabled={isBusy}
            variant="pink"
          >
            {isLinking ? 'Connecting...' : 'Connect Wallet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
