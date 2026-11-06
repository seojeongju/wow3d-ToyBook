import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import ClayArt, { type ClayArtName } from '../components/ClayArt';
import JsonLd from '../components/JsonLd';
import { LineIcon } from '../components/Icons';
import SiteFooter, { INFO_LINKS } from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';
import { breadcrumbLd, organizationLd, PAGE_META, webPageLd } from '../seo';

export interface InfoSection {
  id: string;
  /** 질문형 제목 권장 (AEO) */
  title: string;
  /** 제목 바로 아래 한두 문장 답 (AI 가 인용하기 좋게) */
  answer: string;
  children?: ReactNode;
}

interface Props {
  path: string;
  /** 화면 맨 위 h1 */
  heading: string;
  /** h1 아래 핵심 요약 (첫 문장에 답) */
  lead: string;
  art: ClayArtName;
  sections: InfoSection[];
  /** 페이지 성격에 맞는 구조화 데이터 (FAQPage, HowTo 등) */
  extraLd?: object[];
}

/**
 * 공개 소개 페이지 공용 틀 (SEO·AEO·GEO 체크리스트 반영):
 * h1 하나 + 질문형 h2 + 첫 문장 답, 이동 경로(빵부스러기), 관련 페이지 내부 링크, 구조화 데이터
 */
export default function InfoPage({ path, heading, lead, art, sections, extraLd = [] }: Props) {
  const meta = PAGE_META[path];
  const crumbName = INFO_LINKS.find((l) => l.to === path)?.label ?? heading;

  return (
    <div className="landing info-page">
      <JsonLd
        data={[
          organizationLd(),
          webPageLd(path, meta.title, meta.description),
          breadcrumbLd([
            { name: '홈', path: '/' },
            { name: crumbName, path },
          ]),
          ...extraLd,
        ]}
      />
      <SiteHeader />

      <nav className="crumbs" aria-label="현재 위치">
        <Link to="/">홈</Link>
        <span aria-hidden>›</span>
        <span aria-current="page">{crumbName}</span>
      </nav>

      <header className="info-hero">
        <div className="info-hero-copy">
          <h1 className="info-title">{heading}</h1>
          <p className="info-lead">{lead}</p>
        </div>
        <ClayArt name={art} size={150} />
      </header>

      <nav className="info-toc" aria-label="이 페이지 목차">
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`}>
            {s.title}
          </a>
        ))}
      </nav>

      {sections.map((s) => (
        <section key={s.id} id={s.id} className="info-section">
          <h2>{s.title}</h2>
          <p className="info-answer">{s.answer}</p>
          {s.children}
        </section>
      ))}

      <section className="info-related" aria-labelledby="related-title">
        <h2 id="related-title">함께 보면 좋아요</h2>
        <div className="related-grid">
          {INFO_LINKS.filter((l) => l.to !== path).map((l) => (
            <Link key={l.to} to={l.to} className="related-card">
              <span>{l.label}</span>
              <LineIcon name="arrow" size={20} />
            </Link>
          ))}
          <Link to="/" className="related-card">
            <span>토이북 홈</span>
            <LineIcon name="arrow" size={20} />
          </Link>
        </div>
      </section>

      <section className="cta-banner">
        <ClayArt name="book" size={56} />
        <div className="cta-text">
          <strong>데모 그림책을 먼저 읽어 볼까요?</strong>
          <span>지금은 미리 보기 단계예요. 두 권의 그림책과 읽어 주기를 해 볼 수 있어요.</span>
        </div>
        <Link to="/profiles" className="pill-btn">
          책장 열기 <LineIcon name="arrow" size={20} />
        </Link>
      </section>

      <SiteFooter />
    </div>
  );
}
