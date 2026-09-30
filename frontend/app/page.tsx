import Image from "next/image";

// Placeholder until the Phase 1 home page is built.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <Image
        src="/Alcom-logo.png"
        alt="Alcom Consultants Limited"
        width={1218}
        height={858}
        priority
        className="h-auto w-48"
      />
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Alcom Consultants Limited
      </h1>
      <p className="max-w-md text-zinc-600">
        Property agency, property management and valuations. Our new website is
        coming soon.
      </p>
    </main>
  );
}
