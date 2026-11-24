import React, { useState, useEffect } from "react";
import "./LoadingAnimation.css";

const LoadingAnimation = ({ onComplete, isLoading = true, minDuration = 1500 }) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);
  const [startTime] = useState(Date.now());

  // Update progress continuously while loading
  useEffect(() => {
    if (!isLoading && progress < 100) {
      // If loading is done but progress isn't 100%, quickly finish it
      setProgress(100);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const minProgress = Math.min(100, (elapsed / minDuration) * 100);
      
      setProgress((prev) => {
        // Progress should be at least the minimum based on time, but can go faster if loading takes longer
        return Math.max(prev, minProgress);
      });
    }, 16); // ~60fps updates

    return () => clearInterval(interval);
  }, [isLoading, startTime, minDuration, progress]);

  // Handle exit transition when loading is complete
  useEffect(() => {
    if (!isLoading && progress >= 100) {
      setIsExiting(true);
      // Wait for fade out animation to complete, then unmount
      const exitTimer = setTimeout(() => {
        setShouldRender(false);
        if (onComplete) onComplete();
      }, 300); // Match fadeOut animation duration
      return () => clearTimeout(exitTimer);
    }
  }, [isLoading, progress, onComplete]);

  // Don't render if we've finished exiting
  if (!shouldRender) {
    return null;
  }

  return (
    <div className={`loading-overlay ${isExiting ? "exiting" : ""}`}>
      <div className="cloud-container">
        <svg
          className="cloud-svg"
          viewBox="0 0 200 120"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Cloud shape definition */}
          <defs>
            <clipPath id="cloudClip">
              <path
                d="M30,70 
                   Q20,50 40,45 
                   Q45,25 65,25 
                   Q85,10 105,25 
                   Q125,15 145,25 
                   Q165,30 165,50 
                   Q185,50 185,70 
                   Q175,90 155,90 
                   Q135,100 115,90 
                   Q95,100 75,90 
                   Q55,100 45,90 
                   Q25,90 25,70 
                   Q25,60 30,60 
                   Q30,55 30,70 Z"
              />
            </clipPath>
          </defs>
          
          {/* Cloud outline/stroke */}
          <path
            className="cloud-outline"
            d="M30,70 
               Q20,50 40,45 
               Q45,25 65,25 
               Q85,10 105,25 
               Q125,15 145,25 
               Q165,30 165,50 
               Q185,50 185,70 
               Q175,90 155,90 
               Q135,100 115,90 
               Q95,100 75,90 
               Q55,100 45,90 
               Q25,90 25,70 
               Q25,60 30,60 
               Q30,55 30,70 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          
          {/* Progress fill rectangle that moves up from bottom to top */}
          <rect
            className="cloud-fill"
            x="0"
            y={120 - (progress / 100) * 120}
            width="200"
            height="120"
            fill="currentColor"
            clipPath="url(#cloudClip)"
            opacity="0.6"
          />
        </svg>
        <p className="loading-text">Loading...</p>
      </div>
    </div>
  );
};

export default LoadingAnimation;
