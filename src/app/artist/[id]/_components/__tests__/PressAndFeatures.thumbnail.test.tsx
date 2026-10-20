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
