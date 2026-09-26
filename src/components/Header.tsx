import React from 'react';

interface HeaderProps {
  onLogoClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogoClick }) => {
  return (
    <header className="w-full border-b border-neutral-200/80 bg-[#FAF9F5]/90 backdrop-blur-md sticky top-0 z-30 transition-all">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button
          onClick={onLogoClick}
          className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 rounded-lg p-1 cursor-pointer"
        >
          <img
            src="/logo.png"
            alt="BrandMotion AI Logo"
            className="w-8 h-8 object-contain group-hover:scale-105 transition-transform duration-200"
          />
          <div className="flex flex-col text-left">
            <span className="font-extrabold text-base tracking-tight text-neutral-900 font-sans flex items-center gap-1.5">
              BrandMotion AI
              <span className="text-[10px] uppercase tracking-wider bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-semibold border border-neutral-200">
                MVP
              </span>
            </span>
          </div>
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-neutral-500 bg-neutral-100/80 px-2.5 py-1 rounded-full border border-neutral-200/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Livepeer AI Ready
          </div>
        </div>
      </div>
    </header>
  );
};
