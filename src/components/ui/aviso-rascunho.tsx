'use client';

/** Aviso no topo de um cadastro novo que voltou de um rascunho guardado no aparelho. */
export function AvisoRascunho({ aoDescartar }: { aoDescartar: () => void }) {
  return (
    <div role="status" className="entra mt-2 flex items-center justify-between gap-3 rounded-2xl bg-verde-suave px-4 py-3 text-[13px]">
      <span>
        <b className="font-semibold">Rascunho recuperado.</b> <span className="text-tinta-2">Continue de onde parou.</span>
      </span>
      <button
        type="button"
        onClick={aoDescartar}
        className="foco shrink-0 rounded-pilula px-2.5 py-1 font-semibold text-tinta-2 transition-colors hover:bg-superficie hover:text-tinta"
      >
        Descartar
      </button>
    </div>
  );
}
