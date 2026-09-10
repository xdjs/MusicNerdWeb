import { createHmac, timingSafeEqual } from 'node:crypto';
import { SUPABASE_SERVICE_ROLE_KEY } from '@/env';

export const LORE_UPLOAD_BUCKET = 'lore-upload-staging';
export type UploadTicket = { userId: string; artistId: string; path: string; name: string; type: string; size: number; expires: number };
const signature = (payload: string) => createHmac('sha256', SUPABASE_SERVICE_ROLE_KEY).update(`lore-upload:${payload}`).digest('base64url');
export function signUploadTicket(ticket: UploadTicket): string {
    const payload = Buffer.from(JSON.stringify(ticket)).toString('base64url');
    return `${payload}.${signature(payload)}`;
}
/** Verify identity/integrity separately so expired tickets can authorize cleanup only. */
export function verifyUploadTicket(value: string, userId: string): UploadTicket {
    const [payload, mac, extra] = value.split('.');
    if (!payload || !mac || extra !== undefined) throw new Error('Invalid upload ticket');
    const expected = Buffer.from(signature(payload));
    const actual = Buffer.from(mac);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new Error('Invalid upload ticket');
    const ticket = JSON.parse(Buffer.from(payload, 'base64url').toString()) as UploadTicket;
    if (ticket.userId !== userId) throw new Error('Invalid upload ticket');
    return ticket;
}
export function readUploadTicket(value: string, userId: string): UploadTicket {
    const ticket = verifyUploadTicket(value, userId);
    if (ticket.expires < Date.now()) throw new Error('Upload expired. Please try again.');
    return ticket;
}
