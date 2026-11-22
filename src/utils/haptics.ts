export type HapticStyle = 'light' | 'selection';

const HAPTIC_DURATION_MS: Record<HapticStyle, number> = {
  light: 15,
  selection: 8,
};

function isReducedMotionPreferred(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isMobileTouchDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  const hasCoarsePointer =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  const hasNarrowTouchViewport =
    window.innerWidth < 768 && (navigator.maxTouchPoints ?? 0) > 0;
  return hasCoarsePointer || hasNarrowTouchViewport;
}

export function triggerHaptic(style: HapticStyle = 'light'): void {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
      return;
    }
    if (isReducedMotionPreferred() || !isMobileTouchDevice()) {
      return;
    }
    navigator.vibrate(HAPTIC_DURATION_MS[style]);
  } catch {
    // Fail silently when haptics are blocked or unsupported
  }
}
