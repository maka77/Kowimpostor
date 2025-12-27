import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-12">
      <div className="space-y-4">
        <h1 className="text-5xl font-light tracking-[0.2em] uppercase text-neutral-400">
          El Impostor
        </h1>
        <p className="text-neutral-600 max-w-md mx-auto text-sm leading-relaxed">
          Paren al impostor🤚, no la regales, pensá!
          <br />Confía en nadie.
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link href="/host" className="btn btn-primary text-center py-4">
          Iniciar como Host
        </Link>
        {/* Players join via email link, but maybe entering code manually? MVP says link only. */}
      </div>

      <footer className="fixed bottom-8 text-neutral-800 text-xs">
        v0.1.0 MVP
      </footer>
    </main>
  );
}
