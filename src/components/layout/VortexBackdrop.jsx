import React from 'react';

const VortexBackdrop = ({
  fixed = true,
  className = '',
  imageClassName = '',
  overlayClassName = '',
  accentClassName = '',
}) => {
  const positionClassName = fixed ? 'fixed inset-0' : 'absolute inset-0';

  return (
    <div className={`pointer-events-none ${positionClassName} ${className}`} aria-hidden="true">
      <div
        className={`absolute inset-0 bg-[url('/backgrounds/vortex.gif')] bg-cover bg-center bg-no-repeat ${fixed ? 'bg-fixed' : ''} ${imageClassName}`}
      />
      {overlayClassName ? <div className={`absolute inset-0 ${overlayClassName}`} /> : null}
      {accentClassName ? <div className={`absolute inset-0 ${accentClassName}`} /> : null}
    </div>
  );
};

export default VortexBackdrop;
