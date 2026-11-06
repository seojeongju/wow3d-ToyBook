-- 로컬 개발용 데모 데이터. 운영 DB 에는 넣지 마세요.
INSERT INTO parents (id, display_name, consent_at) VALUES
  ('demo-parent', '데모 부모', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));

INSERT INTO children (id, parent_id, nickname, birth_year, avatar, age_mode, likes) VALUES
  ('child-minji', 'demo-parent', '민지', 2021, '🐰', 'sprout', '토끼, 딸기, 그림 그리기'),
  ('child-junho', 'demo-parent', '준호', 2018, '🦖', 'kid', '공룡, 로봇, 블록');

INSERT INTO books (id, parent_id, child_id, title, cover_emoji, status) VALUES
  ('book-brush', 'demo-parent', 'child-minji', '민지와 반짝반짝 치카 요정', '🪥', 'done'),
  ('book-dino',  'demo-parent', 'child-junho', '준호와 꼬마 공룡 로봇', '🦖', 'done');

INSERT INTO book_pages (id, book_id, page_no, text, layout_json) VALUES
  ('p-brush-1', 'book-brush', 1, '어느 날 밤, 민지의 칫솔이 반짝반짝 빛나기 시작했어요.', '{"emoji":"🌙","bg":"#E8E4FF"}'),
  ('p-brush-2', 'book-brush', 2, '"안녕, 민지야! 나는 치카 요정이야." 작은 요정이 웃으며 인사했어요.', '{"emoji":"🧚","bg":"#FFE8F0"}'),
  ('p-brush-3', 'book-brush', 3, '"이를 닦지 않으면 충치 벌레들이 놀러 온단다." 요정이 말했어요.', '{"emoji":"🦷","bg":"#E4F6FF"}'),
  ('p-brush-4', 'book-brush', 4, '민지는 위아래로 치카치카, 동글동글 치카치카 이를 닦았어요.', '{"emoji":"🪥","bg":"#E6FAEC"}'),
  ('p-brush-5', 'book-brush', 5, '충치 벌레들은 깜짝 놀라 멀리멀리 도망갔어요. 민지의 이가 반짝반짝!', '{"emoji":"✨","bg":"#FFF6D9"}'),
  ('p-dino-1',  'book-dino',  1, '준호는 블록으로 아주 커다란 공룡 로봇을 만들었어요.', '{"emoji":"🧱","bg":"#FFF0DC"}'),
  ('p-dino-2',  'book-dino',  2, '그런데 갑자기 로봇이 "쿠웅!" 하고 눈을 떴어요.', '{"emoji":"🤖","bg":"#E4F6FF"}'),
  ('p-dino-3',  'book-dino',  3, '"준호야, 우리 같이 공룡 섬으로 모험을 떠나자!"', '{"emoji":"🏝️","bg":"#E6FAEC"}'),
  ('p-dino-4',  'book-dino',  4, '공룡 섬 친구들과 신나게 놀고, 둘은 노을을 보며 집으로 돌아왔어요.', '{"emoji":"🌅","bg":"#FFE8F0"}');
