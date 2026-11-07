/** @jest-environment node */
import { recordSourceUrlReceipts } from '../recordSourceUrlReceipts';
const url = 'HTTPS://example.com:443/Ä?x=%2f';
it('records exact original UTF8 URL once, preserving policy spelling rather than canonicalizing', async () => {
 const execute=jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{url_hex:Buffer.from(url).toString('hex')}]);
 await recordSourceUrlReceipts({execute} as never,[{url},{url},{url:null},{url:'https://example.com?token=private'}]);
 expect(execute).toHaveBeenCalledTimes(2);
});
it('rejects a hash conflict or missing stored receipt rather than claiming success',async()=>{
 const execute=jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{url_hex:Buffer.from('https://other.test').toString('hex')}]);
 await expect(recordSourceUrlReceipts({execute} as never,[{url}])).rejects.toThrow('URL receipt');
});
it('sanitizes storage errors without leaking bound URLs',async()=>{
 const execute=jest.fn().mockRejectedValue(new Error('query failed: '+url));
 await expect(recordSourceUrlReceipts({execute} as never,[{url}])).rejects.toThrow('URL receipt could not be stored or verified');
});
it('skips rejected URLs and malformed source entries without altering manual text',async()=>{
 const execute=jest.fn();
 await recordSourceUrlReceipts({execute} as never,[null,{},'bad',{url:'file:///private'},{url:'https://u:p@example.com'},{url:'https://example.com?API_KEY=x'}]);
 expect(execute).not.toHaveBeenCalled();
});
it('leaves unrepresentable historical URL strings without receipts',async()=>{
 const execute=jest.fn();
 await recordSourceUrlReceipts({execute} as never,[{url:'https://example.com/\ud800'},{url:'https://example.com/\0'}]);
 expect(execute).not.toHaveBeenCalled();
});
