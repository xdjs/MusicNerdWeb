'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function UserNamePrompt({ name, onSave, onDismiss }: {
  name: string; onSave: (name: string) => Promise<void>; onDismiss: () => void;
}) {
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  return <Dialog open onOpenChange={open => { if (!open && !saving) onDismiss(); }}>
    <DialogContent className="mn-themed-dialog max-w-md">
      <DialogHeader className="text-left pr-6">
        <DialogTitle>Your Music Nerd user name</DialogTitle>
        <DialogDescription>We picked <strong className="text-foreground">{name}</strong> for you. This is the name others will see on your profile and contributions. Keep it or enter your own.</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={async event => {
        event.preventDefault(); if (saving) return;
        setSaving(true); setError('');
        try { await onSave(value.trim()); }
        catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save your user name. Please try again.'); }
        finally { setSaving(false); }
      }}>
        <div><label htmlFor="welcome-user-name" className="mb-2 block text-sm">User name</label>
          <Input id="welcome-user-name" value={value} disabled={saving} maxLength={50} autoComplete="nickname" className="min-h-12 text-base" onChange={event => setValue(event.target.value)} /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button variant="pink" type="submit" disabled={saving || !value.trim()} className="w-full min-h-12 bg-highlightpink text-black hover:bg-highlightpink/80">{saving ? 'Saving…' : 'Continue'}</Button>
        <p className="text-xs text-muted-foreground">You can change your user name anytime in your profile.</p>
      </form>
    </DialogContent>
  </Dialog>;
}
