/**
 * Astroquint motion system.
 *
 * Every animation in the app should draw from these tokens so timing feels
 * consistent. The CSS custom properties in globals.css mirror these values
 * for keyframe / view-transition animations.
 *
 * Principles:
 *  - Feedback (press, select) is instant: ≤ 150ms.
 *  - UI entrances are quick: 250–450ms, ease-out ("arrive").
 *  - Exits are faster than entrances so they never compete for attention.
 *  - Ambient motion (orbits, stars) is slow and continuous, never attention-grabbing.
 *  - Nothing the player must wait through to answer a question.
 */

export const duration = {
  instant: 0.1,
  fast: 0.15,
  base: 0.25,
  slow: 0.45,
  scene: 0.7,
} as const;

/** Cubic-bezier curves, shared with CSS (--ease-*). */
export const ease = {
  /** Things arriving on screen. Quick start, long soft settle. */
  arrive: [0.16, 1, 0.3, 1] as const,
  /** Things leaving. Accelerates away. */
  depart: [0.7, 0, 0.84, 0] as const,
  /** Symmetric moves between two on-screen states. */
  move: [0.65, 0, 0.35, 1] as const,
};

export const spring = {
  /** Buttons, toggles, chips. */
  press: { type: "spring", stiffness: 520, damping: 30, mass: 0.6 } as const,
  /** Cards and panels settling into place. */
  settle: { type: "spring", stiffness: 260, damping: 26 } as const,
  /** Pointer-following parallax. Deliberately soft. */
  float: { stiffness: 60, damping: 18, mass: 1 } as const,
};

/** Stagger between siblings in a group entrance. */
export const stagger = {
  tight: 0.05,
  base: 0.08,
} as const;

/** Standard "rise into place" entrance used for headings, cards and CTAs. */
export const riseIn = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.slow, ease: ease.arrive },
  },
} as const;

/**
 * Entrance for the page's largest text (LCP element): slide only, no fade, so
 * the browser can paint it — and count it as contentful — immediately.
 */
export const riseInVisible = {
  hidden: { y: 18 },
  visible: { y: 0, transition: { duration: duration.slow, ease: ease.arrive } },
} as const;

export const staggerChildren = (delayChildren = 0, each: number = stagger.base) => ({
  hidden: {},
  visible: { transition: { delayChildren, staggerChildren: each } },
});

/** Press / hover feedback shared by all interactive surfaces. */
export const pressable = {
  // Scale (not translate) on hover: a lifted element can slide out from under
  // the cursor at its edge and flicker between hover states.
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.96 },
  transition: spring.press,
} as const;
