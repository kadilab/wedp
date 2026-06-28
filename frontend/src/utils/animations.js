// Per-element animations for design elements, played ONLY on the public
// invitation view (InvitationView). The editor stays static (WYSIWYG layout).
//
// An element carries an optional `animation` object:
//   { in: <entrance>, loop: <loop>, duration: <s>, delay: <s> }
// Missing animation, or in/loop === 'none', means "render statically".

export const ENTRANCE_OPTIONS = [
  { value: 'none', label: 'Aucune' },
  { value: 'fade', label: 'Fondu' },
  { value: 'slide-up', label: 'Glisser ↑' },
  { value: 'slide-down', label: 'Glisser ↓' },
  { value: 'slide-left', label: 'Glisser ←' },
  { value: 'slide-right', label: 'Glisser →' },
  { value: 'zoom-in', label: 'Zoom avant' },
  { value: 'zoom-out', label: 'Zoom arrière' },
  { value: 'flip', label: 'Retournement' },
  { value: 'rotate-in', label: 'Rotation' }
]

export const LOOP_OPTIONS = [
  { value: 'none', label: 'Aucune' },
  { value: 'pulse', label: 'Pulsation' },
  { value: 'float', label: 'Flottement' },
  { value: 'sway', label: 'Balancement' },
  { value: 'heartbeat', label: 'Battement de cœur' },
  { value: 'shimmer', label: 'Scintillement' },
  { value: 'bounce', label: 'Rebond' }
]

export const DEFAULT_ANIMATION = { in: 'none', loop: 'none', duration: 0.8, delay: 0 }

// Initial (hidden) state for each entrance, animating to the resting identity.
const ENTRANCE_INITIAL = {
  fade: { opacity: 0 },
  'slide-up': { opacity: 0, y: 40 },
  'slide-down': { opacity: 0, y: -40 },
  'slide-left': { opacity: 0, x: 40 },
  'slide-right': { opacity: 0, x: -40 },
  'zoom-in': { opacity: 0, scale: 0.6 },
  'zoom-out': { opacity: 0, scale: 1.4 },
  flip: { opacity: 0, rotateY: 90 },
  'rotate-in': { opacity: 0, rotate: -25, scale: 0.8 }
}

const hasEntrance = (a) => a && a.in && a.in !== 'none' && ENTRANCE_INITIAL[a.in]
const hasLoop = (a) => a && a.loop && a.loop !== 'none'

export const isAnimated = (a) => Boolean(hasEntrance(a) || hasLoop(a))

// Framer-motion props for the entrance (played once on mount). Returns null
// when there is no entrance so callers can skip the wrapper entirely.
export function getEntranceMotion(a) {
  if (!hasEntrance(a)) return null
  const initial = ENTRANCE_INITIAL[a.in]
  const target = { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, rotateY: 0 }
  // Only animate the axes the entrance actually touches.
  const animate = Object.fromEntries(Object.keys(initial).map((k) => [k, target[k]]))
  return {
    initial,
    animate,
    transition: {
      duration: Number(a.duration) > 0 ? Number(a.duration) : 0.8,
      delay: Number(a.delay) > 0 ? Number(a.delay) : 0,
      ease: 'easeOut'
    }
  }
}

// Keyframes for the continuous loop. Starts after the entrance finishes.
const LOOP_KEYFRAMES = {
  pulse: { animate: { scale: [1, 1.06, 1] }, duration: 2 },
  float: { animate: { y: [0, -10, 0] }, duration: 3 },
  sway: { animate: { rotate: [-3, 3, -3] }, duration: 4 },
  heartbeat: { animate: { scale: [1, 1.12, 1, 1.12, 1] }, duration: 1.6 },
  shimmer: { animate: { opacity: [1, 0.55, 1] }, duration: 2.4 },
  bounce: { animate: { y: [0, -16, 0] }, duration: 1.4 }
}

// Framer-motion props for the looping animation. Returns null when none.
export function getLoopMotion(a) {
  if (!hasLoop(a)) return null
  const spec = LOOP_KEYFRAMES[a.loop]
  if (!spec) return null
  // Delay the loop until the entrance has played, so they don't fight.
  const startDelay = (Number(a.delay) > 0 ? Number(a.delay) : 0) +
    (hasEntrance(a) ? (Number(a.duration) > 0 ? Number(a.duration) : 0.8) : 0)
  return {
    animate: spec.animate,
    transition: {
      duration: spec.duration,
      delay: startDelay,
      repeat: Infinity,
      repeatType: a.loop === 'sway' || a.loop === 'pulse' || a.loop === 'float' ? 'mirror' : 'loop',
      ease: 'easeInOut'
    }
  }
}
