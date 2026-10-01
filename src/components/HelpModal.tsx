export default function HelpModal({ onClose }: { onClose: () => void }) {
  const rows: Array<[string, string, string]> = [
    ["🌋", "용암 웅덩이", "드래그로 넓게 깔수록 용사가 점프로 못 넘는다. 5칸이면 사실상 확정 피해!"],
    ["🗡️", "낙하 가시", "용사가 다가오면 천장에서 떨어진다. 눈치채고 멈춰도 그만큼 시간을 번다."],
    ["👺", "화염 졸개", "불을 뿜는다. 밟히면 죽지만, 레벨 3부터 가시 투구로 밟은 용사도 아프다."],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="max-h-full w-full max-w-2xl overflow-y-auto rounded-3xl border-4 border-[#1b1020] bg-gradient-to-b from-[#2c1230] to-[#160a1c] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-3xl font-black text-yellow-300">📖 마왕의 생존 수칙</h2>
          <button onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1 text-lg hover:bg-white/20">
            ✕
          </button>
        </div>
        <ul className="space-y-3 text-white/90">
          <li>
            <b className="text-rose-300">목표</b> · 마왕은 앞으로 자동으로 달린다. 뒤에서 쫓아오는 <b>용사</b>가 마왕에게 닿기 전에,
            성문에 도착하기 전에 <b>함정으로 용사를 쓰러뜨려라</b>.
          </li>
          <li>
            <b className="text-emerald-300">설치</b> · 화면의 <b>초록색 구역</b>(용사와 마왕 사이 바닥)을 <b>클릭</b>하거나{" "}
            <b>드래그</b>하면 트랩이 즉석에서 생긴다. 마나(💜)를 소모하고 시간이 지나면 차오른다.
          </li>
          <li>
            <b className="text-orange-300">포효</b> · <kbd className="rounded bg-white/20 px-2">Space</kbd> 또는 우클릭. 용사를 멀리
            밀어내고 잠시 느리게 만든다. 용사가 코앞일 때의 비상 버튼!
          </li>
          <li>
            <b className="text-sky-300">단축키</b> · <kbd className="rounded bg-white/20 px-2">1</kbd>{" "}
            <kbd className="rounded bg-white/20 px-2">2</kbd> <kbd className="rounded bg-white/20 px-2">3</kbd> 트랩 선택 ·{" "}
            <kbd className="rounded bg-white/20 px-2">Esc</kbd> 일시정지
          </li>
          <li>
            <b className="text-violet-300">용사 AI</b> · 앞의 트랩을 보고 점프 타이밍을 계산해 뛰어넘는다. 착지 지점의 함정까지
            피하려 하니, <b>트랩을 조합해서 착지 지점을 노려라</b>.
          </li>
        </ul>
        <div className="mt-5 space-y-2">
          {rows.map(([icon, name, desc]) => (
            <div key={name} className="flex items-start gap-3 rounded-xl bg-black/30 p-3">
              <div className="text-3xl">{icon}</div>
              <div>
                <div className="font-black">{name}</div>
                <div className="text-sm text-white/70">{desc}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-white/60">
          💎 런이 끝나면 <b>다크젬</b>을 얻는다. 트랩 강화, 보스 진화, 던전 시설 확장으로 더 강한 용사에게 도전하자!
        </p>
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-2xl border-4 border-[#1b1020] bg-gradient-to-b from-orange-400 to-red-600 py-3 text-xl font-black hover:brightness-110"
        >
          알겠다, 마왕 출격!
        </button>
      </div>
    </div>
  );
}
