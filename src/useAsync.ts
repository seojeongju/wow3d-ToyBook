import { useEffect, useState } from 'react';

type State<T> = { status: 'loading' } | { status: 'ok'; data: T } | { status: 'error'; message: string };

/** 화면 진입 시 한 번 불러오는 간단한 데이터 훅 */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[]): State<T> {
  const [state, setState] = useState<State<T>>({ status: 'loading' });
  useEffect(() => {
    let alive = true;
    setState({ status: 'loading' });
    load().then(
      (data) => alive && setState({ status: 'ok', data }),
      (e: Error) => alive && setState({ status: 'error', message: e.message }),
    );
    return () => {
      alive = false;
    };
  }, deps);
  return state;
}
