'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type Option = { source: 'deezer' | 'spotify'; providerId: string | null; imageUrl: string | null };
interface Choices { expectedCustomImage: string | null; options: Option[] }
interface Props {
    artistId: string;
    currentImage: string;
    onClose: () => void;
    onUpload: () => void;
    onSaved: (image: string, position: number) => void;
}

export default function ArtistPhotoChoice({ artistId, currentImage, onClose, onUpload, onSaved }: Props) {
    const [choices, setChoices] = useState<Choices | null>(null);
    const [selected, setSelected] = useState<Option | null>(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [failed, setFailed] = useState<string[]>([]);
    useEffect(() => {
        const controller = new AbortController();
        void fetch(`/api/artist/photo-choice?artistId=${encodeURIComponent(artistId)}`, { signal: controller.signal })
            .then(async res => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Could not load photo choices');
                if (!controller.signal.aborted) setChoices(data);
            }).catch(error => {
                if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Could not load photo choices');
            });
        return () => controller.abort();
    }, [artistId]);
    async function save() {
        if (!choices || !selected?.imageUrl || saving) return;
        setSaving(true);
        setError('');
        try {
            const res = await fetch('/api/artist/photo-choice', {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ artistId, source: selected.source, providerId: selected.providerId,
                    imageUrl: selected.imageUrl, expectedCustomImage: choices.expectedCustomImage }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Could not save photo');
            onSaved(data.imagePath, data.position);
            onClose();
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Could not save photo. Please try again.');
        } finally { setSaving(false); }
    }
    return <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl p-5 sm:p-6">
            <DialogHeader>
                <DialogTitle>Change photo</DialogTitle>
                <DialogDescription>Your current photo stays until you save a new one.</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                <Image src={currentImage} alt="Current artist photo" width={56} height={56} unoptimized className="h-14 w-14 rounded-lg object-cover" />
                <span className="text-sm font-medium">Current photo</span>
            </div>
            {!choices && !error && <p role="status" className="text-sm text-muted-foreground">Loading photo choices…</p>}
            {choices && <div className="grid grid-cols-2 gap-3">
                {choices.options.map(option => {
                    const label = option.source === 'deezer' ? 'Deezer' : 'Spotify';
                    const available = !!option.imageUrl && !failed.includes(option.source);
                    return <button key={option.source} type="button" disabled={!available || saving}
                        aria-label={`Choose ${label} photo`} aria-pressed={selected?.source === option.source}
                        onClick={() => setSelected(option)}
                        className={`overflow-hidden rounded-xl border-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-pastypink disabled:opacity-50 ${selected?.source === option.source ? 'border-pastypink' : 'border-border'}`}>
                        {available ? <Image src={option.imageUrl!} alt={`${label} artist photo`} width={200} height={200} unoptimized
                            onError={() => { setFailed(previous => [...previous, option.source]); setSelected(previous => previous?.source === option.source ? null : previous); }}
                            className="aspect-square w-full object-cover" />
                            : <div className="flex aspect-square items-center justify-center bg-muted p-3 text-center text-xs text-muted-foreground">{option.providerId ? 'Photo unavailable' : `No ${label} link`}</div>}
                        <span className="block px-3 py-2 text-sm font-medium">{label}</span>
                    </button>;
                })}
            </div>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Button type="button" variant="outline" disabled={saving} onClick={() => { onClose(); onUpload(); }}>Upload photo</Button>
                <div className="flex gap-2">
                    <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>Cancel</Button>
                    <Button type="button" variant="pink" disabled={!selected || saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save photo'}</Button>
                </div>
            </div>
            <p className="text-xs text-muted-foreground">Upload a PNG, JPEG or WebP, up to 5 MB.</p>
        </DialogContent>
    </Dialog>;
}
