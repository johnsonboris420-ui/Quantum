import React from 'react';
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

interface SciButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'danger' | 'ghost';
  active?: boolean;
}

export function SciButton({ 
  children, 
  className, 
  variant = 'primary', 
  active = false,
  ...props 
}: SciButtonProps) {
  
  const variants = {
    primary: "border-primary/50 text-primary hover:bg-primary/10 hover:border-primary hover:shadow-[0_0_15px_rgba(0,255,204,0.3)]",
    danger: "border-accent/50 text-accent hover:bg-accent/10 hover:border-accent hover:shadow-[0_0_15px_rgba(255,0,85,0.3)]",
    ghost: "border-transparent text-foreground/70 hover:text-primary hover:bg-primary/5"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative px-4 py-2 text-sm font-semibold uppercase tracking-widest border transition-colors duration-300",
        variants[variant],
        active && (variant === 'primary' ? "bg-primary/20 border-primary text-glow shadow-[inset_0_0_10px_rgba(0,255,204,0.2)]" : ""),
        className
      )}
      {...props}
    >
      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-current opacity-50" />
      <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-current opacity-50" />
      
      {children}
    </motion.button>
  );
}
