import Link from "next/link";

export default function NotFound() {
  return <main className="empty-state"><h1>No encontramos esta página</h1><p>Tu próxima historia puede empezar desde el catálogo.</p><Link href="/explorar" className="button primary">Volver al inicio</Link></main>;
}
