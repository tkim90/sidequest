interface NoticeToastProps {
  notice: string;
}

function NoticeToast({ notice }: NoticeToastProps) {
  if (!notice) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-[60] max-w-80 border border-primary bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground shadow-[var(--toast-shadow)]">
      {notice}
    </div>
  );
}

export default NoticeToast;
