"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export type Ver = "aguardando" | "gerando" | "falhou" | "feitos" | "cancelados" | "todos";
export type Item = { id: string; titulo: string; data: string; capa: string | null; grupo: Exclude<Ver, "todos"> | null };

const OPCOES: [Ver, string][] = [
  ["aguardando", "Aguardando você"],
  ["gerando", "Gerando"],
  ["falhou", "Falhou"],
  ["feitos", "Feitos"],
  ["cancelados", "Cancelados"],
  ["todos", "Todos"],
];

const pequeno = { padding: "4px 10px", fontSize: 13 };

export default function Lista({ itens, ver: inicial }: { itens: Item[]; ver?: string }) {
  const router = useRouter();
  const [ver, setVer] = useState<Ver>(OPCOES.some(([v]) => v === inicial) ? (inicial as Ver) : "aguardando");
  const [menu, setMenu] = useState(false);
  const [selecionando, setSelecionando] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);

  const conta = (v: Ver) => (v === "todos" ? itens.length : itens.filter((i) => i.grupo === v).length);
  const lista = ver === "todos" ? itens : itens.filter((i) => i.grupo === ver);

  function trocar(v: Ver) {
    setVer(v);
    sair();
    router.replace(`?ver=${v}`, { scroll: false });
  }

  function sair() {
    setSelecionando(false);
    setSel([]);
  }

  const alterna = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function emLote(init: RequestInit, confirma?: string) {
    if (!sel.length || ocupado) return;
    if (confirma && !confirm(confirma)) return;
    setOcupado(true);
    const falhas: string[] = [];
    for (const id of sel) {
      try {
        const r = await fetch(`/api/carousel/${id}`, init);
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          falhas.push(`${itens.find((i) => i.id === id)?.titulo || id}: ${d.erro || r.status}`);
        }
      } catch (e: any) {
        falhas.push(`${itens.find((i) => i.id === id)?.titulo || id}: ${e.message}`);
      }
    }
    if (falhas.length) alert("Não deu certo em:\n" + falhas.join("\n"));
    setOcupado(false);
    sair();
    router.refresh();
  }

  const n = sel.length;
  return (
    <div className="card" style={{ marginTop: 18, padding: 0 }}>
      <div className="row" style={{ padding: 12, justifyContent: "space-between", flexWrap: "nowrap" }}>
        <div style={{ position: "relative" }}>
          <select
            value={ver}
            onChange={(e) => trocar(e.target.value as Ver)}
            style={{ appearance: "none", font: "inherit", fontWeight: 600, padding: "6px 34px 6px 12px", border: "1px solid var(--line)", borderRadius: 99, background: "transparent", color: "var(--ink)", cursor: "pointer" }}
          >
            {OPCOES.map(([v, rotulo]) => (
              <option key={v} value={v} disabled={conta(v) === 0 && v !== ver}>
                {rotulo} ({conta(v)})
              </option>
            ))}
          </select>
          <span style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-62%)", pointerEvents: "none", color: "var(--mute)" }}>⌄</span>
        </div>
        <div style={{ position: "relative" }}>
          <button className="btn" style={{ ...pequeno, fontSize: 16, lineHeight: 1 }} onClick={() => setMenu((m) => !m)} aria-label="Mais opções">
            ⋯
          </button>
          {menu && (
            <>
              <div onClick={() => setMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
              <div className="card" style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 11, padding: 4, minWidth: 140 }}>
                <button
                  className="btn"
                  style={{ ...pequeno, width: "100%", textAlign: "left", border: "none" }}
                  disabled={!lista.length}
                  onClick={() => {
                    setMenu(false);
                    setSelecionando(true);
                  }}
                >
                  Selecionar
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {selecionando && (
        <div className="row" style={{ padding: "8px 12px", borderTop: "1px solid var(--line)", background: "var(--surface2)", gap: 6 }}>
          <strong style={{ fontSize: 14, marginRight: "auto" }}>{n} selecionado{n === 1 ? "" : "s"}</strong>
          <button className="btn" style={pequeno} disabled={!n || ocupado} onClick={() => emLote({ method: "DELETE" }, `Apagar ${n} carrosséis de vez? Não dá para desfazer.`)}>
            Apagar
          </button>
          {ver === "cancelados" ? (
            <button className="btn" style={pequeno} disabled={!n || ocupado} onClick={() => emLote({ method: "PATCH", body: JSON.stringify({ acao: "restaurar" }) })}>
              Restaurar
            </button>
          ) : (
            <button className="btn" style={pequeno} disabled={!n || ocupado} onClick={() => emLote({ method: "PATCH", body: JSON.stringify({ acao: "ocultar" }) })}>
              Mover para cancelados
            </button>
          )}
          <button className="btn" style={pequeno} disabled={ocupado} onClick={() => setSel(lista.map((i) => i.id))}>
            Selecionar todos
          </button>
          <button className="btn" style={pequeno} disabled={ocupado} onClick={sair}>
            Cancelar
          </button>
        </div>
      )}

      {lista.map((i) => {
        const conteudo = (
          <>
            {selecionando && <input type="checkbox" checked={sel.includes(i.id)} readOnly style={{ width: 16, height: 16, flexShrink: 0, pointerEvents: "none" }} />}
            {i.capa ? (
              <img src={i.capa} alt="" loading="lazy" style={{ width: 48, aspectRatio: "1080 / 1350", objectFit: "cover", borderRadius: 4, background: "#e9e7e2", flexShrink: 0 }} />
            ) : (
              <div style={{ width: 48, aspectRatio: "1080 / 1350", borderRadius: 4, background: "#D5D9E0", flexShrink: 0 }} />
            )}
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>{i.titulo}</span>
            <span className="muted" style={{ fontSize: 13, flexShrink: 0 }}>{i.data}</span>
          </>
        );
        const estilo = { flexWrap: "nowrap" as const, padding: "8px 12px", borderTop: "1px solid var(--line)", textDecoration: "none" };
        return selecionando ? (
          <div key={i.id} className="row" onClick={() => alterna(i.id)} style={{ ...estilo, cursor: "pointer", background: sel.includes(i.id) ? "var(--surface2)" : undefined }}>
            {conteudo}
          </div>
        ) : (
          <Link key={i.id} href={`/carrossel/${i.id}`} className="row" style={estilo}>
            {conteudo}
          </Link>
        );
      })}
      {!lista.length && (
        <div className="muted" style={{ padding: "12px", borderTop: "1px solid var(--line)" }}>
          {itens.length ? "Nada aqui." : "Nada ainda. Crie o primeiro carrossel acima."}
        </div>
      )}
    </div>
  );
}
