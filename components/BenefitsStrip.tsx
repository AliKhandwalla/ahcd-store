const benefits = [
  {
    title: "Small Batch",
    copy: "Made and jarred in small runs.",
  },
  {
    title: "Heat + Crunch",
    copy: "Texture and spice in the same spoonful.",
  },
  {
    title: "Made by AHCD",
    copy: "Made and packed by Ali himself.",
  },
] as const;

export default function BenefitsStrip() {
  return (
    <section aria-label="What AHCD is about" className="bg-navy">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ul className="grid divide-y divide-navy-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {benefits.map((benefit) => (
            <li key={benefit.title} className="px-1 py-8 sm:px-6 sm:py-10">
              <h3 className="display-hed text-xl text-flame sm:text-2xl">
                {benefit.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-cream/75 sm:text-base">
                {benefit.copy}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
