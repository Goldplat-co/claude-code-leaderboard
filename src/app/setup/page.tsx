import { CodeBlock } from '@/components/code-block';

// 리더보드 수집기 설치 단계 (골드 테마)
const leaderboardSteps = [
  {
    number: 1,
    title: '수집 스크립트 설치',
    description: '터미널을 열고 아래 명령어를 복사해서 실행하세요.',
    code: 'mkdir -p ~/.goldplat && curl -sL https://raw.githubusercontent.com/Goldplat-co/claude-code-leaderboard/main/scripts/collect.sh -o ~/.goldplat/collect.sh && chmod +x ~/.goldplat/collect.sh',
  },
  {
    number: 2,
    title: '닉네임 설정',
    description: '리더보드에 표시될 닉네임을 설정하세요.',
    code: '~/.goldplat/collect.sh config --name "내닉네임"',
  },
  {
    number: 3,
    title: '자동 전송 설정',
    description: '매일 오전 9시에 자동으로 어제 사용량을 전송합니다.',
    code: '~/.goldplat/collect.sh setup-cron',
  },
];

// 대시보드 수집기 설치 단계 (바이올렛 테마)
const dashboardSteps = [
  {
    number: 1,
    title: '스냅샷 스크립트 설치',
    description: '터미널을 열고 아래 명령어를 복사해서 실행하세요.',
    code: 'curl -sL https://raw.githubusercontent.com/Goldplat-co/claude-code-leaderboard/main/scripts/snapshot.sh -o ~/.goldplat/snapshot.sh && chmod +x ~/.goldplat/snapshot.sh',
  },
  {
    number: 2,
    title: '자동 전송 설정',
    description: '매일 오전 9시에 자동으로 환경 스냅샷을 전송합니다.',
    code: '~/.goldplat/snapshot.sh setup-cron',
  },
  {
    number: 3,
    title: '테스트 전송',
    description: '설치가 잘 됐는지 지금 바로 확인해보세요.',
    code: '~/.goldplat/snapshot.sh send',
  },
];

// 리더보드 수집 데이터 태그 목록
const leaderboardDataTags = ['입력 토큰', '출력 토큰', '비용 (USD)', '세션 수'];

// 대시보드 수집 데이터 태그 목록
const dashboardDataTags = [
  'CLAUDE.md',
  '스킬 목록',
  '에이전트 목록',
  'Hook 설정',
  'MCP 커넥터',
  '플러그인',
  '권한 설정',
];

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 영역 */}
        <header className="text-center mb-12">
          <h1
            className="text-3xl font-bold mb-3"
            style={{
              background: 'linear-gradient(135deg, #D4A843, #F2D06B, #C4963C)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            설치 가이드
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-base">
            한 번만 따라하면 매일 자동으로 데이터가 올라가요
          </p>
        </header>

        {/* 2-column 레이아웃: 리더보드 + 대시보드 수집기 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* 왼쪽: 리더보드 수집기 (골드 테마) */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            {/* 수집기 헤더 */}
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                🏆 리더보드 수집기
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                운영 중
              </span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Claude Code 토큰 사용량, 비용, 세션 수를 매일 자동 수집합니다.
            </p>

            {/* 수집 데이터 태그 */}
            <div className="flex flex-wrap gap-2 mb-6">
              {leaderboardDataTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-md text-xs font-medium"
                  style={{
                    background: 'rgba(212, 168, 67, 0.12)',
                    color: '#B8922E',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* 설치 단계 */}
            <div className="flex flex-col gap-5">
              {leaderboardSteps.map((step) => (
                <div key={step.number}>
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-black"
                      style={{
                        background: 'linear-gradient(135deg, #D4A843, #F2D06B)',
                      }}
                    >
                      {step.number}
                    </div>
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3 ml-11">
                    {step.description}
                  </p>
                  <div className="ml-11">
                    <CodeBlock code={step.code} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 오른쪽: 대시보드 수집기 (바이올렛 테마) */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
            {/* 수집기 헤더 */}
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                🎯 대시보드 수집기
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                NEW
              </span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Claude Code 환경 설정 스냅샷을 매일 자동 수집합니다.
            </p>

            {/* 수집 데이터 태그 */}
            <div className="flex flex-wrap gap-2 mb-6">
              {dashboardDataTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-md text-xs font-medium"
                  style={{
                    background: 'rgba(124, 58, 237, 0.12)',
                    color: '#7c3aed',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* 설치 단계 */}
            <div className="flex flex-col gap-5">
              {dashboardSteps.map((step) => (
                <div key={step.number}>
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{
                        background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
                      }}
                    >
                      {step.number}
                    </div>
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3 ml-11">
                    {step.description}
                  </p>
                  <div className="ml-11">
                    <CodeBlock code={step.code} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 설치 완료 안내 배너 */}
        <div
          className="rounded-xl border p-6"
          style={{
            background: 'linear-gradient(135deg, rgba(212, 168, 67, 0.08), rgba(124, 58, 237, 0.08))',
            borderColor: 'rgba(212, 168, 67, 0.25)',
          }}
        >
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            ✅ 설치 완료! 내일부터 리더보드와 대시보드에 데이터가 표시됩니다.
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
            지금 바로 확인하고 싶다면 수동으로 전송할 수 있어요.
          </p>
          <div className="flex flex-col gap-2">
            <CodeBlock code="~/.goldplat/collect.sh send     # 리더보드 데이터" />
            <CodeBlock code="~/.goldplat/snapshot.sh send    # 대시보드 데이터" />
          </div>
        </div>
      </div>
    </div>
  );
}
