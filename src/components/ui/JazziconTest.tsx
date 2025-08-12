"use client"

import { useEffect, useRef } from 'react';
import { generateMetaMaskJazzicon } from '@/lib/metamaskJazziconUtils';

interface JazziconTestProps {
  address: string;
  size?: number;
}

export default function JazziconTest({ address, size = 32 }: JazziconTestProps) {
  const jazziconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log('[JazziconTest] Testing Jazzicon generation for address:', address);
    
    const jazziconElement = generateMetaMaskJazzicon(address, size);
    if (jazziconElement) {
      console.log('[JazziconTest] Jazzicon generated successfully');
      if (jazziconRef.current) {
        jazziconRef.current.innerHTML = '';
        jazziconRef.current.appendChild(jazziconElement);
        console.log('[JazziconTest] Jazzicon appended to DOM');
      }
    } else {
      console.log('[JazziconTest] Failed to generate Jazzicon');
    }
  }, [address, size]);

  return (
    <div className="border-2 border-red-500 p-4 m-4">
      <h3>Jazzicon Test for {address}</h3>
      <div 
        ref={jazziconRef}
        className="border border-blue-500"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
