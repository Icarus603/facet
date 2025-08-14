/**
 * FACET Diamond Logo Component
 * Reusable diamond logo with consistent FACET branding
 */

import React from 'react';

interface FacetLogoProps {
  size?: number;
  className?: string;
  showGlow?: boolean;
}

export function FacetLogo({ size = 128, className = "", showGlow = true }: FacetLogoProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 128 128"
        className={showGlow ? "drop-shadow-lg" : ""}
      >
        <defs>
          {/* FACET brand colors with dramatic depth */}
          <radialGradient id="tableGrad" cx="40%" cy="25%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1"/>
            <stop offset="20%" stopColor="#2C84DB" stopOpacity="0.9"/>
            <stop offset="60%" stopColor="#0580B2"/>
            <stop offset="90%" stopColor="#940011"/>
            <stop offset="100%" stopColor="#132845"/>
          </radialGradient>
          
          <linearGradient id="crownBright" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff"/>
            <stop offset="25%" stopColor="#2C84DB"/>
            <stop offset="75%" stopColor="#0580B2"/>
            <stop offset="100%" stopColor="#132845"/>
          </linearGradient>
          
          <linearGradient id="crownMedium" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95"/>
            <stop offset="30%" stopColor="#2C84DB"/>
            <stop offset="70%" stopColor="#940011"/>
            <stop offset="100%" stopColor="#73001C"/>
          </linearGradient>
          
          <linearGradient id="crownDark" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#0580B2"/>
            <stop offset="40%" stopColor="#132845"/>
            <stop offset="70%" stopColor="#940011"/>
            <stop offset="100%" stopColor="#73001C"/>
          </linearGradient>
          
          <linearGradient id="pavilionBright" x1="0%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#2C84DB"/>
            <stop offset="30%" stopColor="#0580B2"/>
            <stop offset="60%" stopColor="#940011"/>
            <stop offset="100%" stopColor="#73001C"/>
          </linearGradient>
          
          <linearGradient id="pavilionMedium" x1="100%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#0580B2"/>
            <stop offset="25%" stopColor="#132845"/>
            <stop offset="70%" stopColor="#940011"/>
            <stop offset="100%" stopColor="#73001C"/>
          </linearGradient>
          
          <linearGradient id="pavilionDark" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#132845"/>
            <stop offset="40%" stopColor="#940011"/>
            <stop offset="80%" stopColor="#73001C"/>
            <stop offset="100%" stopColor="#73001C"/>
          </linearGradient>
          
          {showGlow && (
            <filter id="diamondGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          )}
        </defs>
        
        {/* Round Brilliant Cut Diamond */}
        <g filter={showGlow ? "url(#diamondGlow)" : undefined}>
        
        {/* BACKGROUND FILL TO ELIMINATE ALL WHITE SPACES */}
        <polygon points="56,38 72,38 96,65 90,72 64,98 38,72 32,65 56,38" fill="#132845"/>
        
        {/* TABLE (top flat surface) */}
        <polygon 
          points="55,38 73,38 75,40 73,42 55,42 53,40" 
          fill="url(#tableGrad)"
        />
        
        {/* CROWN MAIN FACETS */}
        <polygon points="55,38 53,40 45,48 50,45" fill="url(#crownBright)"/>
        <polygon points="73,38 75,40 83,48 78,45" fill="url(#crownMedium)"/>
        <polygon points="75,40 73,42 83,48" fill="url(#crownDark)"/>
        <polygon points="53,40 55,42 45,48" fill="url(#crownBright)"/>
        <polygon points="50,45 45,48 36,58 42,52" fill="url(#crownMedium)"/>
        <polygon points="78,45 83,48 92,58 86,52" fill="url(#crownDark)"/>
        <polygon points="45,48 55,42 64,50 54,52" fill="url(#crownBright)"/>
        <polygon points="83,48 73,42 64,50 74,52" fill="url(#crownMedium)"/>
        
        {/* STAR FACETS */}
        <polygon points="55,38 50,45 54,42" fill="url(#crownBright)" opacity="0.9"/>
        <polygon points="73,38 78,45 74,42" fill="url(#crownMedium)" opacity="0.9"/>
        <polygon points="50,45 42,52 48,48" fill="url(#crownDark)" opacity="0.8"/>
        <polygon points="78,45 86,52 80,48" fill="url(#crownBright)" opacity="0.8"/>
        
        {/* GIRDLE */}
        <ellipse cx="64" cy="58" rx="28" ry="3" fill="#0580B2" opacity="0.7"/>
        
        {/* FILL ALL GAPS */}
        <polygon points="40,56 64,58 92,58 88,56 64,50 40,56" fill="#132845"/>
        <polygon points="36,64 40,72 64,98 64,80 32,65 36,64" fill="#940011"/>
        <polygon points="92,64 96,65 64,80 64,98 88,72 92,64" fill="#73001C"/>
        <polygon points="32,65 38,72 64,98 56,92 48,76 32,65" fill="#940011"/>
        <polygon points="96,65 90,72 72,92 64,98 80,76 96,65" fill="#73001C"/>
        <polygon points="45,48 55,42 64,50 54,52 45,48" fill="#2C84DB"/>
        <polygon points="83,48 74,52 64,50 73,42 83,48" fill="#0580B2"/>
        <polygon points="50,45 42,52 54,52 57,47 50,45" fill="#2C84DB"/>
        <polygon points="78,45 86,52 74,52 71,47 78,45" fill="#0580B2"/>
        
        {/* ADDITIONAL FILL */}
        <polygon points="55,38 53,40 45,48 50,45 55,38" fill="#174875"/>
        <polygon points="73,38 78,45 83,48 75,40 73,38" fill="#174875"/>
        <polygon points="53,40 55,42 45,48 53,40" fill="#0580B2"/>
        <polygon points="75,40 73,42 83,48 75,40" fill="#0580B2"/>
        <polygon points="42,52 36,58 40,56 45,48 42,52" fill="#132845"/>
        <polygon points="86,52 83,48 88,56 92,58 86,52" fill="#132845"/>
        <polygon points="54,80 64,98 58,85 54,80" fill="#73001C"/>
        <polygon points="74,80 70,85 64,98 74,80" fill="#73001C"/>
        <polygon points="48,76 56,92 58,85 54,80 48,76" fill="#940011"/>
        <polygon points="80,76 74,80 70,85 72,92 80,76" fill="#940011"/>
        
        {/* CENTER AREAS */}
        <polygon points="55,42 59,50 69,50 73,42 64,50 55,42" fill="#174875"/>
        <polygon points="57,47 58,49 70,49 71,47 64,50 57,47" fill="#2C84DB"/>
        <polygon points="54,52 58,49 59,50 64,50 69,50 70,49 74,52 64,58 54,52" fill="#0580B2"/>
        <polygon points="64,50 64,58 88,56 83,48 74,52 64,50" fill="#132845"/>
        <polygon points="64,50 54,52 45,48 40,56 64,58 64,50" fill="#132845"/>
        
        {/* PAVILION MAIN FACETS */}
        <polygon points="42,52 36,58 64,98 54,80" fill="url(#pavilionBright)"/>
        <polygon points="86,52 92,58 64,98 74,80" fill="url(#pavilionMedium)"/>
        <polygon points="54,52 64,50 64,98 58,85" fill="url(#pavilionDark)"/>
        <polygon points="74,52 64,50 64,98 70,85" fill="url(#pavilionBright)"/>
        <polygon points="36,58 32,65 64,98 50,88" fill="url(#pavilionMedium)"/>
        <polygon points="92,58 96,65 64,98 78,88" fill="url(#pavilionDark)"/>
        <polygon points="32,65 38,72 64,98 56,92" fill="url(#pavilionBright)"/>
        <polygon points="96,65 90,72 64,98 72,92" fill="url(#pavilionMedium)"/>
        
        {/* PAVILION LOWER GIRDLE FACETS */}
        <polygon points="50,88 54,80 64,98" fill="url(#pavilionDark)" opacity="0.8"/>
        <polygon points="78,88 74,80 64,98" fill="url(#pavilionMedium)" opacity="0.8"/>
        <polygon points="56,92 58,85 64,98" fill="url(#pavilionBright)" opacity="0.7"/>
        <polygon points="72,92 70,85 64,98" fill="url(#pavilionDark)" opacity="0.7"/>
        
        {/* CULET */}
        <circle cx="64" cy="98" r="0.5" fill="#73001C" opacity="0.8"/>
        
        </g>
      </svg>
    </div>
  );
}