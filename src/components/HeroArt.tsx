/**
 * 홈 히어로 일러스트: 시안 1(팝업 매직북 & 별곰 3D 피규어) 콘셉트에 맞춘
 * 3D 클레이 일러스트레이션 (/hero-art.jpg).
 */
export default function HeroArt() {
  return (
    <figure className="hero-art-wrap">
      <img
        src="/hero-art.jpg"
        alt="책상 위 펼친 그림책에서 귀여운 별곰 3D 피규어와 장난감 블록이 마법처럼 튀어나오는 모습"
        className="hero-art hero-art-img"
        width={1200}
        height={900}
        fetchPriority="high"
      />
      <figcaption className="hero-badge" aria-hidden>
        <span className="hero-badge-dot" />
        AI 그림책 · 3D 피규어 제작
      </figcaption>
    </figure>
  );
}
