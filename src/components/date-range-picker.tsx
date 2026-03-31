'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { DateRange } from '@/lib/types';

interface DateRangePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (range: DateRange) => void;
  initialRange?: DateRange;
}

// 프리셋 목록 정의
const PRESETS = [
  { label: '오늘', getValue: () => getPresetRange('today') },
  { label: '어제', getValue: () => getPresetRange('yesterday') },
  { label: '최근 7일', getValue: () => getPresetRange('last7') },
  { label: '최근 14일', getValue: () => getPresetRange('last14') },
  { label: '최근 30일', getValue: () => getPresetRange('last30') },
  { label: '이번 주', getValue: () => getPresetRange('thisWeek') },
  { label: '지난주', getValue: () => getPresetRange('lastWeek') },
  { label: '이번 달', getValue: () => getPresetRange('thisMonth') },
  { label: '지난달', getValue: () => getPresetRange('lastMonth') },
] as const;

/** ISO 날짜 문자열 (YYYY-MM-DD) 생성 */
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 프리셋 키에 따른 날짜 범위 계산 */
function getPresetRange(
  key: 'today' | 'yesterday' | 'last7' | 'last14' | 'last30' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth'
): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (key) {
    case 'today':
      return { start: toDateStr(today), end: toDateStr(today) };
    case 'yesterday': {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return { start: toDateStr(d), end: toDateStr(d) };
    }
    case 'last7': {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      return { start: toDateStr(d), end: toDateStr(today) };
    }
    case 'last14': {
      const d = new Date(today);
      d.setDate(d.getDate() - 13);
      return { start: toDateStr(d), end: toDateStr(today) };
    }
    case 'last30': {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      return { start: toDateStr(d), end: toDateStr(today) };
    }
    case 'thisWeek': {
      // 월요일 시작 기준
      const dayOfWeek = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      return { start: toDateStr(monday), end: toDateStr(today) };
    }
    case 'lastWeek': {
      const dayOfWeek = today.getDay();
      const thisMonday = new Date(today);
      thisMonday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(thisMonday.getDate() - 7);
      const lastSunday = new Date(thisMonday);
      lastSunday.setDate(thisMonday.getDate() - 1);
      return { start: toDateStr(lastMonday), end: toDateStr(lastSunday) };
    }
    case 'thisMonth': {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: toDateStr(first), end: toDateStr(today) };
    }
    case 'lastMonth': {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: toDateStr(first), end: toDateStr(last) };
    }
  }
}

/** 해당 월의 달력 데이터 생성 (6주 × 7일 그리드) */
function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  // 월요일 = 0 기준으로 변환 (JS는 일요일=0)
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  // 앞쪽 빈칸
  for (let i = 0; i < startOffset; i++) cells.push(null);
  // 실제 날짜
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  // 뒤쪽 빈칸 (6주 채우기)
  while (cells.length < 42) cells.push(null);
  return cells;
}

/** 한국어 포맷: "2026년 3월 25일" */
function formatKoreanDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

/**
 * Mixpanel 스타일 날짜 범위 선택기
 * 왼쪽: 프리셋 라디오 버튼 / 오른쪽: 2개월 달력 / 하단: 적용/취소 버튼
 */
export default function DateRangePicker({
  isOpen,
  onClose,
  onApply,
  initialRange,
}: DateRangePickerProps) {
  // 현재 표시 중인 왼쪽 달력의 연/월
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  // 선택된 시작/끝 날짜
  const [startDate, setStartDate] = useState<string | null>(initialRange?.start ?? null);
  const [endDate, setEndDate] = useState<string | null>(initialRange?.end ?? null);

  // 선택된 프리셋 인덱스 (-1 = 직접 선택)
  const [selectedPreset, setSelectedPreset] = useState<number>(-1);

  const ref = useRef<HTMLDivElement>(null);

  // 열릴 때 초기값 세팅
  useEffect(() => {
    if (isOpen) {
      setStartDate(initialRange?.start ?? null);
      setEndDate(initialRange?.end ?? null);
      setSelectedPreset(-1);
      if (initialRange?.end) {
        const [y, m] = initialRange.end.split('-').map(Number);
        // 끝 날짜 기준으로 달력 표시 (왼쪽 달력이 해당 월)
        setViewYear(y);
        setViewMonth(m - 1);
      } else {
        setViewYear(new Date().getFullYear());
        setViewMonth(new Date().getMonth());
      }
    }
  }, [isOpen, initialRange]);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  // 이전/다음 달 이동
  const goPrev = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const goNext = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  // 날짜 클릭 핸들러
  const handleDayClick = (date: Date) => {
    const str = toDateStr(date);
    setSelectedPreset(-1); // 직접 선택 시 프리셋 해제

    if (!startDate || (startDate && endDate)) {
      // 새로 시작
      setStartDate(str);
      setEndDate(null);
    } else {
      // 끝 날짜 설정
      if (str < startDate) {
        // 시작보다 앞이면 swap
        setEndDate(startDate);
        setStartDate(str);
      } else {
        setEndDate(str);
      }
    }
  };

  // 프리셋 클릭 핸들러
  const handlePresetClick = (index: number) => {
    setSelectedPreset(index);
    const range = PRESETS[index].getValue();
    setStartDate(range.start);
    setEndDate(range.end);

    // 달력을 끝 날짜 기준으로 이동
    const [y, m] = range.end.split('-').map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
  };

  // 적용 버튼
  const handleApply = () => {
    if (startDate && endDate) {
      onApply({ start: startDate, end: endDate });
      onClose();
    }
  };

  // 날짜가 선택 범위 안에 있는지 확인
  const isInRange = (dateStr: string): boolean => {
    if (!startDate || !endDate) return false;
    return dateStr >= startDate && dateStr <= endDate;
  };

  const isStart = (dateStr: string): boolean => dateStr === startDate;
  const isEnd = (dateStr: string): boolean => dateStr === endDate;

  if (!isOpen) return null;

  // 오른쪽 달력의 연/월 (왼쪽 달력 + 1개월)
  const rightYear = viewMonth === 11 ? viewYear + 1 : viewYear;
  const rightMonth = viewMonth === 11 ? 0 : viewMonth + 1;

  const leftDays = getCalendarDays(viewYear, viewMonth);
  const rightDays = getCalendarDays(rightYear, rightMonth);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-50 mt-2 rounded-xl border border-gray-200 bg-white shadow-lg"
      style={{ minWidth: 680 }}
    >
      <div className="flex">
        {/* 왼쪽: 프리셋 목록 */}
        <div className="w-44 shrink-0 border-r border-gray-200 py-3 px-2">
          <div className="space-y-0.5">
            {PRESETS.map((preset, i) => (
              <button
                key={preset.label}
                onClick={() => handlePresetClick(i)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selectedPreset === i
                    ? 'bg-amber-50 font-medium text-amber-800'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* 오른쪽: 달력 영역 */}
        <div className="flex-1 p-4">
          {/* 달력 네비게이션 */}
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={goPrev}
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
            >
              ‹
            </button>
            <div className="flex gap-16 text-sm font-semibold text-gray-900">
              <span>{viewYear}년 {viewMonth + 1}월</span>
              <span>{rightYear}년 {rightMonth + 1}월</span>
            </div>
            <button
              onClick={goNext}
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
            >
              ›
            </button>
          </div>

          {/* 2개월 달력 */}
          <div className="flex gap-6">
            {/* 왼쪽 달력 */}
            <CalendarMonth
              days={leftDays}
              startDate={startDate}
              endDate={endDate}
              isInRange={isInRange}
              isStart={isStart}
              isEnd={isEnd}
              onDayClick={handleDayClick}
            />
            {/* 오른쪽 달력 */}
            <CalendarMonth
              days={rightDays}
              startDate={startDate}
              endDate={endDate}
              isInRange={isInRange}
              isStart={isStart}
              isEnd={isEnd}
              onDayClick={handleDayClick}
            />
          </div>
        </div>
      </div>

      {/* 하단: 선택 범위 표시 + 버튼 */}
      <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
        <span className="text-sm text-gray-600">
          {startDate && endDate
            ? `${formatKoreanDate(startDate)} - ${formatKoreanDate(endDate)}`
            : startDate
              ? `${formatKoreanDate(startDate)} - ...`
              : '날짜를 선택하세요'}
        </span>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleApply}
            disabled={!startDate || !endDate}
            className="rounded-lg px-4 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-40"
            style={{ backgroundColor: '#D4A020' }}
          >
            업데이트
          </button>
        </div>
      </div>
    </div>
  );
}

/** 한 달 달력 그리드 */
function CalendarMonth({
  days,
  startDate,
  endDate,
  isInRange,
  isStart,
  isEnd,
  onDayClick,
}: {
  days: (Date | null)[];
  startDate: string | null;
  endDate: string | null;
  isInRange: (s: string) => boolean;
  isStart: (s: string) => boolean;
  isEnd: (s: string) => boolean;
  onDayClick: (d: Date) => void;
}) {
  return (
    <div className="w-56">
      {/* 요일 헤더 */}
      <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-gray-400">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">{w}</div>
        ))}
      </div>
      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          if (!day) {
            return <div key={`empty-${i}`} className="h-8" />;
          }

          const str = toDateStr(day);
          const inRange = isInRange(str);
          const start = isStart(str);
          const end = isEnd(str);
          const isOnlyStart = start && !endDate;
          const today = toDateStr(new Date()) === str;

          return (
            <div
              key={str}
              className={`relative flex h-8 items-center justify-center ${
                inRange && !start && !end ? 'bg-amber-50' : ''
              } ${start && endDate ? 'rounded-l-full bg-amber-50' : ''} ${
                end ? 'rounded-r-full bg-amber-50' : ''
              }`}
            >
              <button
                onClick={() => onDayClick(day)}
                className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-sm transition-colors ${
                  start || end || isOnlyStart
                    ? 'font-semibold text-white'
                    : inRange
                      ? 'text-amber-900 hover:bg-amber-100'
                      : today
                        ? 'font-semibold text-amber-700 hover:bg-gray-100'
                        : 'text-gray-700 hover:bg-gray-100'
                }`}
                style={
                  start || end || isOnlyStart
                    ? { backgroundColor: '#D4A020' }
                    : undefined
                }
              >
                {day.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
