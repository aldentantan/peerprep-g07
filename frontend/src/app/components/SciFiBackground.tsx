import { useMemo } from "react";

export function SciFiBackground() {
  const stars = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        id: i,
        w: Math.random() * 2.5 + 0.5,
        top: Math.random() * 100,
        left: Math.random() * 100,
        blur: Math.random() * 1.2,
        delay: Math.random() * 4,
      })),
    []
  );

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      {/* Dark gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0e1a] via-[#101530] to-[#0d1025]" />
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(120,160,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(120,160,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      {/* Glowing orbs */}
      <div className="absolute top-[20%] left-[10%] w-72 h-72 bg-sky-500/8 rounded-full blur-[100px]" />
      <div className="absolute bottom-[15%] right-[15%] w-96 h-96 bg-indigo-500/8 rounded-full blur-[120px]" />
      <div className="absolute top-[60%] left-[50%] w-48 h-48 bg-violet-500/8 rounded-full blur-[80px]" />
      {/* Stars */}
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white animate-pulse"
          style={{
            width: s.w,
            height: s.w,
            top: `${s.top}%`,
            left: `${s.left}%`,
            filter: `blur(${s.blur}px)`,
            animationDelay: `${s.delay}s`,
            animationDuration: "3s",
          }}
        />
      ))}
    </div>
  );
}
