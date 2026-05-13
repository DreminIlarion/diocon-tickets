import React from 'react';

interface GridBackgroundProps {
  variant?: 'dots' | 'grid' | 'lines';
}

const GridBackground: React.FC<GridBackgroundProps> = ({ variant = 'dots' }) => {
  if (variant === 'dots') {
    return (
      <div
        className="absolute inset-0 opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(128,128,128,0.4) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 100%)',
        }}
      />
    );
  }
  if (variant === 'grid') {
    return (
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(128,128,128,0.5) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(128,128,128,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse 70% 50% at 50% 50%, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 50% at 50% 50%, black 40%, transparent 100%)',
        }}
      />
    );
  }
  return null;
};

export default GridBackground;
