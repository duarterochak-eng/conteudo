// Confere data/tabela-ia.json sem precisar do build inteiro: node scripts/checar-tabela.mjs
// (Node 22.6+ com --experimental-strip-types, ou 22.18+ direto). `npm run tabela:check` já faz isso.
import { readFileSync } from "node:fs";
import { parseTabela, diasSemConferir, isoDia, fmtData } from "../lib/tabela.ts";

try {
  const raw = JSON.parse(readFileSync(new URL("../data/tabela-ia.json", import.meta.url), "utf8"));
  const t = parseTabela(raw);
  const hoje = isoDia(new Date());
  console.log(
    `OK · ${t.modelos.length} modelos, ${t.planos.length} planos, ${t.tarefas.length} tarefas, ${t.mudancas.length} mudanças · ` +
      `conferida em ${fmtData(t.verificada_em)} (há ${diasSemConferir(t, hoje)} dia(s))`,
  );
} catch (e) {
  console.error(e instanceof SyntaxError ? `JSON quebrado: ${e.message}` : e.message);
  process.exit(1);
}
