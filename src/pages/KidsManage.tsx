import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, AVATARS, childApi, type Child, type ChildForm } from '../api';
import { useMe } from '../auth';
import ClayArt, { ClayEmoji } from '../components/ClayArt';
import DashLayout from '../components/DashLayout';
import { PARENT_MENU, parentProfile, useLeaveParent, useRelock } from '../components/ParentArea';
import { isParentUnlocked } from '../parentLock';
import { useAsync } from '../useAsync';

/**
 * 우리 아이 (회원가입 2단계, PRD 9.1): 아이 프로필 만들기·고치기·지우기.
 * 실명·연락처 없이 별명·태어난 해·캐릭터·좋아하는 것만. 나이에 따라 화면 모드(PRD 8.5)를 고름
 */
const MODES: { key: Child['age_mode']; label: string; ages: string }[] = [
  { key: 'sprout', label: '새싹', ages: '3~5세' },
  { key: 'kid', label: '꼬마 작가', ages: '6~8세' },
  { key: 'author', label: '작가', ages: '9~12세' },
];

const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => thisYear - 3 - i);

function modeFor(year: number): Child['age_mode'] {
  const age = thisYear - year;
  return age <= 5 ? 'sprout' : age <= 8 ? 'kid' : 'author';
}

const EMPTY: ChildForm = { nickname: '', birthYear: thisYear - 6, avatar: AVATARS[0], likes: '' };

export default function KidsManage() {
  const { loading, user } = useMe();
  const leave = useLeaveParent();
  const relock = useRelock();
  const [n, setN] = useState(0);
  const children = useAsync(api.children, [n]);
  const [editing, setEditing] = useState<{ id: string | null; form: ChildForm } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isParentUnlocked()) return <Navigate to="/parent?next=/dashboard/kids" replace />;

  const member = user?.status === 'active';
  const kids = children.status === 'ok' ? children.data : [];

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      if (editing.id) await childApi.update(editing.id, editing.form);
      else await childApi.create(editing.form);
      setNotice(editing.id ? '고쳤어요!' : `${editing.form.nickname} 프로필을 만들었어요!`);
      setEditing(null);
      setN((v) => v + 1);
    } catch (err) {
      if (!relock(err)) setError(err instanceof Error ? err.message : '저장하지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: Child) => {
    if (!window.confirm(`${c.nickname} 프로필을 지울까요?\n이 아이의 책과 그림도 모두 지워지고 되돌릴 수 없어요.`)) return;
    try {
      await childApi.remove(c.id);
      setNotice(`${c.nickname} 프로필을 지웠어요`);
      setN((v) => v + 1);
    } catch (err) {
      if (!relock(err)) setNotice(err instanceof Error ? err.message : '지우지 못했어요');
    }
  };

  const set = (patch: Partial<ChildForm>) => setEditing((e) => e && { ...e, form: { ...e.form, ...patch } });

  return (
    <DashLayout title="우리 아이" profile={parentProfile(user, loading)} menu={PARENT_MENU} active={1} onLogout={leave}>
      {!loading && !member && (
        <p className="demo-banner">
          지금은 데모 가족이에요. <Link to="/login?next=/dashboard/kids">로그인하면 우리 아이 프로필을 만들 수 있어요</Link>
        </p>
      )}

      <section className="kids-intro">
        <h2>아이 프로필</h2>
        <p>
          아이마다 책장이 따로 생겨요. 이름 대신 <strong>별명</strong>을 쓰고, 연락처나 사진은 받지 않아요. 한 가족에 6명까지 만들 수 있어요.
        </p>
      </section>

      {children.status === 'error' && <p className="error">{children.message}</p>}

      <ul className="kids-list">
        {kids.map((c) => {
          const mode = MODES.find((m) => m.key === c.age_mode);
          return (
            <li key={c.id} className="kids-item">
              <span className="kids-face" aria-hidden>
                <ClayEmoji emoji={c.avatar} size={64} />
              </span>
              <div className="kids-info">
                <strong>{c.nickname}</strong>
                <span>
                  {c.birth_year ? `${c.birth_year}년생 · ` : ''}
                  {mode ? `${mode.label} 화면` : ''}
                  {c.likes ? ` · 좋아하는 것: ${c.likes}` : ''}
                </span>
              </div>
              {member && (
                <div className="kids-actions">
                  <button
                    type="button"
                    className="pill-btn small-pill alt"
                    onClick={() =>
                      setEditing({
                        id: c.id,
                        form: { nickname: c.nickname, birthYear: c.birth_year ?? thisYear - 6, avatar: c.avatar, likes: c.likes ?? '', ageMode: c.age_mode },
                      })
                    }
                  >
                    고치기
                  </button>
                  <button type="button" className="text-danger" onClick={() => remove(c)}>
                    지우기
                  </button>
                </div>
              )}
            </li>
          );
        })}
        {children.status === 'ok' && kids.length === 0 && (
          <li className="kids-empty">
            <ClayArt name="sprout" size={72} />
            <p>아직 아이 프로필이 없어요. 아래에서 첫 프로필을 만들어 주세요.</p>
          </li>
        )}
      </ul>

      {member && !editing && kids.length < 6 && (
        <button type="button" className="pill-btn kids-add" onClick={() => setEditing({ id: null, form: EMPTY })}>
          + 아이 프로필 만들기
        </button>
      )}

      {editing && (
        <form className="kids-form" onSubmit={save}>
          <h2>{editing.id ? '프로필 고치기' : '새 아이 프로필'}</h2>

          <label className="kids-field">
            <span>별명</span>
            <input
              value={editing.form.nickname}
              onChange={(e) => set({ nickname: e.target.value })}
              maxLength={10}
              placeholder="예: 토끼, 꼬마 공룡 (실명 대신 별명)"
              required
              autoFocus
            />
          </label>

          <label className="kids-field">
            <span>태어난 해</span>
            <select
              value={editing.form.birthYear}
              onChange={(e) => {
                const y = Number(e.target.value);
                set({ birthYear: y, ageMode: modeFor(y) });
              }}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}년 (올해 {thisYear - y}살)
                </option>
              ))}
            </select>
          </label>

          <fieldset className="kids-field">
            <legend>캐릭터</legend>
            <div className="kids-avatars">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={editing.form.avatar === a ? 'on' : ''}
                  aria-pressed={editing.form.avatar === a}
                  onClick={() => set({ avatar: a })}
                >
                  <ClayEmoji emoji={a} size={56} />
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="kids-field">
            <legend>화면 모드</legend>
            <div className="kids-modes">
              {MODES.map((m) => {
                const on = (editing.form.ageMode ?? modeFor(editing.form.birthYear)) === m.key;
                return (
                  <button key={m.key} type="button" className={on ? 'on' : ''} aria-pressed={on} onClick={() => set({ ageMode: m.key })}>
                    <strong>{m.label}</strong>
                    <span>{m.ages}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <label className="kids-field">
            <span>좋아하는 것 (선택)</span>
            <input value={editing.form.likes} onChange={(e) => set({ likes: e.target.value })} maxLength={40} placeholder="예: 공룡, 블록, 딸기" />
            <small>그림책 이야기를 만들 때 참고해요.</small>
          </label>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <div className="kids-form-actions">
            <button type="submit" className="pill-btn" disabled={busy}>
              {editing.id ? '고친 내용 저장' : '만들기'}
            </button>
            <button type="button" className="pill-btn small-pill alt" onClick={() => setEditing(null)} disabled={busy}>
              취소
            </button>
          </div>
        </form>
      )}

      {notice && (
        <div className="toast" role="status" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}
    </DashLayout>
  );
}
