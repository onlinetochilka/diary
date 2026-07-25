import React from "react";

export default function Tooltip({ text, children, position = "top" }) {
  const posClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    "top-right": "bottom-full right-0 mb-2",
    "top-left": "bottom-full left-0 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    "bottom-right": "top-full right-0 mt-2",
    "bottom-left": "top-full left-0 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2"
  };

  return (
    <div className="group/tooltip relative flex items-center justify-center">
      {children}
      <div className={`absolute ${posClasses[position]} z-50 pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 scale-95 group-hover/tooltip:scale-100`}>
        <div className="bg-ivory text-stone-600 text-xs font-bold px-3 py-2 rounded-xl shadow-neu-md whitespace-nowrap">
          {text}
        </div>
      </div>
    </div>
  );
}
