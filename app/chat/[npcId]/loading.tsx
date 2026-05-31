export default function ChatRouteLoading() {
  return (
    <main className="min-h-[100dvh] bg-[#F3EDE0] flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-[rgba(40,35,26,0.08)] bg-[#FAF6EE]/95 px-5 py-5 shadow-[0_6px_24px_rgba(40,35,26,0.08)]">
        <p className="text-sm font-medium text-[#2D4A1F]">正在走进言街…</p>
        <p className="mt-1 text-xs text-[#7A7060]">正在准备对话…</p>
        <p className="mt-3 text-xs text-[#6B6254]">Entering Kotomachi…</p>
        <p className="mt-1 text-xs text-[#7A7060]">Getting the conversation ready…</p>
      </div>
    </main>
  );
}
