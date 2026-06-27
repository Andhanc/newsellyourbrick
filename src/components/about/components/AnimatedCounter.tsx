import { useCounterInView } from '../hooks/useAnimatedCounter';

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  className?: string;
}

export function AnimatedCounter({ value, suffix = '', className }: AnimatedCounterProps) {
  const { ref, display } = useCounterInView(value, suffix);
  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
