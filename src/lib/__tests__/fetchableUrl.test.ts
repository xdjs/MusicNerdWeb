import { fetchableUrl } from '@/lib/fetchableUrl';

describe('fetchableUrl', () => {
    it('resolves ar:// through the Arweave gateway', () => {
        expect(fetchableUrl('ar://Fi_4NsH2u8UpMScJc0q1U_0qy35q5EVEif5unP3ALcE')).toBe('https://arweave.net/Fi_4NsH2u8UpMScJc0q1U_0qy35q5EVEif5unP3ALcE');
    });
    it('resolves ipfs:// through the IPFS gateway', () => {
        expect(fetchableUrl('ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi')).toBe('https://magic.decentralized-content.com/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi');
    });
    it('keeps https as is and rejects the rest', () => {
        const https = 'https://zzgteesackezhtnuqfyw.supabase.co/storage/v1/object/public/in_process_files/5eb5ed3a';
        expect(fetchableUrl(https)).toBe(https);
        expect(fetchableUrl('http://insecure.example/a.png')).toBeNull();
        expect(fetchableUrl('ar://undefined')).toBeNull();
        expect(fetchableUrl('ar://')).toBeNull();
        expect(fetchableUrl('data:image/png;base64,AAAA')).toBeNull();
        expect(fetchableUrl(null)).toBeNull();
        expect(fetchableUrl('')).toBeNull();
    });
});
