import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-16 text-slate-950">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
        <h1 className="text-4xl font-semibold">Smart Doorbell</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          A simple doorbell app with a host video endpoint and visitor call page. Create a door ID in Admin, then open the host page and scan the visitor QR code.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin"
            className="rounded-2xl bg-slate-950 px-6 py-4 text-center text-white transition hover:bg-slate-800"
          >
            Admin / QR Generator
          </Link>
          <Link
            href="/host/example-door"
            className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-center text-slate-950 transition hover:border-slate-300"
          >
            Open Host Page
          </Link>
        </div>

        <div className="mt-10 rounded-2xl bg-slate-100 p-6">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <ol className="mt-4 space-y-3 text-slate-700">
            <li>1. Go to Admin and create a door ID.</li>
            <li>2. Open the host page for that door ID.</li>
            <li>3. The visitor scans the QR code and calls the host.</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
