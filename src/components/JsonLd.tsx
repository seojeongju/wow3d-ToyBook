/**
 * 구조화 데이터(JSON-LD) 출력. 미리 그리기(prerender) 결과 HTML 에 그대로 들어가 검색·AI 로봇이 읽음.
 * '<' 를 이스케이프해서 데이터 안의 글자가 </script> 로 끊기지 않게 함.
 */
export default function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
