import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ArtistPhotoChoice from '../ArtistPhotoChoice';
const image = 'https://i.scdn.co/image/chosen';
const choices = { expectedCustomImage: '/pete.png', options: [
    { source: 'deezer', providerId: 'dz', imageUrl: 'https://cdn.example/deezer.jpg' },
    { source: 'spotify', providerId: 'sp', imageUrl: image },
] };
const onSaved = jest.fn();
const onClose = jest.fn();
const onUpload = jest.fn();
let fetchMock: jest.SpyInstance;
beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => choices } as Response);
});
afterEach(() => fetchMock.mockRestore());
function open() { render(<ArtistPhotoChoice artistId="artist" currentImage="/pete.png" onSaved={onSaved} onClose={onClose} onUpload={onUpload} />); }
it('preview and cancel never save or change the current photo', async () => {
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Choose Spotify photo' }));
    expect(screen.getByAltText('Current artist photo')).toHaveAttribute('src', '/pete.png');
    expect(onSaved).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('saves only after explicit confirmation and uses the server crop', async () => {
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Choose Spotify photo' }));
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ imagePath: image, position: 35 }) });
    fireEvent.click(screen.getByRole('button', { name: 'Save photo' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(image, 35));
    const payload = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(payload).toMatchObject({ expectedCustomImage: '/pete.png', source: 'spotify', imageUrl: image });
});
it('failed save leaves the current photo unchanged', async () => {
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Choose Spotify photo' }));
    fetchMock.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'The profile changed' }) });
    fireEvent.click(screen.getByRole('button', { name: 'Save photo' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The profile changed');
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
});
it('disables failed image previews and retains upload when lookup fails', async () => {
    open();
    const preview = await screen.findByAltText('Spotify artist photo');
    fireEvent.click(screen.getByRole('button', { name: 'Choose Spotify photo' }));
    fireEvent.error(preview);
    expect(screen.getByRole('button', { name: 'Save photo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Choose Spotify photo' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Upload photo' }));
    expect(onUpload).toHaveBeenCalled();
});
