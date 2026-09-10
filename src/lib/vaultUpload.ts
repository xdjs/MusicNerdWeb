export const MAX_VAULT_FILE_BYTES = 10 * 1024 * 1024;
/** Keep source metadata identical across legacy and signed upload paths. */
export function getUploadSourceType(mimeType: string): 'image' | 'audio' | 'data' | 'document' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'text/csv' || mimeType === 'application/json') return 'data';
    return 'document';
}
export const VAULT_UPLOAD_LIMIT_LABEL = '10 MB per file';
export const VAULT_UPLOAD_TYPES = ['application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/json', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/webp', 'audio/mpeg', 'audio/wav'];
