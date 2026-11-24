import { useState, useEffect } from 'react';

const useInView = (ref, options = { threshold: 0.1 }) => {
  const [isIntersecting, setIntersecting] = useState(false);

  useEffect(() => {
    // 1. Check if the element ref is available
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      // 2. Update state when the element visibility changes
      setIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(ref.current);

    // 3. Cleanup: Stop observing when the component unmounts
    return () => {
      // Check ref.current again before unobserving
      if (ref.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        observer.unobserve(ref.current);
      }
    };
  // The effect depends on the ref and options
  }, [ref, options]); 

  return isIntersecting;
};

export default useInView;