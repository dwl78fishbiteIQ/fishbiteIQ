export function AmpText({ text, className }: { text: string; className?: string }) {
  if (!text.includes("&")) return className ? <span className={className}>{text}</span> : text;
  const parts = text.split("&");
  return (
    <span className={className}>
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 ? <span className="font-amp">&</span> : null}
          {part}
        </span>
      ))}
    </span>
  );
}
