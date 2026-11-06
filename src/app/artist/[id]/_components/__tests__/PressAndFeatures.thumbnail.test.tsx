import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import PressAndFeatures from '../PressAndFeatures';
const main = {id:'main',artistId:'a',url:'https://example.org/',type:'website',status:'approved'};
const page = {id:'about',artistId:'a',url:'https://example.org/about',type:'website',status:'approved',title:'Biography'};
it('renders an available image on the reclassified supporting website and hides broken image while retaining fallback',()=>{
 const {container}=render(<PressAndFeatures sources={[main,{...page,ogImage:'https://example.org/photo.jpg'}]}/>);
 const card=container.querySelector('a[href="https://example.org/about"]')!;
 const image=card.querySelector('img[src="https://example.org/photo.jpg"]') as HTMLImageElement;
 expect(image).toBeInTheDocument();
 expect(container.querySelector('a[href="https://example.org/"]')).toBeNull();
 fireEvent.error(image);
 expect(image.style.display).toBe('none');
 expect(card.querySelector('img[src*="favicons"]')).toBeInTheDocument();
});
it('retains card and gradient fallback with no metadata or broken favicon',()=>{
 const {container}=render(<PressAndFeatures sources={[main,page]}/>);
 const card=container.querySelector('a[href="https://example.org/about"]')!;
 const images=card.querySelectorAll('img');
 expect(images).toHaveLength(2);
 images.forEach(image=>{fireEvent.error(image);expect(image.style.display).toBe('none');});
 expect(card.querySelector('.bg-gradient-to-br')).toBeInTheDocument();
 expect(card).toHaveTextContent('Biography');
});

it('hides images that failed before hydration and retries a replacement URL',()=>{
 const complete=jest.spyOn(HTMLImageElement.prototype,'complete','get').mockReturnValue(true);
 const width=jest.spyOn(HTMLImageElement.prototype,'naturalWidth','get').mockReturnValue(0);
 const {container,rerender}=render(<PressAndFeatures sources={[main,{...page,ogImage:'https://example.org/broken.jpg'}]}/>);
 const failed=container.querySelector('img[src="https://example.org/broken.jpg"]') as HTMLImageElement;
 expect(failed.style.display).toBe('none');
 complete.mockReturnValue(false);
 rerender(<PressAndFeatures sources={[main,{...page,ogImage:'https://example.org/replacement.jpg'}]}/>);
 const replacement=container.querySelector('img[src="https://example.org/replacement.jpg"]') as HTMLImageElement;
 expect(replacement.style.display).not.toBe('none');
 complete.mockRestore();width.mockRestore();
});


it('never retains another artist thumbnail when source props change, including missing metadata',()=>{
 const {container,rerender}=render(<PressAndFeatures sources={[main,{...page,ogImage:'https://example.org/artist-a.jpg'}]}/>);
 const otherMain={...main,artistId:'b',url:'https://artist-b.example/'};
 const otherPage={...page,artistId:'b',url:'https://artist-b.example/about'};
 rerender(<PressAndFeatures sources={[otherMain,{...otherPage,ogImage:'https://artist-b.example/artist-b.jpg'}]}/>);
 expect(container.querySelector('img[src="https://example.org/artist-a.jpg"]')).toBeNull();
 expect(container.querySelector('img[src="https://artist-b.example/artist-b.jpg"]')).toBeInTheDocument();
 rerender(<PressAndFeatures sources={[otherMain,otherPage]}/>);
 expect(container.querySelector('img[src="https://artist-b.example/artist-b.jpg"]')).toBeNull();
 expect(container.querySelector('img[src*="domain=artist-b.example"]')).toBeInTheDocument();
});
