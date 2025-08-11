"use client"

import React, { useEffect, useRef, useState } from 'react';
import { getUserAvatar, AvatarData } from '@/lib/avatarUtils';

interface AvatarProps {
  address: string;
  size?: number;
  className?: string;
  fallbackSrc?: string;
}

export function Avatar({ 
  address, 
  size = 32, 
  className = "", 
  fallbackSrc = "/default_pfp.png" 
}: AvatarProps) {
  const [avatarData, setAvatarData] = useState<AvatarData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    const loadAvatar = async () => {
      if (!address) {
        setAvatarData({ type: 'default', src: fallbackSrc });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(false);
        
        const data = await getUserAvatar(address);
        
        if (mounted) {
          setAvatarData(data);
          setIsLoading(false);
        }
      } catch (err) {
        console.debug('[Avatar] Error loading avatar:', err);
        if (mounted) {
          setError(true);
          setAvatarData({ type: 'default', src: fallbackSrc });
          setIsLoading(false);
        }
      }
    };

    loadAvatar();

    return () => {
      mounted = false;
    };
  }, [address, fallbackSrc]);

  useEffect(() => {
    // Handle Jazzicon element insertion
    if (avatarData?.type === 'jazzicon' && avatarData.element && containerRef.current) {
      // Clear existing content
      containerRef.current.innerHTML = '';
      // Append the Jazzicon element
      containerRef.current.appendChild(avatarData.element);
    }
  }, [avatarData]);

  if (isLoading) {
    return (
      <div 
        className={`animate-pulse bg-gray-200 rounded-full ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  if (avatarData?.type === 'jazzicon') {
    return (
      <div 
        ref={containerRef}
        className={`rounded-full overflow-hidden ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <img
      src={avatarData?.src || fallbackSrc}
      alt="Profile"
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
      onError={() => {
        if (!error) {
          setError(true);
          setAvatarData({ type: 'default', src: fallbackSrc });
        }
      }}
    />
  );
}
