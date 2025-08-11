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
      if (!address) {
        setImageSrc('/default_pfp.png');
        setIsLoading(false);
        return;
      }

      // Priority 1: ENS Avatar from RainbowKit
      if (ensAvatar) {
        setImageSrc(ensAvatar);
        setIsLoading(false);
        return;
      }

      // Priority 2: MetaMask existing Jazzicon seed
      try {
        const jazziconElement = generateMetaMaskJazzicon(address, size);
        if (jazziconElement) {
          const dataURL = jazziconToDataURL(jazziconElement);
          if (dataURL) {
            setImageSrc(dataURL);
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.debug('[ProfilePicture] Error generating MetaMask Jazzicon:', error);
      }

      // Priority 3: Default profile picture
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
