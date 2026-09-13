const items = [
  "Homemade chilli oil",
  "Made in small batches",
  "Heat + crunch",
] as const;

export default function AccentStrip() {
  return (
    <div className="bg-blue">
      <p className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-3 text-center text-[0.7rem] font-bold tracking-[0.14em] text-white uppercase sm:gap-x-5 sm:text-sm sm:tracking-[0.18em]">
        {items.map((item, index) => (
          // The separator is trailing rather than leading, so a wrapped line
          // never begins with a stray bullet.
          <span key={item} className="inline-flex items-center gap-3">
            {item}
            {index < items.length - 1 && (
              <span aria-hidden="true" className="text-white/50">
                &bull;
              </span>
            )}
          </span>
        ))}
      </p>
    </div>
  );
}
