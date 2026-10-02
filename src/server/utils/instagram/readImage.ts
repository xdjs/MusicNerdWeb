const MAX_BYTES = 8 * 1024 * 1024;
export async function readImage(response: Response): Promise<Buffer> {
    if (!response.ok || !/^image\/(jpeg|png|webp)(?:;|$)/i.test(response.headers.get('content-type') ?? '')) throw new Error('Invalid media response');
    if (Number(response.headers.get('content-length')) > MAX_BYTES || !response.body) throw new Error('Image too large or empty');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            length += value.byteLength;
            if (length > MAX_BYTES) throw new Error('Image too large');
            chunks.push(value);
        }
        return Buffer.concat(chunks);
    } finally { await reader.cancel(); }
}
