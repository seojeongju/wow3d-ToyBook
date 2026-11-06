/** 마지막 글자에 받침이 있는지 (한글이 아니면 받침 없음으로 봄) */
export function hasBatchim(word: string): boolean {
  const c = word.trim().charCodeAt(word.trim().length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
}

/** 받침에 맞는 조사 붙이기: josa('요정', '을', '를') → '요정을' */
export function josa(word: string, withBatchim: string, withoutBatchim: string): string {
  return word + (hasBatchim(word) ? withBatchim : withoutBatchim);
}
