import React, { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'motion/react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  alpha: number;
  color: string;
}

interface InteractiveAtmosphereProps {
  children: React.ReactNode;
  onMouseMoveCoords?: (coords: { x: number; y: number; normalizedX: number; normalizedY: number }) => void;
}

export default function InteractiveAtmosphere({ children, onMouseMoveCoords }: InteractiveAtmosphereProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Spring cursor coordinates for ultra-smooth glow
  const cursorX = useMotionValue(-200);
  const cursorY = useMotionValue(-200);

  const springConfig = { damping: 25, stiffness: 150 };
  const smoothX = useSpring(cursorX, springConfig);
  const smoothY = useSpring(cursorY, springConfig);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0, normalizedX: 0, normalizedY: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      cursorX.set(clientX);
      cursorY.set(clientY);

      const normX = (clientX / window.innerWidth) * 2 - 1;
      const normY = (clientY / window.innerHeight) * 2 - 1;

      const coords = { x: clientX, y: clientY, normalizedX: normX, normalizedY: normY };
      setMousePos(coords);
      if (onMouseMoveCoords) {
        onMouseMoveCoords(coords);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [cursorX, cursorY, onMouseMoveCoords]);

  // Floating particles canvas engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Color palette for tiny glowing particles
    const colors = ['#00D9FF', '#33E5FF', '#1677FF', '#2388FF', '#38BDF8'];

    const particleCount = Math.min(Math.floor(window.innerWidth / 25), 45);
    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.2 + 0.8,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: (Math.random() - 0.5) * 0.4 - 0.15, // slight upward float
      alpha: Math.random() * 0.6 + 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        // Wrap around edges
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Subtle repulsion from cursor
        const dx = mousePos.x - p.x;
        const dy = mousePos.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const angle = Math.atan2(dy, dx);
          p.x -= Math.cos(angle) * 0.8;
          p.y -= Math.sin(angle) * 0.8;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mousePos]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050811] text-white selection:bg-cyan-500/30 selection:text-cyan-200 font-sans">
      
      {/* 1. ANIMATED AURORA & MESH GRADIENT BACKDROP */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Dark Base Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#060a14] via-[#091122] to-[#04060c]" />

        {/* Floating Moving Mesh Blobs */}
        <motion.div
          className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] max-w-[700px] max-h-[700px] rounded-full bg-gradient-to-r from-blue-700/25 via-cyan-600/20 to-teal-800/20 blur-[130px]"
          animate={{
            x: [0, 40, -30, 0],
            y: [0, -30, 40, 0],
            scale: [1, 1.12, 0.95, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <motion.div
          className="absolute -bottom-[20%] -right-[10%] w-[55vw] h-[55vw] max-w-[800px] max-h-[800px] rounded-full bg-gradient-to-tl from-cyan-700/25 via-blue-800/20 to-sky-900/15 blur-[140px]"
          animate={{
            x: [0, -50, 30, 0],
            y: [0, 40, -40, 0],
            scale: [1, 1.08, 0.92, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <motion.div
          className="absolute top-[35%] left-[25%] w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] rounded-full bg-gradient-to-tr from-teal-600/15 via-cyan-500/15 to-blue-500/10 blur-[120px]"
          animate={{
            x: [0, 60, -40, 0],
            y: [0, 50, -30, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Soft Radial Glow Center */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,217,255,0.06)_0%,transparent_70%)]" />

        {/* Subtle Noise Texture Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.035] mix-blend-overlay pointer-events-none" 
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
          }}
        />
      </div>

      {/* 2. GLOWING PARTICLES CANVAS */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-[1] pointer-events-none opacity-80"
      />

      {/* 3. SMOOTH CURSOR FOLLOW GLOW ORB */}
      <motion.div
        className="fixed w-96 h-96 -ml-48 -mt-48 rounded-full bg-gradient-to-r from-blue-500/15 via-cyan-500/12 to-teal-500/10 blur-[80px] pointer-events-none z-[2]"
        style={{
          x: smoothX,
          y: smoothY,
        }}
      />

      {/* 4. MAIN CONTENT CONTAINER */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
}
