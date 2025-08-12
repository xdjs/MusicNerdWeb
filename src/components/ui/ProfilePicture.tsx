"use client"

import { useEffect, useState } from 'react';
import { generateMetaMaskJazzicon, jazziconToDataURL } from '@/lib/metamaskJazziconUtils';

interface ProfilePictureProps {
  address?: string;
  ensAvatar?: string;
  size?: number;
  className?: string;
  alt?: string;
}

export default function ProfilePicture({ 
  address, 
  ensAvatar, 
  size = 32, 
  className = "", 
  alt = "Profile" 
}: ProfilePictureProps) {
  const [imageSrc, setImageSrc] = useState<string>('/default_pfp.png');
  const [isLoading, setIsLoading] = useState(true);

     useEffect(() => {
     const loadProfilePicture = async () => {
       console.debug('[ProfilePicture] Loading profile picture for address:', address);
       
       if (!address) {
         console.debug('[ProfilePicture] No address provided, using default');
         setImageSrc('/default_pfp.png');
         setIsLoading(false);
         return;
       }

       // Priority 1: ENS Avatar from RainbowKit
       if (ensAvatar) {
         console.debug('[ProfilePicture] Using ENS avatar:', ensAvatar);
         setImageSrc(ensAvatar);
         setIsLoading(false);
         return;
       }

               // Priority 2: Generate Jazzicon using same algorithm as MetaMask
        try {
          console.debug('[ProfilePicture] Generating Jazzicon using MetaMask algorithm...');
          const jazziconElement = generateMetaMaskJazzicon(address, size);
          if (jazziconElement) {
            console.debug('[ProfilePicture] Jazzicon element generated, converting to data URL...');
            const dataURL = await jazziconToDataURL(jazziconElement);
            if (dataURL) {
              console.debug('[ProfilePicture] Using Jazzicon data URL');
              setImageSrc(dataURL);
              setIsLoading(false);
              return;
            } else {
              console.debug('[ProfilePicture] Failed to convert Jazzicon to data URL');
            }
          } else {
            console.debug('[ProfilePicture] No Jazzicon element generated');
          }
        } catch (error) {
          console.debug('[ProfilePicture] Error generating Jazzicon:', error);
        }

       // Priority 3: Default profile picture
       console.debug('[ProfilePicture] Using default profile picture');
       setImageSrc('/default_pfp.png');
       setIsLoading(false);
     };

     loadProfilePicture();
   }, [address, ensAvatar, size]);

  const handleImageError = () => {
    // Fallback to default if any image fails to load
    setImageSrc('/default_pfp.png');
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div 
        className={`animate-pulse bg-gray-200 rounded-full ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
      onError={handleImageError}
    />
  );
}
