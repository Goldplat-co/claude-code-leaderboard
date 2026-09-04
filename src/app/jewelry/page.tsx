/**
 * 주얼리 상품 랭킹.
 *
 * 실제 대시보드는 public/jewelry/index.html 에 있는 정적 페이지다.
 * public 폴더의 파일은 Next.js 레이아웃을 거치지 않아 그대로 열면 사이드바가 사라진다.
 * 그래서 이 페이지가 iframe으로 감싸서 사이드바를 유지한다.
 */
export const metadata = { title: '주얼리 상품 랭킹 · Goldplat OS' };

export default function JewelryPage() {
  return (
    <iframe
      src="/jewelry/index.html"
      title="주얼리 상품 랭킹"
      className="w-full rounded-lg border border-gray-200"
      style={{ height: 'calc(100vh - 3rem)' }}
    />
  );
}
