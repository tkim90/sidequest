interface StackedNotesIconProps {
  className?: string;
}

function StackedNotesIcon({ className = "h-4 w-4" }: StackedNotesIconProps) {
  return (
    <svg
      aria-hidden
      className={className}
      data-stacked-notes-icon="true"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        fill="#F8F4EE"
        height="9.6"
        rx="1.8"
        stroke="currentColor"
        strokeWidth="1.3"
        width="9.5"
        x="6.2"
        y="4.1"
      />
      <rect
        fill="#F8F4EE"
        height="9.6"
        rx="1.8"
        stroke="currentColor"
        strokeWidth="1.3"
        width="9.5"
        x="4.3"
        y="6"
      />
    </svg>
  );
}

export default StackedNotesIcon;
