'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  /** 숫자를 원하는 형식으로 변환하는 포맷 함수 (예: 달러, K/M 단위 등) */
  format?: (n: number) => string;
  className?: string;
}

/**
 * 숫자가 변경될 때 스프링 애니메이션으로 카운팅 효과를 보여주는 컴포넌트
 * 예: 1000 → 2000 으로 값이 바뀌면 숫자가 부드럽게 올라감
 */
export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  // 스프링 물리 기반 애니메이션 (stiffness: 탄성, damping: 감쇠)
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  // 스프링 값을 포맷된 문자열로 변환
  const display = useTransform(spring, (v) =>
    format ? format(v) : Math.round(v).toLocaleString()
  );
  const [displayValue, setDisplayValue] = useState(
    format ? format(value) : value.toLocaleString()
  );

  useEffect(() => {
    spring.set(value);
    const unsubscribe = display.on('change', (v) => setDisplayValue(v));
    return () => unsubscribe();
  }, [value, spring, display]);

  return (
    <motion.span className={className} layout>
      {displayValue}
    </motion.span>
  );
}
