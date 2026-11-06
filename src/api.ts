export interface Child {
  id: string;
  nickname: string;
  birth_year: number | null;
  avatar: string;
  /** PRD 8.5: 새싹(3~5세) / 꼬마 작가(6~8세) / 작가(9~12세) */
  age_mode: 'sprout' | 'kid' | 'author';
  likes: string | null;
}

export interface BookSummary {
  id: string;
  child_id: string | null;
  title: string;
  format: 'picture' | 'webtoon';
  cover_key: string | null;
  cover_emoji: string;
  status: 'draft' | 'done';
  updated_at: string;
  page_count: number;
}

export interface Page {
  id: string;
  page_no: number;
  text: string;
  image_key: string | null;
  layout: { emoji?: string; bg?: string };
}

export interface BookDetail {
  book: BookSummary;
  pages: Page[];
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `요청 실패 (${res.status})`);
  }
  return res.json();
}

export const api = {
  children: () => get<{ children: Child[] }>('/api/children').then((r) => r.children),
  books: (childId?: string) =>
    get<{ books: BookSummary[] }>(`/api/books${childId ? `?childId=${encodeURIComponent(childId)}` : ''}`).then(
      (r) => r.books,
    ),
  book: (id: string) => get<BookDetail>(`/api/books/${encodeURIComponent(id)}`),
};

export const fileUrl = (key: string) => `/api/files/${key}`;
