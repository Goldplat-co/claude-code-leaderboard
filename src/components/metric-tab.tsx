'use client';

import { motion } from 'framer-motion';
import type { MetricTab } from '@/lib/types';

// 지표 탭 옵션 정의
const tabs: { value: MetricTab; label: string }[] = [
  { value: 'tokens', label: '토큰' },
  { value: 'cost', label: '비용($)' },
  { value: 'sessions', label: '세션 수' },
];

interface MetricTabBarProps {
  value?: MetricTab;
  metric?: MetricTab;
  onChange: (v: MetricTab) => void;
}

/**
 * 지표 탭 바
 * 토큰 / 비용($) / 세션 수 중 하나를 선택하여 순위 기준을 변경
 * value 또는 metric prop 둘 다 지원 (호환성)
 * 활성 탭 인디케이터가 탭 사이를 부드럽게 슬라이딩
 */
export default function MetricTabBar({ value, metric, onChange }: MetricTabBarProps) {
  const selected = value ?? metric ?? 'tokens';
  return (
    <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
      {tabs.map((tab) => (
        <motion.button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          whileTap={{ scale: 0.95 }}
          className={`relative px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            selected === tab.value
              ? 'text-gray-900'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {/* 활성 탭 배경 인디케이터 (탭 간 부드럽게 슬라이딩) */}
          {selected === tab.value && (
            <motion.div
              layoutId="metric-indicator"
              className="absolute inset-0 bg-white rounded-md shadow-sm"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          {/* 텍스트를 인디케이터 위에 표시 */}
          <span className="relative z-10">{tab.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
