'use client';

import { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = 'bash' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group flex items-start bg-[#1A1A1A] rounded-lg">
      {/* 스크롤 가능한 코드 영역 — 복사 버튼 공간(72px)만큼 오른쪽 패딩 확보 */}
      <pre className="flex-1 min-w-0 text-[#E8E8E8] px-4 py-3 text-sm font-mono overflow-x-auto pr-[72px]">
        <code>{code}</code>
      </pre>
      {/* 복사 버튼 — 스크롤 영역 밖에 고정 (sticky로 항상 보임) */}
      <button
        onClick={handleCopy}
        className="sticky right-0 top-0 flex-shrink-0 mt-2 mr-2 px-2 py-1 rounded text-xs bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
      >
        {copied ? '✓ 복사됨' : '📋 복사'}
      </button>
    </div>
  );
}
