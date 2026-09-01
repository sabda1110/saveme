"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Wifi } from "lucide-react";

export function Card3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 8, y: -12 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0.3 });
  const [isHovered, setIsHovered] = useState(false);

  // Smooth mouse tilt handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Max tilt 22 degrees
    const rotateX = ((y - centerY) / centerY) * -18;
    const rotateY = ((x - centerX) / centerX) * 22;

    // Glare position in percent
    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setRotate({ x: rotateX, y: rotateY });
    setGlare({ x: glareX, y: glareY, opacity: 0.55 });
  }, []);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // Return to elegant default 3D pose
    setRotate({ x: 8, y: -12 });
    setGlare({ x: 50, y: 50, opacity: 0.25 });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-[420px] aspect-[1.586/1] cursor-pointer select-none"
      style={{ perspective: 1200 }}
    >
      {/* Floating Parallax Coin 1 (Top Left) */}
      <div
        className="absolute -top-6 -left-6 z-20 w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-200 p-[2px] shadow-xl shadow-amber-500/20 animate-bounce pointer-events-none"
        style={{
          transform: `translate3d(${rotate.y * -0.8}px, ${rotate.x * 0.8}px, 60px)`,
          transition: isHovered
            ? "transform 0.1s ease-out"
            : "transform 0.6s ease-out",
          animationDuration: "4s",
        }}
      >
        <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center border border-amber-200 text-slate-950 font-black text-sm shadow-inner">
          <span className="drop-shadow-xs">Rp</span>
        </div>
      </div>

      {/* Floating Parallax Coin 2 (Bottom Right) */}
      <div
        className="absolute -bottom-8 -right-4 z-20 w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-300 to-emerald-200 p-[2px] shadow-xl shadow-emerald-500/30 animate-bounce pointer-events-none"
        style={{
          transform: `translate3d(${rotate.y * 1.1}px, ${rotate.x * -1.1}px, 80px)`,
          transition: isHovered
            ? "transform 0.1s ease-out"
            : "transform 0.6s ease-out",
          animationDuration: "5s",
          animationDelay: "1s",
        }}
      >
        <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 flex items-center justify-center border border-emerald-300/40 text-emerald-100 font-black text-xs shadow-inner">
          <span>TABUNGAN</span>
        </div>
      </div>

      {/* Floating Parallax Floating Tag (Top Right) */}
      <div
        className="absolute -top-5 -right-2 z-20 px-3.5 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-lg text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pointer-events-none"
        style={{
          transform: `translate3d(${rotate.y * 0.6}px, ${rotate.x * 0.6}px, 45px)`,
          transition: isHovered
            ? "transform 0.1s ease-out"
            : "transform 0.6s ease-out",
        }}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        <span>Saldo Real-Time Aktif</span>
      </div>

      {/* Main 3D Card Object */}
      <div
        className="relative w-full h-full rounded-[24px] overflow-hidden p-6 sm:p-7 flex flex-col justify-between text-white shadow-2xl transition-all duration-200 ease-out"
        style={{
          transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) translateZ(${isHovered ? "25px" : "0px"})`,
          transformStyle: "preserve-3d",
          boxShadow: isHovered
            ? "0 30px 60px -12px rgba(5, 150, 105, 0.4), 0 18px 36px -18px rgba(0, 0, 0, 0.6)"
            : "0 25px 50px -12px rgba(5, 150, 105, 0.25), 0 12px 24px -12px rgba(0, 0, 0, 0.5)",
          background:
            "linear-gradient(135deg, #064e3b 0%, #065f46 35%, #0f172a 75%, #022c22 100%)",
          border: "1px solid rgba(255, 255, 255, 0.18)",
        }}
      >
        {/* Subtle Brushed Titanium / Carbon Fiber Texture */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)`,
            backgroundSize: "16px 16px",
            backgroundPosition: "0 0, 8px 8px",
          }}
        />

        {/* Dynamic Specular Light Glare Layer */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity}) 0%, rgba(255,255,255,0) 65%)`,
          }}
        />

        {/* Iridescent Rainbow Foil Sheen across bottom edge */}
        <div
          className="absolute -inset-[100%] opacity-20 pointer-events-none"
          style={{
            background: `linear-gradient(${rotate.y * 3 + 45}deg, transparent 40%, rgba(255, 180, 200, 0.4) 48%, rgba(200, 255, 255, 0.6) 52%, rgba(255, 255, 180, 0.4) 56%, transparent 64%)`,
          }}
        />

        {/* Card Header */}
        <div
          className="relative z-10 flex items-center justify-between"
          style={{ transform: "translateZ(30px)" }}
        >
          {/* Brand Mark */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-200 p-[1.5px] shadow-md">
              <div className="w-full h-full rounded-[10px] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center font-black text-emerald-400 text-xs">
                S
              </div>
            </div>
            <div>
              <span className="font-black text-lg tracking-tight leading-none text-white block">
                Save<span className="text-emerald-400">Me</span>
              </span>
              <span className="text-[8px] tracking-[0.2em] font-semibold text-emerald-300/80 uppercase">
                Emerald Elite
              </span>
            </div>
          </div>

          {/* Contactless Icon */}
          <div className="flex items-center gap-2 text-white/80">
            <Wifi className="w-5 h-5 rotate-90 stroke-[2.2] drop-shadow-xs" />
          </div>
        </div>

        {/* Card Chip & Hologram Row */}
        <div
          className="relative z-10 flex items-center justify-between my-auto pt-2"
          style={{ transform: "translateZ(40px)" }}
        >
          {/* Gold EMV Chip */}
          <div className="w-12 h-9 rounded-lg bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 p-[1px] shadow-md shadow-amber-900/40 relative overflow-hidden">
            <div className="w-full h-full rounded-[7px] bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-500 relative flex items-center justify-center">
              {/* Chip Circuit Etchings */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-amber-700/60" />
              <div className="absolute inset-y-0 left-1/3 w-[1px] bg-amber-700/60" />
              <div className="absolute inset-y-0 right-1/3 w-[1px] bg-amber-700/60" />
              <div className="w-3.5 h-3.5 rounded-sm border border-amber-800/60 bg-yellow-400/80" />
            </div>
          </div>

          {/* Holographic Security Foil Emblem */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-300 via-purple-300 to-pink-300 p-[1.5px] opacity-85 shadow-inner">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center text-[8px] font-black text-emerald-300 tracking-tighter">
              100% SECURE
            </div>
          </div>
        </div>

        {/* Card Number & Holder Info */}
        <div
          className="relative z-10 flex flex-col gap-2.5"
          style={{ transform: "translateZ(35px)" }}
        >
          {/* Embossed Card Number */}
          <div className="font-mono text-base sm:text-lg font-bold tracking-[0.2em] text-white/95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            •••• 4821 9012 3456
          </div>

          <div className="flex items-end justify-between text-xs">
            <div>
              <p className="text-[8px] font-semibold tracking-widest text-emerald-300/80 uppercase">
                Cardholder
              </p>
              <p className="font-mono font-bold tracking-wider text-white text-xs sm:text-sm uppercase drop-shadow-xs">
                REYHAN FAHREZA
              </p>
            </div>

            <div className="text-right">
              <p className="text-[8px] font-semibold tracking-widest text-emerald-300/80 uppercase">
                Valid Thru
              </p>
              <p className="font-mono font-bold tracking-wider text-white/90 text-xs">
                12/29
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
