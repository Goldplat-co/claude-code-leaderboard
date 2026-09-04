/** 주얼리 브랜드 랭킹. 정적 대시보드를 사이드바 안에서 보여준다. */
export const metadata = { title: '주얼리 브랜드 · Goldplat OS' };

export default function JewelryBrandsPage() {
  return (
    <iframe
      src="/jewelry/brands.html"
      title="주얼리 브랜드 랭킹"
      className="w-full rounded-lg border border-gray-200"
      style={{ height: 'calc(100vh - 3rem)' }}
    />
  );
}
