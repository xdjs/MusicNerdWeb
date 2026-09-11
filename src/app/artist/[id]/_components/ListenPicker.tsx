"use client";

import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import ListeningDialogContent from './ListeningDialogContent';
import type { ProfileLink } from '@/lib/artistProfileLinks';

export default function ListenPicker({ artistName, links }: { artistName: string; links: ProfileLink[] }) {
    if (!links.length) return null;
    return <Dialog>
        <DialogTrigger asChild>
            <Button type="button" variant="pink" className="px-5">
                Listen <Play size={14} fill="currentColor" aria-hidden="true" />
            </Button>
        </DialogTrigger>
        <ListeningDialogContent title={`Listen to ${artistName}`} description="Choose where you listen." links={links} />
    </Dialog>;
}
