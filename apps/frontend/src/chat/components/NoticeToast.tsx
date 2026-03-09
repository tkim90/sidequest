interface NoticeToastProps {
  notice: string;
}

function NoticeToast({ notice }: NoticeToastProps) {
  if (!notice) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-[60] max-w-80 border border-zinc-950 bg-zinc-950 px-4 py-3 text-sm leading-6 text-zinc-50 shadow-[8px_8px_0_0_rgba(24,24,27,0.2)]">
      {notice}
    </div>
  );
}

export default NoticeToast;
