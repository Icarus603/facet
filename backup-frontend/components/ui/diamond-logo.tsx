/**
 * FACET Diamond Logo Component
 * Realistic diamond with proper facets and light reflection
 */

import React from 'react';

interface DiamondLogoProps {
  size?: number;
  className?: string;
}

export function DiamondLogo({ size = 24, className = '' }: DiamondLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Main diamond gradient - seamless blue */}
        <linearGradient id="diamond-main" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E1F5FE" />
          <stop offset="25%" stopColor="#B3E5FC" />
          <stop offset="50%" stopColor="#81D4FA" />
          <stop offset="75%" stopColor="#4FC3F7" />
          <stop offset="100%" stopColor="#29B6F6" />
        </linearGradient>

        {/* Dark facet gradient */}
        <linearGradient id="diamond-dark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0277BD" />
          <stop offset="50%" stopColor="#0288D1" />
          <stop offset="100%" stopColor="#039BE5" />
        </linearGradient>

        {/* Light reflection gradient */}
        <linearGradient id="diamond-light" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E1F5FE" />
        </linearGradient>
      </defs>

      {/* Complete diamond outline - seamless */}
      <path
        d="M12 2 L20 8 L12 22 L4 8 Z"
        fill="url(#diamond-main)"
        stroke="none"
      />

      {/* Left crown facet - overlapping edges for no gaps */}
      <path
        d="M12 2 L4 8 L8 5 Z"
        fill="url(#diamond-light)"
        opacity="0.8"
      />

      {/* Right crown facet */}
      <path
        d="M12 2 L20 8 L16 5 Z"
        fill="url(#diamond-dark)"
        opacity="0.6"
      />

      {/* Left pavilion facet */}
      <path
        d="M4 8 L12 22 L8 12 Z"
        fill="url(#diamond-dark)"
        opacity="0.7"
      />

      {/* Right pavilion facet */}
      <path
        d="M20 8 L12 22 L16 12 Z"
        fill="url(#diamond-main)"
        opacity="0.9"
      />

      {/* Top table facet - seamless connection */}
      <path
        d="M12 2 L8 5 L16 5 Z"
        fill="url(#diamond-light)"
        opacity="0.9"
      />

      {/* Center vertical highlight */}
      <line
        x1="12"
        y1="2"
        x2="12"
        y2="22"
        stroke="url(#diamond-light)"
        strokeWidth="0.3"
        opacity="0.5"
      />

      {/* Subtle sparkles */}
      <circle
        cx="10"
        cy="6"
        r="0.5"
        fill="#FFFFFF"
        opacity="0.7"
      />
      <circle
        cx="14"
        cy="8"
        r="0.3"
        fill="#FFFFFF"
        opacity="0.6"
      />
    </svg>
  );
}

export default DiamondLogo;