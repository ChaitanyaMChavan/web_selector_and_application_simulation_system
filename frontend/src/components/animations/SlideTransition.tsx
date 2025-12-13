"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

interface SlideTransitionProps {
  children: ReactNode;
  direction?: "left" | "right";
  keyProp: string | number;
  className?: string;
}

export function SlideTransition({
  children,
  direction = "right",
  keyProp,
  className,
}: SlideTransitionProps) {
  const variants = {
    enter: (direction: string) => ({
      x: direction === "right" ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: string) => ({
      x: direction === "right" ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={keyProp}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          x: { type: "spring", stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

