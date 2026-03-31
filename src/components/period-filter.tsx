'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { PeriodFilter, DateRange } from '@/lib/types';
import DateRangePicker from '@/components/date-range-picker';

// 기간 필터 프리셋 옵션 정의
const options: { value: PeriodFilter; label: string }[] = [
  { value: '7d', label: '7일' },
  { value: '14d', label: '14일' },
  { value: '30d', label: '30일' },
  { value: 'all', label: '전체' },
];

interface PeriodFilterBarProps {
  value?: PeriodFilter;
  period?: PeriodFilter;
  onChange: (v: PeriodFilter) => void;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange) => void;
}

/**
 * 기간 필터 바
 * 7일 / 14일 / 30일 / 전체 / 사용자 지정 중 하나를 선택할 수 있는 탭 형태의 필터
 * "사용자 지정" 클릭 시 Mixpanel 스타일 DateRangePicker가 열림
 * 각 버튼에 클릭 시 눌리는 스프링 애니메이션 적용
 */
export default function PeriodFilterBar({
  value,
  period,
  onChange,
  dateRange,
  onDateRangeChange,
}: PeriodFilterBarProps) {
  const selected = value ?? period ?? '30d';
  const [pickerOpen, setPickerOpen] = useState(false);

  // 사용자 지정 범위가 활성화되어 있을 때 버튼에 표시할 텍스트
  const customLabel = (() => {
    if (selected === 'custom' && dateRange) {
      const [, sm, sd] = dateRange.start.split('-').map(Number);
      const [, em, ed] = dateRange.end.split('-').map(Number);
      return `${sm}/${sd} - ${em}/${ed}`;
    }
    return '사용자 지정';
  })();

  // 버튼 공통 스프링 트랜지션 설정
  const tapTransition = { type: 'spring' as const, stiffness: 400, damping: 17 };

  return (
    <div className="relative flex gap-1 rounded-lg bg-gray-100 p-1">
      {options.map((opt) => (
        <motion.button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          whileTap={{ scale: 0.95 }}
          transition={tapTransition}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            selected === opt.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {opt.label}
        </motion.button>
      ))}
      {/* 사용자 지정 버튼 */}
      <motion.button
        onClick={() => setPickerOpen(true)}
        whileTap={{ scale: 0.95 }}
        transition={tapTransition}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
          selected === 'custom'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        {customLabel}
      </motion.button>

      {/* 날짜 범위 선택기 (절대 위치 드롭다운) */}
      <DateRangePicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        initialRange={dateRange}
        onApply={(range) => {
          onDateRangeChange?.(range);
          onChange('custom');
        }}
      />
    </div>
  );
}
