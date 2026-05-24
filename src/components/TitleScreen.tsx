type Props = {
  onBegin: () => void;
};

export function TitleScreen({ onBegin }: Props) {
  return (
    <div className="relative w-full h-full flex items-center justify-center grain overflow-y-auto">
      <img
        src="/images/loc_arrival.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: 'brightness(0.45)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90" />

      <div className="relative z-10 text-center px-6 md:px-8 max-w-3xl py-12 animate-fade-in-slow">
        <p className="font-display tracking-[0.3em] md:tracking-[0.4em] text-sepia-300 text-xs md:text-sm mb-3 md:mb-4">
          AN INVESTIGATION IN
        </p>
        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl tracking-wider text-sepia-100 mb-2 leading-tight">
          The Harrow Manor
        </h1>
        <p className="font-display text-2xl md:text-3xl tracking-widest text-sepia-200 mb-8 md:mb-12 italic">
          Affair
        </p>
        <p className="text-sepia-200/80 italic font-serif text-base md:text-lg mb-10 md:mb-12 max-w-xl mx-auto leading-relaxed">
          A locked room. A poisoned flask. A house full of people who would rather you went home.
          You have twelve hours before the constables come.
        </p>
        <button
          onClick={onBegin}
          className="px-8 md:px-12 py-3 md:py-4 border border-sepia-300/50 rounded font-display tracking-[0.25em] md:tracking-[0.3em] text-base md:text-lg text-sepia-100 hover:bg-sepia-300/10 transition-all hover:tracking-[0.35em] md:hover:tracking-[0.4em]"
        >
          ▸ BEGIN
        </button>
        <p className="mt-12 md:mt-16 text-xs text-sepia-400/60 tracking-widest font-display">
          ENGLAND · 1835
        </p>
      </div>
    </div>
  );
}
