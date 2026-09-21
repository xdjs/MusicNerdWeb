import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HeaderPhotoPosition from '@/app/artist/[id]/_components/HeaderPhotoPosition';

const props = { artistId: 'a1', imageUrl: '/photo.jpg', position: 20, onChange: jest.fn(), onClose: jest.fn() };
beforeEach(() => { jest.clearAllMocks(); });
it('previews slider changes and cancels without a write', () => {
  render(<HeaderPhotoPosition {...props} />);
  fireEvent.change(screen.getByRole('slider', { name: 'Vertical position' }), { target: { value: '65' } });
  expect(props.onChange).toHaveBeenLastCalledWith(65);
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(props.onChange).toHaveBeenLastCalledWith(20);
  expect(props.onClose).toHaveBeenCalled();
});
it('saves the image-specific position, and closes only after success', async () => {
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
  render(<HeaderPhotoPosition {...props} />);
  fireEvent.change(screen.getByRole('slider'), { target: { value: '70' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save position' }));
  await waitFor(() => expect(props.onClose).toHaveBeenCalled());
  expect(fetchMock).toHaveBeenCalledWith('/api/artist/header-position', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ artistId: 'a1', imageUrl: '/photo.jpg', y: 70 }) }));
  fetchMock.mockRestore();
});
it('keeps the draft and permits retry when saving fails', async () => {
  const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false } as Response);
  render(<HeaderPhotoPosition {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save position' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save');
  expect(props.onClose).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Save position' })).toBeEnabled();
  fetchMock.mockRestore();
});
