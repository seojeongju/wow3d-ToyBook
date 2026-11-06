import asyncio
import os
import edge_tts

VOICE = "ko-KR-SunHiNeural"
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "audio")

# (파일명, 대사, 말하기 속도, 음높이)
CLIPS = [
    # 1. 히어로 섹션 캐릭터별 인사 (밝고 경쾌한 톤)
    ("hero-1.mp3", "안녕! 나를 누르면 동화 속 친구들이 장난감으로 튀어나와요!", "+4%", "+6Hz"),
    ("hero-2.mp3", "네가 그린 그림도 세상에 하나뿐인 쓰리디 피규어로 변신해!", "+4%", "+6Hz"),
    ("hero-3.mp3", "책 속에서 뿅! 나랑 같이 재미있는 동화책 만들래?", "+4%", "+6Hz"),
    ("hero-4.mp3", "와우쓰리디 장난감 공장에서 진짜 피규어로 만나요!", "+4%", "+6Hz"),
    ("hero-star-pick.mp3", "반가워! 나는 반짝반짝 별곰이야! 책 속에서 장난감으로 튀어나왔어!", "+4%", "+6Hz"),
    ("hero-rabbit-pick.mp3", "깡총깡총 안녕! 나는 달님 토끼야! 오늘 밤 어떤 동화를 만들어 볼까?", "+4%", "+7Hz"),
    ("hero-rabbit-2.mp3", "내 귀엽고 긴 귀도 쓰리디 프린터로 똑같이 만들어 줘요!", "+4%", "+7Hz"),
    ("hero-dino-pick.mp3", "크앙! 반가워! 나는 꼬마 공룡이야! 신나는 모험 동화를 만들자!", "+3%", "+5Hz"),
    ("hero-dino-2.mp3", "블록으로 만든 공룡 친구도 진짜 장난감 피규어로 변신해!", "+3%", "+5Hz"),
    ("hero-robot-pick.mp3", "삐빅! 안녕! 나는 장난감 로봇이야! 우주 끝까지 날아가 볼까?", "+4%", "+5Hz"),
    ("hero-robot-2.mp3", "내 멋진 로봇 팔과 날개도 쓰리디 프린터로 뚝딱 만들어 줘요!", "+4%", "+5Hz"),
    ("hero-fairy-pick.mp3", "반짝반짝 안녕! 나는 치카 요정이야! 오늘도 이가 반짝반짝 빛나네!", "+4%", "+7Hz"),
    ("hero-fairy-2.mp3", "요술 칫솔을 흔들면 동화 속 요정 친구가 장난감으로 튀어나와요!", "+4%", "+7Hz"),

    # 2. 프로필 선택 (누가 볼까요?)
    ("who-guide.mp3", "누가 볼까요? 내 얼굴을 눌러 주세요", "+0%", "+4Hz"),
    ("who-minji.mp3", "민지야 반가워! 책장으로 가 볼까?", "+4%", "+6Hz"),
    ("who-junho.mp3", "준호야 반가워! 책장으로 가 볼까?", "+4%", "+6Hz"),

    # 3. 우리 집 책장 안내 멘트
    ("shelf-open-brush.mp3", "민지와 반짝반짝 치카 요정을 펼쳐요!", "+2%", "+4Hz"),
    ("shelf-open-dino.mp3", "준호와 꼬마 공룡 로봇을 펼쳐요!", "+2%", "+4Hz"),
    ("shelf-new-book.mp3", "이야기 공방에서 새 책을 만들 수 있어요. 곧 열려요!", "+0%", "+3Hz"),
    ("shelf-room-wood.mp3", "나무 책장으로 바꿨어요!", "+3%", "+5Hz"),
    ("shelf-room-cloud.mp3", "구름 책장으로 바꿨어요!", "+3%", "+5Hz"),
    ("shelf-room-desk.mp3", "내 책상으로 바꿨어요!", "+3%", "+5Hz"),
    ("shelf-room-photo.mp3", "내 방 사진으로 책장을 만드는 기능은 곧 열려요. 어른과 함께 해요!", "+0%", "+3Hz"),
    ("shelf-here-minji.mp3", "여기는 민지의 책장이에요", "+2%", "+4Hz"),
    ("shelf-here-junho.mp3", "여기는 준호의 책장이에요", "+2%", "+4Hz"),
    ("shelf-here-default.mp3", "여기는 우리 집 책장이에요", "+2%", "+4Hz"),
    ("shelf-soon-studio.mp3", "이야기 공방은 곧 열려요!", "+2%", "+4Hz"),
    ("shelf-soon-magic.mp3", "마법 상자는 곧 열려요!", "+2%", "+4Hz"),
    ("shelf-soon-factory.mp3", "장난감 공장은 곧 열려요!", "+2%", "+4Hz"),

    # 4. 데모 동화책 1: 민지와 반짝반짝 치카 요정 (다정한 동화 구연 톤)
    ("p-brush-1.mp3", "어느 날 밤, 민지의 칫솔이 반짝반짝 빛나기 시작했어요.", "-4%", "+2Hz"),
    ("p-brush-2.mp3", "안녕, 민지야! 나는 치카 요정이야. 작은 요정이 웃으며 인사했어요.", "-3%", "+3Hz"),
    ("p-brush-3.mp3", "이를 닦지 않으면 충치 벌레들이 놀러 온단다. 요정이 말했어요.", "-4%", "+2Hz"),
    ("p-brush-4.mp3", "민지는 위아래로 치카치카, 동글동글 치카치카 이를 닦았어요.", "-3%", "+3Hz"),
    ("p-brush-5.mp3", "충치 벌레들은 깜짝 놀라 멀리멀리 도망갔어요. 민지의 이가 반짝반짝!", "-2%", "+4Hz"),

    # 5. 데모 동화책 2: 준호와 꼬마 공룡 로봇 (생동감 있는 동화 구연 톤)
    ("p-dino-1.mp3", "준호는 블록으로 아주 커다란 공룡 로봇을 만들었어요.", "-3%", "+2Hz"),
    ("p-dino-2.mp3", "그런데 갑자기 로봇이 쿠웅! 하고 눈을 떴어요.", "-2%", "+3Hz"),
    ("p-dino-3.mp3", "준호야, 우리 같이 공룡 섬으로 모험을 떠나자!", "+2%", "+5Hz"),
    ("p-dino-4.mp3", "공룡 섬 친구들과 신나게 놀고, 둘은 노을을 보며 집으로 돌아왔어요.", "-4%", "+2Hz"),
]


async def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    sem = asyncio.Semaphore(5)

    async def gen(filename: str, text: str, rate: str, pitch: str):
        async with sem:
            out_path = os.path.join(OUT_DIR, filename)
            comm = edge_tts.Communicate(text=text, voice=VOICE, rate=rate, pitch=pitch)
            await comm.save(out_path)
            print(f"Generated: {filename}")

    await asyncio.gather(*(gen(f, t, r, p) for f, t, r, p in CLIPS))


if __name__ == "__main__":
    asyncio.run(main())

