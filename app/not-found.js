import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-md p-10 text-center">
      <p className="text-4xl">🐛</p>
      <h1 className="mt-2 text-xl font-bold">No encontramos esa página</h1>
      <Link href="/retos" className="btn-primary mt-4">Ir a los retos</Link>
    </div>
  );
}
