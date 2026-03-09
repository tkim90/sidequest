interface NoticeToastProps {
  notice: string;
}

function NoticeToast({ notice }: NoticeToastProps) {
  if (!notice) {
    return null;
  }

  return <div className="notice-toast">{notice}</div>;
}

export default NoticeToast;
