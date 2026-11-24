import React from 'react';
import useTiltEffect from '../hooks/useTiltEffect';
import '../styles/home.css'; 

const FeatureCard = ({ icon, title, description }) => {
  // Use the custom hook for the 3D effect. Max tilt 5 degrees, perspective 800px.
  const { style, handleMouseMove, handleMouseLeave } = useTiltEffect(5, 800);

  return (
    <div
      className="feature-card"
      // Apply the dynamic style and event handlers
      style={style} 
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <span className="icon" style={{ fontSize: '48px', display: 'block', marginBottom: '20px' }}>{icon}</span> 
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
};

export default FeatureCard;