import { useState, useCallback } from 'react';

/**
 * Custom hook to generate 3D tilt (parallax) effect on mouse movement.
 * This hook is used to give elements like the Auth Card a premium, interactive feel.
 * @param {number} maxTilt - The maximum rotation angle (in degrees) for the tilt effect.
 * @param {number} perspective - The depth of the 3D space (in pixels).
 * @returns {{ style: object, handleMouseMove: function, handleMouseLeave: function }}
 */
const useTiltEffect = (maxTilt = 5, perspective = 1000) => {
  // State to hold the dynamic CSS transform style
  const [style, setStyle] = useState({});

  /**
   * Calculates rotation (Rx, Ry) based on mouse position (e) within the element.
   */
  const handleMouseMove = useCallback((e) => {
    // Get the element's position and size
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Calculate mouse position relative to the element center (0, 0)
    const x = e.clientX - rect.left; 
    const y = e.clientY - rect.top; 

    const centerX = width / 2;
    const centerY = height / 2;

    const deltaX = (x - centerX) / width; // Normalized X (-0.5 to 0.5)
    const deltaY = (y - centerY) / height; // Normalized Y (-0.5 to 0.5)

    // Calculate rotation angles
    // Note: Rotation X is controlled by the Y position, and vice-versa.
    // We reverse the X rotation (multiply by -1) for standard UI tilt perspective.
    const rotateX = deltaY * maxTilt * -1;
    const rotateY = deltaX * maxTilt;

    setStyle({
      transform: `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`,
      transition: 'transform 0.1s ease-out', // Keep transitions fast while moving
      willChange: 'transform',
    });
  }, [maxTilt, perspective]);

  /**
   * Resets the tilt when the mouse leaves the element.
   */
  const handleMouseLeave = useCallback(() => {
    setStyle({
      transform: `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale(1)`,
      // Smooth, slow transition back to the original state
      transition: 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)', 
    });
  }, [perspective]);

  return { style, handleMouseMove, handleMouseLeave };
};

export default useTiltEffect;