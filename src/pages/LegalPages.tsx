import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import JsonLd from '../components/JsonLd';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';
import { breadcrumbLd, PAGE_META, webPageLd } from '../seo';

/**
 * 법적 문서 페이지 (개인정보처리방침·이용약관·오픈소스 라이선스).
 * 정식 출시 전 초안: 실제 서비스 동작(현재는 로그인 없음, 개인정보 미수집)에 맞춰 쓰고,
 * 아직 정해지지 않은 사업자 정보·보호책임자·시행일은 "출시 전 기재"로 남김. 출시 전 법률 검토 필요.
 */
const TBD = '정식 출시 전 기재';

function LegalPage({ path, heading, crumb, notice, children }: { path: string; heading: string; crumb: string; notice?: string; children: ReactNode }) {
  const meta = PAGE_META[path];
  return (
    <div className="landing info-page legal-page">
      <JsonLd
        data={[
          webPageLd(path, meta.title, meta.description),
          breadcrumbLd([
            { name: '홈', path: '/' },
            { name: crumb, path },
          ]),
        ]}
      />
      <SiteHeader />
      <nav className="crumbs" aria-label="현재 위치">
        <Link to="/">홈</Link>
        <span aria-hidden>›</span>
        <span aria-current="page">{crumb}</span>
      </nav>
      <header className="legal-head">
        <h1 className="info-title">{heading}</h1>
        {notice && <p className="legal-notice">{notice}</p>}
      </header>
      <div className="legal-body">{children}</div>
      <SiteFooter />
    </div>
  );
}

/* ───────── 개인정보처리방침 ───────── */
export function PrivacyPage() {
  return (
    <LegalPage
      path="/privacy"
      heading="개인정보처리방침"
      crumb="개인정보처리방침"
      notice="이 문서는 정식 출시 전 초안이에요. 부모님 회원가입은 카카오·네이버·구글 간편 가입으로만 받고, 가입하면 아래 2장의 부모님 정보만 받아요. 시행일, 사업자 정보, 개인정보 보호책임자는 정식 출시 전에 확정해 알려 드려요."
    >
      <section>
        <h2>1. 가입하지 않고 둘러볼 때 처리하는 정보</h2>
        <p>
          와우쓰리디 토이북(이하 "토이북")은 가입하지 않고 둘러볼 때 이름, 연락처, 이메일 같은 개인정보를 받지 않아요. 아래 설정만 이용자의 기기 안에 저장되고 서버로
          보내지 않아요.
        </p>
        <ul>
          <li>소리 켜기·끄기 설정 (기기에 저장)</li>
          <li>아이별로 고른 책장 모양 (기기에 저장)</li>
          <li>우리 방 색으로 꾸미기에서 고른 색 3개 (사진 자체는 기기 안에서 색만 읽고 바로 버리며 저장하지 않음)</li>
          <li>잠자리 모드 켜기·끄기, 다 읽은 책에 붙는 별 스티커 (기기에 저장)</li>
          <li>날짜별로 읽은 쪽 기록 (부모 대시보드의 "이번 주 읽은 쪽 수"에 쓰며 기기에 저장, 60일이 지나면 저절로 지워짐)</li>
          <li>부모 잠금을 통과했는지 여부 (브라우저 탭을 닫으면 지워짐)</li>
          <li>이야기 공방의 "말로 쓰기"를 누르면 브라우저(크롬·엣지·사파리 등)의 음성 인식 기능이 말을 글자로 바꿔요. 이때 소리는 브라우저 회사의 음성 인식 서비스에서 처리될 수 있고, 토이북은 소리를 받거나 저장하지 않아요. 글자로 바뀐 내용만 이야기 재료로 써요.</li>
          <li>로그인 상태를 지키는 쿠키 (로그인한 경우만, 무작위 번호 하나, 30일 또는 로그아웃할 때까지)</li>
          <li>인터넷이 끊겨도 읽을 수 있도록 책장의 그림책 내용과 화면 파일 (기기에 보관, 브라우저 설정에서 지울 수 있음)</li>
        </ul>
        <p>
          광고·행동 분석용 쿠키나 추적 도구는 쓰지 않아요. 다만 사이트를 운영하는 Cloudflare가 보안과 서비스 제공을 위해 접속 기록(IP 주소, 접속 시각 등)을
          처리할 수 있어요.
        </p>
      </section>

      <section>
        <h2>2. 가입하면 처리하는 정보와 목적</h2>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead>
              <tr>
                <th scope="col">누구의 정보</th>
                <th scope="col">항목</th>
                <th scope="col">목적</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>부모님</td>
                <td>간편 로그인 회원 번호, 별명, 이메일(제공한 경우), 약관·법정대리인 동의 기록과 시각, 만 14세 이상 확인 방법, 보호자 본인인증을 마친 시각과 방법, 마지막 로그인 시각</td>
                <td>회원 확인과 로그인, 법정대리인 동의 확인, 공지 (소식 받기에 동의한 경우 새 기능·이벤트 안내)</td>
              </tr>
              <tr>
                <td>아이</td>
                <td>별명, 태어난 해, 아바타, 나이 모드, 좋아하는 것</td>
                <td>나이에 맞춘 화면과 맞춤 그림책 만들기</td>
              </tr>
              <tr>
                <td>아이 그림·사진 (올린 경우)</td>
                <td>이미지 파일</td>
                <td>책 속 그림과 3D 캐릭터 만들기</td>
              </tr>
              <tr>
                <td>피규어 주문</td>
                <td>받는 분 이름, 주소, 연락처 (결제 정보는 결제대행사가 처리)</td>
                <td>제작, 배송, 고객 상담</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>3. 만 14세 미만 아동의 개인정보</h2>
        <ul>
          <li>아이는 따로 가입하지 않고 부모님 계정 안의 프로필로만 이용해요.</li>
          <li>만 14세 미만 아동의 정보는 법정대리인인 부모님의 동의를 받은 뒤에만 처리해요.</li>
          <li>아이의 실명과 연락처는 받지 않고 별명과 나이 정보만 받아요.</li>
          <li>부모님은 언제든 아이 정보를 보거나 고치거나 지울 수 있어요.</li>
          <li>아이 사진과 그림은 가족별로 나뉜 공간에 비공개로 보관하고, AI 학습에 쓰지 않아요.</li>
        </ul>
      </section>

      <section>
        <h2>4. 보관 기간과 파기</h2>
        <ul>
          <li>회원 탈퇴나 이용 목적이 끝나면 개인정보를 지체 없이 파기해요.</li>
          <li>
            다만 전자상거래 등에서의 소비자보호에 관한 법률에 따라 계약·청약철회 및 대금결제·재화공급 기록은 5년, 소비자 불만·분쟁 처리 기록은 3년 동안
            보관해요.
          </li>
          <li>간편 로그인 뒤 약관 동의 단계에서 가입을 그만두면 받아 둔 회원 정보를 바로 지워요.</li>
          <li>책장 꾸미기를 위해 올린 방 사진은 변환이 끝나면 원본을 바로 지워요.</li>
        </ul>
      </section>

      <section>
        <h2>5. 처리 위탁과 국외 이전</h2>
        <p>서비스 제공을 위해 아래 업체에 처리를 맡기거나 맡길 예정이에요. 정식 출시 전에 위탁 계약과 국외 이전 항목을 확정해 다시 알려 드려요.</p>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead>
              <tr>
                <th scope="col">받는 곳</th>
                <th scope="col">맡기는 일</th>
                <th scope="col">이전 국가</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Cloudflare, Inc.</td>
                <td>웹사이트 운영, 데이터·파일 보관</td>
                <td>미국 등 (서비스 지역에 따라 다름)</td>
              </tr>
              <tr>
                <td>Anthropic, PBC</td>
                <td>이야기 공방에서 그림책 줄거리와 글 만들기 (아이 별명, 좋아하는 것, 고른 주제가 들어감)</td>
                <td>미국</td>
              </tr>
              <tr>
                <td>OpenAI, L.L.C.</td>
                <td>그림책 문장을 읽어 주는 음성으로 바꾸기 (책 문장에 아이 별명이 들어갈 수 있음)</td>
                <td>미국</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          간편 로그인을 쓰면 카카오·네이버·구글에서 회원 번호, 별명, 이메일(제공에 동의한 경우)을 받아요. 카카오·네이버가 출생 연도나 연령대를 주면 만 14세
          이상인지 확인하는 데만 쓰고 저장하지 않아요. 비밀번호는 받지 않고, 토이북 이용 내용을 이 회사들에 보내지 않아요.
        </p>
        <p>
          보호자 본인인증은 본인인증 대행사(포트원과 휴대폰·인증서 본인확인 기관)를 통해 할 예정이에요. 인증 결과에서 성인인지만 확인하고 이름, 전화번호,
          생년월일은 저장하지 않으며, 인증을 마친 시각과 방법만 남겨요. 대행사가 정해지면 위 표에 추가해 알려 드려요.
        </p>
        <p>AI 서비스는 이용 정책상 보낸 내용이 모델 학습에 쓰이지 않는 방식(API)으로만 이용해요. 그림책 만들기·3D 변환·결제 업체가 정해지면 이 표에 추가해요.</p>
      </section>

      <section>
        <h2>6. 이용자와 법정대리인의 권리</h2>
        <p>
          이용자와 법정대리인은 언제든 개인정보 열람, 정정, 삭제, 처리 정지를 요청하거나 동의를 철회할 수 있어요. 요청은 부모 모드 또는 아래 연락처로 할 수
          있고, 지체 없이 처리해 드려요. 부모 모드의 "우리 아이"에서 아이 정보를 바로 고치거나 지울 수 있고(지우면 그 아이의 책과 그림도 함께 지워져요),
          "설정"에서 소식 받기 동의를 철회하거나 탈퇴할 수 있어요. 탈퇴하면 부모 계정, 아이 프로필, 책과 그림 파일을 바로 모두 지워요.
        </p>
      </section>

      <section>
        <h2>7. 안전하게 지키기 위한 조치</h2>
        <ul>
          <li>모든 통신은 암호화(HTTPS)해서 주고받아요.</li>
          <li>가족별로 저장 공간을 나누고, 다른 가족의 파일은 열 수 없게 막아요.</li>
          <li>아이의 책장과 책은 검색엔진에 노출되지 않게 막아요.</li>
          <li>로그인은 무작위 번호로만 지키고, 서버에는 그 번호를 되돌릴 수 없게 바꾼 값만 저장해요.</li>
          <li>부모 PIN 은 되돌릴 수 없는 방식(암호화 해시)으로 바꿔 저장하고, 5번 틀리면 10분 동안 잠가요.</li>
          <li>개인정보에 접근할 수 있는 사람을 최소한으로 제한해요.</li>
        </ul>
      </section>

      <section>
        <h2>8. 개인정보 보호책임자</h2>
        <dl className="legal-dl">
          <dt>사업자</dt>
          <dd>wow3d (상호·대표자·주소: {TBD})</dd>
          <dt>개인정보 보호책임자</dt>
          <dd>{TBD}</dd>
          <dt>연락처</dt>
          <dd>{TBD}</dd>
        </dl>
        <p>개인정보 침해 신고·상담은 개인정보침해신고센터(국번 없이 118), 개인정보분쟁조정위원회(1833-6972)에도 할 수 있어요.</p>
      </section>

      <section>
        <h2>9. 이 방침의 변경</h2>
        <p>내용이 바뀌면 시행 7일 전부터 사이트에 알려 드려요. 이용자 권리에 중요한 변경은 30일 전에 알려 드려요.</p>
        <p>시행일: {TBD}</p>
      </section>
    </LegalPage>
  );
}

/* ───────── 이용약관 ───────── */
export function TermsPage() {
  return (
    <LegalPage
      path="/terms"
      heading="이용약관"
      crumb="이용약관"
      notice="이 문서는 정식 출시 전 초안이에요. 회원가입·책 만들기·피규어 주문 기능을 열기 전에 법률 검토를 거쳐 확정하고, 시행일과 사업자 정보를 함께 알려 드려요."
    >
      <section>
        <h2>제1조 목적</h2>
        <p>
          이 약관은 wow3d(이하 "회사")가 제공하는 와우쓰리디 토이북(이하 "서비스")을 이용할 때 회사와 이용자 사이의 권리, 의무, 책임을 정하는 것을 목적으로
          해요.
        </p>
      </section>
      <section>
        <h2>제2조 서비스 내용</h2>
        <ul>
          <li>AI를 이용한 어린이 맞춤 그림책 만들기와 읽기, 읽어 주기</li>
          <li>그림책 캐릭터의 3D 모델 미리 보기</li>
          <li>3D 피규어 제작·배송 주문</li>
        </ul>
        <p>지금은 미리 보기 단계로 데모 그림책 읽기와 읽어 주기만 제공해요.</p>
      </section>
      <section>
        <h2>제3조 회원과 아동 이용</h2>
        <ul>
          <li>회원은 만 14세 이상의 보호자(부모님)만 가입할 수 있어요.</li>
          <li>아이는 보호자 계정 안의 프로필로 이용하고, 결제·주문·설정은 보호자만 할 수 있어요.</li>
          <li>보호자는 아이의 서비스 이용을 지도하고 관리할 책임이 있어요.</li>
        </ul>
      </section>
      <section>
        <h2>제4조 이용자가 지켜야 할 것</h2>
        <ul>
          <li>다른 사람의 저작권, 초상권, 상표권을 침해하는 그림·사진·글을 올리지 않아요.</li>
          <li>다른 작가나 회사의 캐릭터를 그대로 따라 만든 책·피규어를 요청하지 않아요. 회사는 이런 주문을 거절할 수 있어요.</li>
          <li>아이에게 해로운 내용을 만들거나 올리지 않아요.</li>
        </ul>
      </section>
      <section>
        <h2>제5조 만든 그림책과 캐릭터의 권리</h2>
        <ul>
          <li>이용자가 서비스로 만든 그림책과 캐릭터는 이용자가 개인적으로 자유롭게 이용할 수 있어요.</li>
          <li>회사는 서비스 제공(보관, 읽기, 3D 변환, 출력)에 필요한 범위에서만 이용하고, 이용자의 허락 없이 공개하거나 홍보에 쓰지 않아요.</li>
          <li>AI가 만든 글과 그림은 예상과 다르거나 정확하지 않을 수 있어요. 보호자가 확인한 뒤 아이에게 보여 주세요.</li>
        </ul>
      </section>
      <section>
        <h2>제6조 피규어 주문과 청약철회</h2>
        <ul>
          <li>가격, 크기, 재질, 제작·배송 기간은 주문 화면에서 미리 알려 드려요.</li>
          <li>피규어는 이용자의 그림책 캐릭터로 따로 만드는 주문 제작 상품이에요. 전자상거래법에 따라 제작을 시작한 뒤에는 청약철회가 제한될 수 있으며, 주문 전에 이를 분명히 알리고 동의를 받아요.</li>
          <li>받은 피규어가 부서졌거나 주문과 다르면 다시 만들어 드리거나 환불해 드려요.</li>
          <li>작은 부품이 있을 수 있어 3세 미만 아이에게는 권하지 않아요.</li>
        </ul>
      </section>
      <section>
        <h2>제7조 서비스의 변경과 중단</h2>
        <p>회사는 서비스를 개선하기 위해 내용을 바꿀 수 있고, 이용자에게 불리한 변경은 미리 알려 드려요. 점검이나 장애로 서비스가 잠시 멈출 수 있어요.</p>
      </section>
      <section>
        <h2>제8조 분쟁 해결</h2>
        <p>이 약관은 대한민국 법을 따르며, 분쟁이 생기면 민사소송법에 따른 관할 법원에서 해결해요.</p>
        <p>사업자 정보: wow3d (상호·대표자·사업자등록번호·통신판매업 신고번호·주소·연락처: {TBD})</p>
        <p>시행일: {TBD}</p>
      </section>
    </LegalPage>
  );
}

/* ───────── 오픈소스 라이선스 ───────── */
const OSS = [
  { name: 'React · React DOM', version: '18.3.1', license: 'MIT', file: '/licenses/react-MIT.txt', by: 'Meta Platforms, Inc.' },
  { name: 'React Router', version: '6.30.6', license: 'MIT', file: '/licenses/react-router-MIT.txt', by: 'Remix Software Inc.' },
  { name: '프리텐다드 (Pretendard)', version: '1.3.9', license: 'SIL Open Font License 1.1', file: '/licenses/pretendard-OFL.txt', by: 'Kil Hyung-jin' },
  { name: '배민 주아체 (Jua)', version: '5.3.0 (Fontsource)', license: 'SIL Open Font License 1.1', file: '/licenses/jua-OFL.txt', by: 'The BM JUA Project Authors (우아한형제들)' },
];

export function LicensesPage() {
  return (
    <LegalPage path="/licenses" heading="오픈소스 라이선스" crumb="오픈소스 라이선스" notice="토이북은 아래 오픈소스 소프트웨어와 글꼴을 사용해요. 각 라이선스 전문은 링크에서 볼 수 있어요.">
      <div className="legal-table-wrap">
        <table className="legal-table">
          <thead>
            <tr>
              <th scope="col">이름</th>
              <th scope="col">버전</th>
              <th scope="col">저작권자</th>
              <th scope="col">라이선스</th>
            </tr>
          </thead>
          <tbody>
            {OSS.map((o) => (
              <tr key={o.name}>
                <td>{o.name}</td>
                <td>{o.version}</td>
                <td>{o.by}</td>
                <td>
                  <a href={o.file}>{o.license}</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>글꼴은 원본을 고치지 않고 사이트에 쓰이는 글자만 골라 담아(서브셋) 사용해요. 글꼴 파일만 따로 판매하지 않아요.</p>
    </LegalPage>
  );
}
