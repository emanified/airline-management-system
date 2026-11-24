import React, { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Custom Hooks
import useParticles from "../hooks/useParticles";
import useInView from "../hooks/useInView"; // For scroll animations

// Components
import Header from "../components/Header";
import FeatureCard from "../components/FeatureCard";

// Styles
import "../styles/home.css";
import "../styles/Footer.css";

const featuresData = [
  { id: 1, icon: "✈️", title: "Quick & Easy Booking", desc: "Book flights quickly with our streamlined process." },
  { id: 2, icon: "🛰️", title: "Flight Tracking", desc: "Keep track of your flights and schedule updates." },
  { id: 3, icon: "💰", title: "Lowest Prices", desc: "We find the cheapest tickets, so you can wander for less.." },
];

const showcaseImages = [
  { id: 1, src: "download1.jpg"},
  { id: 2, src: "download2.jpeg"}
];

export default function Home() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Check if user is logged in
  const userToken = localStorage.getItem("userToken");
  const adminToken = localStorage.getItem("adminToken");
  const username = localStorage.getItem("username");
  const isLoggedIn = !!userToken || !!adminToken;

  // Get the ref from the particle hook
  const canvasRef = useParticles();

  // Setup Ref and useInView hook for the Showcase section
  const showcaseRef = useRef();
  const showcaseInView = useInView(showcaseRef, { threshold: 0.2 });

  // Auto-advance slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % showcaseImages.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % showcaseImages.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + showcaseImages.length) % showcaseImages.length);
  };

  const handleLogin = (role) => {
    navigate("/auth", { state: { role } });
  };

  return (
    <div className="home-container">
      {/* Header */}
      <Header />

      {/* HERO SECTION WITH PARTICLES */}
      <section className="hero">
        <canvas ref={canvasRef} className="hero-canvas"></canvas>
        <h1>Aether Airlines</h1>
        <p>Manage your bookings and flights easily</p>

        {/* Show username greeting if logged in, otherwise show login button */}
        <div className="home-buttons">
          {isLoggedIn && username ? (
            <div className="username-hero-greeting">Hi, {username}</div>
          ) : (
            <button onClick={() => handleLogin("user")}>Login / Signup</button>
          )}
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="features" id="features">
        <h2>Our Features</h2>
        <div className="feature-cards">
          {featuresData.map(f => (
            <FeatureCard
              key={f.id}
              icon={f.icon}
              title={f.title}
              description={f.desc}
            />
          ))}
        </div>
      </section>

      {/* SHOWCASE SECTION */}
      <section className={`showcase-section ${showcaseInView ? 'in-view' : ''}`} ref={showcaseRef}>
        <div className="showcase-content">
          <div className="showcase-slideshow">
            <div className="slideshow-container">
              <div className="slideshow-wrapper">
                {showcaseImages.map((image, index) => (
                  <div
                    key={image.id}
                    className={`slide ${index === currentSlide ? 'active' : ''} ${showcaseInView ? 'in-view' : ''}`}
                  >
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="showcase-image"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Slide indicators */}
            <div className="slideshow-indicators">
              {showcaseImages.map((_, index) => (
                <button
                  key={index}
                  className={`indicator ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => goToSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="showcase-text">
            <h2>Your Journey, Simplified</h2>
            <p>
              Experience seamless travel planning with our intuitive booking system. 
              From flight selection to check-in, we make every step of your journey effortless and enjoyable.
            </p>
          </div>
        </div>
      </section>

      {/* CONTACT SECTION */}
      <section className="contact" id="contact">
        <h2>Contact Us</h2>
        <p>Email: emanshaikh999@gmail.com</p>
        <p>Phone: +92 300 1234567</p>
        <p>Address: 123 Airline Street, Karachi, Pakistan</p>

        {/* Admin button at bottom with SAME styling */}
        <div className="home-buttons admin-bottom-button">
          <button onClick={() => handleLogin("admin")}>Admin</button>
        </div>

      </section>

    </div>
  );
}
