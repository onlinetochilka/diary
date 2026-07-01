import React from "react";

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-[#FAFAF9] flex flex-col items-center justify-center z-[9999]">
      <div className="flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-sm mb-6 relative p-3">
        {/* Pulsing ring */}
        <div className="absolute inset-0 rounded-2xl bg-teal-400 animate-ping opacity-20" />
        <img src="https://raw.githubusercontent.com/onlinetochilka/theme/main/tochilka-logo.svg" alt="Точилка" className="w-full h-full object-contain" />
      </div>
      <h1 className="text-xl font-bold text-stone-800 tracking-tight animate-pulse">
        Точилка
      </h1>
    </div>
  );
}
