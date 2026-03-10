import { captionTextClass, surfaceClass } from "../theme";

interface QuoteCardProps {
  quote: string;
  author?: string;
  source?: string;
}

export default function QuoteCard({ quote, author, source }: QuoteCardProps) {
  return (
    <div className={`${surfaceClass} p-6`}>
      <blockquote className="text-lg font-medium italic leading-relaxed text-foreground">
        &ldquo;{quote}&rdquo;
      </blockquote>
      {(author || source) && (
        <div className={`mt-3 ${captionTextClass}`}>
          {author && <span className="font-medium text-foreground">{author}</span>}
          {author && source && <span> &mdash; </span>}
          {source && <span className="italic">{source}</span>}
        </div>
      )}
    </div>
  );
}
