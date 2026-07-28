import { useEffect, useState } from 'react';
import { useInView } from './useInView';

interface UseAnimatedCounterOptions {
  duration?: number;
  decimals?: number;
}

export function useAnimatedCounter(
  target: number,
  enabled: boolean,
  { duration = 1800, decimals = 0 }: UseAnimatedCounterOptions = {},
) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Number((target * eased).toFixed(decimals)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, enabled, duration, decimals]);

  return value;
}

export function useCounterInView(target: number, suffix = '') {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.35 });
  const value = useAnimatedCounter(target, inView);
  return { ref, display: `${value}${suffix}` };
}
