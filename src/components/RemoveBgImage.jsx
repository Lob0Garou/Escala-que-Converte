import React, { useRef, useEffect, useState } from 'react';

const RemoveBgImage = ({ src, alt, className, style }) => {
    const canvasRef = useRef(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const img = new Image();
        img.src = src;
        img.crossOrigin = "Anonymous";

        img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Sample top-left for background color approximation
            const bgR = data[0];
            const bgG = data[1];
            const bgB = data[2];
            const tolerance = 80;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Calculate distance from background color
                const diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);

                // If it's close to red background, make it transparent
                // Also check if it's NOT white text (White is 255,255,255)
                // Red BG is approx 227, 6, 19.
                // Simple heuristic: If it is "reddish" and not "whitish".

                if (diff < tolerance) {
                    data[i + 3] = 0; // Alpha 0
                }
            }

            ctx.putImageData(imageData, 0, 0);
            setLoaded(true);
        };
    }, [src]);

    return (
        <canvas
            ref={canvasRef}
            className={className}
            style={{ ...style, display: loaded ? 'block' : 'none' }}
            title={alt}
        />
    );
};

export default RemoveBgImage;
