import Link from 'next/link'

export default function Home() {
  return (
    <main>
      <p className="eyebrow">Escola e comunidade</p>
      <h1>Conecta Comunidade</h1>
      <p>
        Um espaço para conectar as necessidades da escola às habilidades de quem
        faz parte da sua comunidade.
      </p>
      <Link href="/admin">Acesso da gestão</Link>
      <p>
        <Link className="text-link" href="/recuperar-acesso">
          Recuperar acesso
        </Link>
      </p>
    </main>
  )
}
