/** iOS 27 Liquid Glass Motion Presets — Apple-grade spring physics */

// Core Springs
export const IOS_SPRING_SMOOTH = {
  type: 'spring' as const,
  stiffness: 360,
  damping: 30,
  mass: 0.78,
};

export const IOS_SPRING_SNAPPY = {
  type: 'spring' as const,
  stiffness: 460,
  damping: 32,
  mass: 0.72,
};

export const IOS_SPRING_GENTLE = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 26,
  mass: 0.9,
};

// New iOS 27 Springs
export const IOS_SPRING_BOUNCY = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 18,
  mass: 0.6,
};

export const IOS_SPRING_LIQUID = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 24,
  mass: 0.85,
};

export const IOS_SPRING_SHEET = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 34,
  mass: 0.9,
};

export const IOS_SPRING_MODAL = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 36,
  mass: 0.82,
};

export const IOS_SPRING_MICRO = {
  type: 'spring' as const,
  stiffness: 600,
  damping: 40,
  mass: 0.5,
};

// Interaction States
export const IOS_CARD_HOVER = {
  y: -2,
  transition: IOS_SPRING_SNAPPY,
};

export const IOS_TAP_SCALE = {
  scale: 0.96,
};

export const IOS_TAP_SCALE_SUBTLE = {
  scale: 0.98,
};

export const IOS_TAP_SCALE_DEEP = {
  scale: 0.92,
};

// Glass Card Variants
export const GLASS_CARD_VARIANTS = {
  hidden: { opacity: 0, y: 16, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: IOS_SPRING_LIQUID,
  },
  hover: {
    y: -3,
    scale: 1.01,
    transition: IOS_SPRING_SNAPPY,
  },
  tap: {
    scale: 0.97,
    transition: IOS_SPRING_MICRO,
  },
};

// Stagger Children
export const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

export const STAGGER_ITEM = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: IOS_SPRING_SMOOTH,
  },
};

// Page Transitions
export const PAGE_TRANSITION = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: IOS_SPRING_SMOOTH,
};

// Modal Transitions
export const MODAL_OVERLAY = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

export const MODAL_CONTENT = {
  initial: { opacity: 0, y: 24, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 16, scale: 0.97 },
  transition: IOS_SPRING_MODAL,
};
