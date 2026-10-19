import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="text-5xl font-semibold text-white/15">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-white">Esta página não existe — ou é privada.</h1>
      <p className="mt-2 text-sm text-white/50">
        Projetos só aparecem publicamente depois de compartilhados. Se você tem o link correto, verifique se a sessão está ativa.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link href="/" className="btn-primary px-5 py-2.5">Voltar ao início</Link>
        <Link href="/discover" className="btn-secondary px-5 py-2.5">Descobrir projetos</Link>
      </div>
    </div>
  );
}
