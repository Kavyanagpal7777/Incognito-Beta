import React from 'react';
import { motion } from 'motion/react';
import logoImg from '../assets/images/incognito_logo_1784716163228.jpg';

interface IncognitoLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'auth-hero';
  showText?: boolean;
  className?: string;
  animated?: boolean;
  tiltX?: number;
  tiltY?: number;
  subTagline?: string;
}

export default function IncognitoLogo({
  size = 'md',
  showText = false,
  className = '',
  animated = true,
  tiltX = 0,
  tiltY = 0,
  subTagline = "Anonymous. Honest. Unfiltered.",
}: IncognitoLogoProps) {
  const sizeMap = {
    sm: { container: 'w-10 h-10 rounded-xl', img: 'w-8 h-8', text: 'text-sm', subtext: 'text-[8px]' },
    md: { container: 'w-16 h-16 rounded-2xl', img: 'w-13 h-13', text: 'text-2xl', subtext: 'text-[10px]' },
    lg: { container: 'w-28 h-28 rounded-3xl', img: 'w-24 h-24', text: 'text-4xl md:text-5xl', subtext: 'text-xs' },
    xl: { container: 'w-36 h-36 rounded-[36px]', img: 'w-32 h-32', text: 'text-6xl', subtext: 'text-sm' },
    'auth-hero': {
      container: 'w-[76px] h-[76px] md:w-[96px] md:h-[96px] lg:w-28 lg:h-28 rounded-2xl md:rounded-3xl',
      img: 'w-[64px] h-[64px] md:w-[82px] md:h-[82px] lg:w-24 lg:h-24',
      text: 'text-[32px] md:text-[40px] lg:text-5xl',
      subtext: 'text-[14px] lg:text-sm'
    }
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-4 select-none ${className}`}>
      {/* Animated Logo Shield Container with Mouse Tilt */}
      <motion.div
        className="relative flex items-center justify-center cursor-pointer"
        style={{
          rotateX: tiltY * 15,
          rotateY: tiltX * 15,
        }}
        animate={
          animated
            ? {
                y: [-4, 4, -4],
              }
            : {}
        }
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        whileHover={animated ? { scale: 1.08 } : {}}
        whileTap={animated ? { scale: 0.96 } : {}}
      >
        {/* Soft Breathing Glow Aura */}
        <motion.div
          className="absolute -inset-4 rounded-full bg-gradient-to-r from-blue-600/40 via-cyan-500/40 to-sky-400/40 blur-2xl pointer-events-none"
          animate={
            animated
              ? {
                  scale: [0.9, 1.3, 0.9],
                  opacity: [0.4, 0.85, 0.4],
                }
              : {}
          }
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Rotating Neon Orbit Ring Behind Logo */}
        <motion.div
          className="absolute -inset-3 rounded-full border border-dashed border-cyan-400/50 pointer-events-none shadow-[0_0_15px_rgba(0,217,255,0.4)]"
          animate={animated ? { rotate: [0, 360] } : {}}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Secondary Outer Counter-Rotating Ring */}
        <motion.div
          className="absolute -inset-1 rounded-full border border-blue-400/30 pointer-events-none"
          animate={animated ? { rotate: [360, 0] } : {}}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Logo Shield Frame */}
        <div
          className={`relative flex items-center justify-center bg-gradient-to-br from-[#070B14] via-[#0D1320] to-[#101827] border border-cyan-400/50 shadow-[0_0_40px_rgba(22,119,255,0.4)] overflow-hidden ${currentSize.container}`}
        >
          {/* Animated Glass Reflection Beam Sweep */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full h-full -skew-x-12 pointer-events-none"
            animate={
              animated
                ? {
                    x: ['-140%', '240%'],
                  }
                : {}
            }
            transition={{
              duration: 3.2,
              repeat: Infinity,
              repeatDelay: 2,
              ease: 'easeInOut',
            }}
          />

          {/* Actual Shield Image Asset */}
          <motion.img
            src={logoImg}
            alt="INCÓGNITO"
            className={`object-cover rounded-2xl relative z-10 transition-transform duration-300 ${currentSize.img}`}
            referrerPolicy="no-referrer"
            animate={
              animated
                ? {
                    scale: [1, 1.04, 1],
                  }
                : {}
            }
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Glass Overlay Accent */}
          <div className="absolute inset-0 rounded-inherit border border-white/20 pointer-events-none z-20" />
        </div>
      </motion.div>

      {/* Brand Title & Tagline */}
      {showText && (
        <div className="flex flex-col text-center md:text-left items-center md:items-start space-y-1">
          {/* Title: INCÓGNITO */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`font-display font-black tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-200 to-blue-400 uppercase drop-shadow-[0_0_20px_rgba(0,217,255,0.6)] ${currentSize.text}`}
          >
            INCÓGNITO
          </motion.h1>

          {/* Animated Letter Spacing & Glow Tagline */}
          <motion.p
            initial={{ opacity: 0, tracking: '0.05em' }}
            animate={{ 
              opacity: [0.7, 1, 0.7],
              letterSpacing: ['0.1em', '0.2em', '0.1em'],
              textShadow: [
                '0 0 10px rgba(0,217,255,0.3)',
                '0 0 20px rgba(0,217,255,0.7)',
                '0 0 10px rgba(0,217,255,0.3)'
              ]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={`text-cyan-300/90 font-medium uppercase ${currentSize.subtext}`}
          >
            "{subTagline}"
          </motion.p>
        </div>
      )}
    </div>
  );
}
