import {render,fireEvent} from '@testing-library/react';
import CollectionArtistImage from '../CollectionArtistImage';
const id='6cb3d81a-3d02-4c57-a711-bb7902a9af1b';
it('lazily resolves missing provider images and retains an accessible tile on failure',()=>{
 const {container,getByText,rerender}=render(<CollectionArtistImage artistId={id} className="photo" fallback={<span>DY</span>} />);
 const image=container.querySelector('img')!;
 expect(image).toHaveAttribute('src',`/api/artist/${id}/image`);
 expect(image).toHaveAttribute('loading','lazy');
 fireEvent.error(image);expect(getByText('DY')).toBeVisible();
 rerender(<CollectionArtistImage artistId={id} imageUrl="/new-photo.png" className="photo" fallback={<span>DY</span>} />);
 expect(container.querySelector('img')).toHaveAttribute('src','/new-photo.png');
});
