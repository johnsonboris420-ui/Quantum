import React from 'react';
import { cn } from "@/lib/utils";

interface SciSliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  formatValue?: (val: number) => string;
}

export function SciSlider({ 
  label, 
  value, 
  min, 
  max, 
  step = 1, 
  onChange, 
  formatValue,
  className,
  ...props 
}: SciSliderProps) {
  const displayVal = formatValue ? formatValue(value) : value.toString();
  
  return (
    <div className={cn("flex flex-col gap-2 w-full", className)}>
      <div className="flex justify-between items-end">
        <label className="text-xs uppercase tracking-widest text-primary/70 font-semibold">
          {label}
        </label>
        <span className="font-mono text-sm text-primary text-glow font-bold">
          {displayVal}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="sci-slider"
        {...props}
      />
    </div>
  );
}
