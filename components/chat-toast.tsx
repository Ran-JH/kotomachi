interface ChatToastProps {
  toast: { message: string; tone: "info" | "success" | "error" } | null;
}

export function ChatToast({ toast }: ChatToastProps) {
  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-4 right-4 top-4 z-[70] mx-auto max-w-sm rounded-xl border px-4 py-3 text-sm leading-relaxed shadow-[0_10px_30px_rgba(40,35,26,0.14)] md:left-auto md:right-5 md:mx-0 ${
        toast.tone === "error"
          ? "border-[#B86B5E]/25 bg-[#FAF6EE] text-[#7A3E35]"
          : "border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] text-[#2D4A1F]"
      }`}
    >
      {toast.message}
    </div>
  );
}
