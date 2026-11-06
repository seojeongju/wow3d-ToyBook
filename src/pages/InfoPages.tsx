import { Link } from 'react-router-dom';
import { ClayEmoji } from '../components/ClayArt';
import { ClayIcon, LineIcon, type ClayIconName } from '../components/Icons';
import { AGES, FAQ_ALL, FIGURE_SIZES, FIGURE_STEPS, PROMISES, STEPS } from '../content/site';
import { faqLd, howToLd } from '../seo';
import InfoPage from './InfoPage';

/* ───────── 토이북 소개 ───────── */
const PLACES: { icon: ClayIconName; name: string; body: string }[] = [
  { icon: 'studio', name: '이야기 공방', body: '아이 이름과 좋아하는 것으로 AI가 줄거리와 그림을 만들어요. (준비 중)' },
  { icon: 'theater', name: '동화 극장', body: '한 쪽씩 넘기며 읽고, 소리 버튼으로 한국어로 읽어 줘요. (지금 데모로 해 볼 수 있어요)' },
  { icon: 'magic', name: '마법 상자', body: '책 속 캐릭터를 돌려 볼 수 있는 3D 모델로 바꿔요. (준비 중)' },
  { icon: 'factory', name: '장난감 공장', body: '부모님 승인 후 wow3d가 피규어로 출력해 보내 드려요. (준비 중)' },
];

export function AboutPage() {
  return (
    <InfoPage
      path="/about"
      heading="토이북은 어떤 서비스인가요?"
      lead="토이북은 3D프린팅 회사 wow3d가 만든 3~12세 어린이 그림책 서비스예요. 우리 아이가 주인공인 그림책을 AI로 만들어 함께 읽고, 책 속 캐릭터를 3D 피규어로 받아 손에 쥘 수 있어요."
      art="book"
      sections={[
        {
          id: 'who',
          title: '누가 만들었나요?',
          answer:
            '3D프린팅 출력과 후가공을 해 온 wow3d가 만들었어요. 그림책 속 캐릭터를 실제로 출력할 수 있는 모양으로 다듬고, 작업자가 직접 검수해 보내는 것까지 한곳에서 해요.',
        },
        {
          id: 'what',
          title: '토이북에서 무엇을 할 수 있나요?',
          answer: '그림책 만들기, 읽기, 3D로 보기, 피규어로 받기를 네 곳의 장소에서 차례로 해요.',
          children: (
            <ul className="info-cards">
              {PLACES.map((p) => (
                <li key={p.name}>
                  <ClayIcon name={p.icon} size={52} />
                  <div>
                    <h3>{p.name}</h3>
                    <p>{p.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          ),
        },
        {
          id: 'how',
          title: '그림책은 어떻게 만들어지나요?',
          answer: '아이 이야기를 들려주면 AI가 그림책을 만들고, 부모님이 다듬은 뒤 피규어까지 받을 수 있어요. 세 걸음이면 돼요.',
          children: (
            <ol className="info-steps">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <span className="step-no">{i + 1}</span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          ),
        },
        {
          id: 'ages',
          title: '아이 나이에 따라 무엇이 달라지나요?',
          answer: '나이에 맞춰 화면이 바뀌어요. 글을 못 읽는 아이는 그림과 소리로, 큰 아이는 직접 글을 고치며 써요.',
          children: (
            <ul className="info-cards">
              {AGES.map((a) => (
                <li key={a.name}>
                  <ClayEmoji emoji={a.emoji} size={52} />
                  <div>
                    <h3>
                      {a.name} ({a.age})
                    </h3>
                    <p>{a.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          ),
        },
        {
          id: 'now',
          title: '지금은 어떤 단계인가요?',
          answer:
            '지금은 미리 보기 단계예요. 데모 그림책 두 권을 읽고 읽어 주기를 들어 볼 수 있고, 책 만들기·3D 미리 보기·피규어 주문은 차례로 열릴 예정이에요.',
        },
      ]}
      extraLd={[howToLd('토이북으로 우리 아이 그림책과 피규어 만들기', STEPS)]}
    />
  );
}

/* ───────── 3D 피규어 안내 ───────── */
export function FigurePage() {
  return (
    <InfoPage
      path="/figure"
      heading="그림책 캐릭터가 3D 피규어가 되기까지"
      lead="토이북에서는 책 속 캐릭터를 5cm, 8cm, 12cm 3D 피규어로 받을 수 있어요. 3D로 미리 보고, 출력할 수 있는 모양인지 검사하고, wow3d 작업자가 직접 검수한 뒤 국내에서 출력해 보내 드려요."
      art="star"
      sections={[
        {
          id: 'sizes',
          title: '피규어는 어떤 크기로 만들 수 있나요?',
          answer: '5cm, 8cm, 12cm 세 가지 크기를 준비하고 있어요.',
          children: (
            <ul className="info-cards three">
              {FIGURE_SIZES.map((f) => (
                <li key={f.size}>
                  <ClayIcon name={f.icon} size={52} />
                  <div>
                    <h3>{f.size}</h3>
                    <p>{f.fit}</p>
                  </div>
                </li>
              ))}
            </ul>
          ),
        },
        {
          id: 'process',
          title: '그림에서 피규어가 되기까지 어떤 과정을 거치나요?',
          answer: '캐릭터 고르기부터 배송까지 여섯 단계를 거쳐요. 특히 출력 전에 사람이 직접 모델을 확인해요.',
          children: (
            <ol className="info-steps">
              {FIGURE_STEPS.map((s, i) => (
                <li key={s.title}>
                  <span className="step-no">{i + 1}</span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          ),
        },
        {
          id: 'check',
          title: '왜 출력 전에 검수를 하나요?',
          answer:
            '사진이나 그림으로 만든 3D 모델은 그대로 출력하면 얇은 부분이 부러지거나 넘어지기 쉬워요. 그래서 구멍을 메우고, 얇은 곳을 두껍게 하고, 받침대를 붙인 뒤 작업자가 한 번 더 확인해요.',
        },
        {
          id: 'own',
          title: '아이가 그린 캐릭터도 피규어로 만들 수 있나요?',
          answer: '네, 그렇게 준비하고 있어요. 종이에 그린 그림을 찍어 올리면 책 속 그림이 되고, 그 캐릭터를 피규어로 만들 수 있어요. 다만 다른 작가나 회사의 캐릭터는 만들지 않아요.',
        },
        {
          id: 'safe',
          title: '어린아이에게 줘도 안전한가요?',
          answer:
            '피규어에는 작은 부분이 있을 수 있어 3세 미만 아이에게는 권하지 않아요. 주문할 때 크기와 재질에 맞는 안전 안내와 소재 정보를 함께 알려 드릴게요.',
        },
        {
          id: 'price',
          title: '가격과 제작 기간은 어떻게 되나요?',
          answer: '피규어 주문 기능을 여는 시점에 크기와 재질별 가격, 제작·배송 기간을 안내해 드릴게요. 모든 피규어는 국내에서 출력해 배송해요.',
        },
      ]}
      extraLd={[howToLd('그림책 캐릭터를 3D 피규어로 만드는 과정', FIGURE_STEPS)]}
    />
  );
}

/* ───────── 안심 약속 ───────── */
export function SafetyPage() {
  return (
    <InfoPage
      path="/safety"
      heading="아이에게 안전한 토이북 약속"
      lead="토이북은 아이가 직접 쓰는 서비스라서 안전을 가장 먼저 생각해요. 아이 실명과 연락처를 받지 않고, 아이 사진을 AI 학습에 쓰지 않으며, 광고와 채팅 없이 결제는 부모님만 할 수 있어요."
      art="heart"
      sections={[
        {
          id: 'promises',
          title: '어떤 약속을 지키나요?',
          answer: '토이북이 지키는 여섯 가지 약속이에요.',
          children: (
            <ul className="promise-list info-promises">
              {PROMISES.map((p) => (
                <li key={p.title}>
                  <span className="promise-check" aria-hidden>
                    <LineIcon name="check" size={20} />
                  </span>
                  <div>
                    <strong>{p.title}</strong>
                    <span>{p.body}</span>
                  </div>
                </li>
              ))}
            </ul>
          ),
        },
        {
          id: 'account',
          title: '아이 계정은 어떻게 만들어지나요?',
          answer:
            '아이는 따로 가입하지 않고, 부모님 계정 안의 프로필로 들어와요. 만 14세 미만 아이의 정보는 법정대리인인 부모님의 동의를 받아 별명과 나이만 저장해요.',
        },
        {
          id: 'gate',
          title: '아이가 실수로 결제하지 않을까요?',
          answer:
            '결제·주문·설정은 어른만 풀 수 있는 부모 잠금 뒤에 있어요. 아이는 갖고 싶은 피규어에 "갖고 싶어요"만 누를 수 있고, 승인과 결제는 부모님이 해요.',
        },
        {
          id: 'content',
          title: 'AI가 만든 글과 그림은 안전한가요?',
          answer:
            '아이에게 맞는 표현만 쓰도록 만들고, 만든 글과 그림은 아이에게 보이기 전에 안전 검사를 거치도록 준비하고 있어요. 문제가 있는 내용은 신고할 수 있게 할 예정이에요.',
        },
        {
          id: 'search',
          title: '아이의 책이 인터넷에 공개되나요?',
          answer: '아니요. 아이의 책장과 책은 검색에 노출되지 않도록 막아 두었고, 가족만 볼 수 있어요.',
        },
      ]}
    />
  );
}

/* ───────── 자주 묻는 질문 ───────── */
export function FaqPage() {
  return (
    <InfoPage
      path="/faq"
      heading="토이북 자주 묻는 질문"
      lead="몇 살부터 쓸 수 있는지, 아이 사진은 안전한지, 피규어는 어떻게 받는지 등 부모님이 자주 묻는 질문에 답했어요."
      art="sparkles"
      sections={[
        {
          id: 'all',
          title: '부모님이 자주 묻는 질문',
          answer: `모두 ${FAQ_ALL.length}개의 질문이에요. 궁금한 질문을 눌러 답을 확인하세요.`,
          children: (
            <div className="faq">
              {FAQ_ALL.map((f) => (
                <details key={f.q}>
                  <summary>
                    <span>{f.q}</span>
                    <span className="faq-icon" aria-hidden>
                      <LineIcon name="next" size={20} />
                    </span>
                  </summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          ),
        },
        {
          id: 'more',
          title: '더 궁금한 점이 있나요?',
          answer: '서비스 소개, 피규어 안내, 안심 약속 페이지에서 더 자세히 볼 수 있어요.',
          children: (
            <p className="info-links">
              <Link to="/about">토이북 소개</Link> · <Link to="/figure">3D 피규어 안내</Link> · <Link to="/safety">안심 약속</Link>
            </p>
          ),
        },
      ]}
      extraLd={[faqLd(FAQ_ALL)]}
    />
  );
}
