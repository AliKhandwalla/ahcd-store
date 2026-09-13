/**
 * Renders stored body text as paragraphs.
 *
 * Plain text only — split on blank lines and emitted as React children, never
 * dangerouslySetInnerHTML. Content from the database therefore cannot inject
 * markup or script, no matter what is typed into the editor.
 */
export default function UpdateBody({ text }: { text: string }) {
  const paragraphs = text
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="space-y-5 text-base leading-relaxed text-cream/85 sm:text-lg">
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
