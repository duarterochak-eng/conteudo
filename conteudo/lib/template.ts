import type { TSpec, TSlide } from "./spec";
import { ANTON, INTER400, INTER600, ARCHIVO700 } from "./fonts";

/** Template claro: fundo off-white, texto preto, laranja no grifo. 1080x1350. */

export const W = 1080;
export const H = 1350;

function css() {
  const f = (b64: string) => `url(data:font/woff2;base64,${b64}) format('woff2')`;
  return `
@font-face{font-family:Anton;src:${f(ANTON)}}
@font-face{font-family:Body;font-weight:400;src:${f(INTER400)}}
@font-face{font-family:Body;font-weight:600;src:${f(INTER600)}}
@font-face{font-family:Cond;font-weight:700;src:${f(ARCHIVO700)}}
:root{--bg:#F2F0EB;--ink:#111;--mute:#6B6863;--or:#E0521D}
*{box-sizing:border-box;margin:0;padding:0}
body{width:${W}px;height:${H}px;background:var(--bg);overflow:hidden}
.s{position:relative;width:${W}px;height:${H}px;overflow:hidden;background:var(--bg);color:var(--ink);font-family:Body}
.paper{position:absolute;inset:0;opacity:.35;mix-blend-mode:multiply;z-index:8;pointer-events:none;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .5  0 0 0 0 .48  0 0 0 0 .45  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
.lab{font-family:Cond;font-weight:700;font-size:26px;letter-spacing:.06em;text-transform:uppercase}
h1,h2{font-family:Anton;font-weight:400;text-transform:uppercase;line-height:1.2;letter-spacing:-.01em}
em{font-style:normal;color:var(--or)}
mark{background:linear-gradient(transparent 6%,var(--or) 6%,var(--or) 94%,transparent 94%);color:var(--ink);padding:0 .06em;-webkit-box-decoration-break:clone}
.giant{position:absolute;left:0;right:0;text-align:center;font-family:Anton;color:var(--or);line-height:.8;text-transform:uppercase;z-index:1}
.person{position:absolute;z-index:2}
.person img{display:block;width:100%;height:auto;-webkit-mask-image:linear-gradient(#000 70%,transparent 98%)}
.pill{display:inline-block;border:2.5px solid var(--ink);border-radius:99px;padding:8px 22px;font-family:Cond;font-weight:700;font-size:26px;text-transform:uppercase;background:var(--bg)}
.box{position:absolute;inset:44px;border:2.5px solid var(--ink);z-index:3}
.inner{position:absolute;left:96px;right:96px;z-index:4}
.body{font-family:Body;font-size:44px;line-height:1.3;color:#1b1b1b;max-width:820px}
.body b{font-weight:600}
.corner{position:absolute;right:96px;bottom:84px;z-index:4;font-family:Cond;font-weight:700;font-size:26px;letter-spacing:.06em}
.corner i{font-style:normal;color:var(--or)}
.star{position:absolute;z-index:3;color:var(--or);font-weight:600;line-height:1;font-size:170px;right:70px;top:150px}
.list{display:grid;gap:26px;margin-top:56px}
.list div{display:grid;grid-template-columns:90px 1fr;align-items:baseline;font-size:40px;line-height:1.2;font-weight:600}
.list span{font-family:Anton;font-size:52px;color:var(--or)}
.chat{display:grid;gap:18px;margin-top:60px;max-width:820px}
.bb{border:2.5px solid var(--ink);padding:22px 28px;font-size:36px;line-height:1.3;max-width:700px;background:#fff}
.bb.me{justify-self:end;background:var(--or);border-color:var(--or)}
.bb small{display:block;font-family:Cond;font-weight:700;font-size:20px;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;opacity:.7}
.flow{display:flex;align-items:center;margin-top:80px}
.node{border:2.5px solid var(--ink);padding:26px 22px;font-family:Cond;font-weight:700;font-size:30px;line-height:1.15;text-align:center;flex:0 1 auto;text-transform:uppercase;background:#fff}
.node.on{background:var(--or);border-color:var(--or)}
.wire{flex:1;height:2.5px;background:var(--ink);min-width:24px}
.ic{display:inline-block;vertical-align:middle;flex:none}
.flow.ico{align-items:stretch}
.flow.ico .node{display:flex;flex-direction:column;align-items:center;gap:16px;padding:30px 20px;min-width:170px;font-size:28px}
.flow.ico .wire{align-self:center}
.card{background:#fff;border:2.5px solid var(--ink);padding:20px 26px 14px}
.card.ruim{border-style:dashed;background:#FAF9F6}
.card.hot{border-color:var(--or);box-shadow:8px 8px 0 var(--or)}
.card h4{display:flex;align-items:center;gap:12px;font-family:Cond;font-weight:700;font-size:30px;letter-spacing:.04em;text-transform:uppercase;margin-bottom:8px}
.card h4 .tag{margin-left:auto;font-size:20px;padding:4px 12px;border:2px solid currentColor}
.card.ruim h4 .tag{color:var(--or)}
.row{display:grid;grid-template-columns:270px 1fr;gap:14px;font-size:36px;line-height:1.25;padding:16px 0;border-top:1.5px dashed #cfcac2}
.row b{font-weight:600;color:var(--mute);font-size:26px;text-transform:uppercase;letter-spacing:.03em;align-self:center}
.card.ruim .row span{color:#a9a49c}
.cmp{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:64px}
.cmp .it{display:flex;gap:14px;align-items:flex-start;font-size:36px;line-height:1.2;padding:16px 0;border-top:1.5px dashed #cfcac2}
.cmp .ruim .it{color:#6B6863}
.rep{display:grid;grid-template-columns:1fr 70px 1.05fr;gap:10px;margin-top:56px;align-items:center}
.rep>.card .row{grid-template-columns:1fr;gap:2px;font-size:32px}
.rep>.card .row b{font-size:22px}
.rep .mini{padding:12px 18px 8px;margin-bottom:12px}
.rep .mini h4{font-size:25px;margin-bottom:2px}
.rep .mini .row{grid-template-columns:140px 1fr;font-size:25px;padding:6px 0}
.rep .mini .row b{font-size:19px}
.rep .seta{display:flex;flex-direction:column;align-items:center;gap:8px;font-family:Cond;font-weight:700;font-size:18px;text-transform:uppercase;color:var(--or);text-align:center}
`;
}

const PATHS: Record<string, string> = {
  whatsapp: "M4 5h16v11H9l-5 4z",
  ia: "M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z",
  crm: "M5 6c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3zM5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3",
  alerta: "M6 16v-5a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0",
  planilha: "M4 4h16v16H4zM4 10h16M4 15h16M10 4v16",
  email: "M3 6h18v12H3zM3 7l9 6 9-6",
  cliente: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c1-4 4.5-6 8-6s7 2 8 6",
  relogio: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2",
  doc: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7",
  agenda: "M4 6h16v14H4zM4 10h16M8 3v5M16 3v5",
  dinheiro: "M3 7h18v10H3zM12 15a3 3 0 100-6 3 3 0 000 6z",
  check: "M5 12.5l4.5 4.5L19 7",
  x: "M6 6l12 12M18 6L6 18",
  seta: "M4 12h15M13 6l6 6-6 6",
};
function icon(name: string | undefined, size = 34, color = "currentColor") {
  const d = PATHS[name || ""];
  if (!d) return "";
  return `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}"><path d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
const SYS_ICON: Record<string, string> = { whatsapp: "whatsapp", planilha: "planilha", excel: "planilha", crm: "crm", "e-mail": "email", email: "email", agenda: "agenda", sistema: "crm", erp: "crm" };
const sysIcon = (nome: string) => SYS_ICON[nome.toLowerCase().trim()] || "doc";

/** Bloco visual do slide (step ou statement). Ordem de prioridade: chat > compare > repete > ficha > flow > items. */
function visual(s: any): string {
  if (s.chat?.length) {
    return `<div class="chat">${s.chat
      .map((b: any) => `<div class="bb ${b.side === "me" ? "me" : ""}"><small>${b.who}</small>${b.text}</div>`)
      .join("")}</div>`;
  }
  if (s.compare) {
    const col = (c: any, bom: boolean) => `<div class="card ${bom ? "hot" : "ruim"}">
      <h4>${icon(bom ? "seta" : "alerta", 30, bom ? "var(--or)" : "var(--ink)")}${c.title}</h4>
      ${c.items.map((x: string) => `<div class="it">${icon(bom ? "seta" : "x", 28, bom ? "var(--or)" : "#8a857d")}<span>${x}</span></div>`).join("")}
    </div>`;
    return `<div class="cmp">${col(s.compare.before, false)}${col(s.compare.after, true)}</div>`;
  }
  if (s.repete) {
    const linhas = (rows: string[][]) => rows.map(([k, v]) => `<div class="row"><b>${k}</b><span>${v}</span></div>`).join("");
    return `<div class="rep">
      <div class="card"><h4>${icon("cliente", 30)}Dados do cliente</h4>${linhas(s.repete.data)}</div>
      <div class="seta"><svg viewBox="0 0 24 24" width="48" height="48"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="var(--or)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>mesmos<br>dados</div>
      <div>${s.repete.systems
        .map((sy: string) => `<div class="card mini"><h4>${icon(sysIcon(sy), 24)}${sy}</h4>${linhas(s.repete.data.slice(0, 2))}</div>`)
        .join("")}</div>
    </div>`;
  }
  if (s.ficha) {
    const f = s.ficha;
    const ruim = f.state === "ruim";
    return `<div class="card ${ruim ? "ruim" : "hot"}" style="margin-top:60px">
      <h4>${icon(f.icon || "crm", 30)}${f.title}<span class="tag">${ruim ? "desatualizado" : "em dia"}</span></h4>
      ${f.rows.map(([k, v]: string[]) => `<div class="row"><b>${k}</b><span>${v}</span></div>`).join("")}
    </div>`;
  }
  if (s.flow?.length) {
    const ico = Array.isArray(s.flow_icons) && s.flow_icons.length ? " ico" : "";
    return `<div class="flow${ico}">${s.flow
      .map((x: string, k: number) => `<div class="node ${k === s.flow_on ? "on" : ""}">${ico ? icon(s.flow_icons[k], 64) : ""}${x}</div>`)
      .join('<div class="wire"></div>')}</div>`;
  }
  if (s.items?.length) {
    return `<div class="list">${s.items
      .map((x: string, k: number) => `<div><span>${String(k + 1).padStart(2, "0")}</span>${x}</div>`)
      .join("")}</div>`;
  }
  return "";
}

export type PoseMap = Record<string, { url: string; style?: string }>;

function person(photo: string | undefined, poses: PoseMap, fallbackStyle: string) {
  if (!photo) return "";
  const p = poses[photo] || Object.values(poses)[0];
  if (!p) return "";
  return `<div class="person" style="${p.style || fallbackStyle}"><img src="${p.url}"></div>`;
}

function slideHtml(s: TSlide, i: number, n: number, spec: TSpec, poses: PoseMap) {
  const handle = spec.handle;
  if (s.type === "cover") {
    return `<div class="s">
      <div class="giant" style="top:330px;font-size:${s.giant_size}px">${s.giant || spec.keyword}</div>
      <div class="star"><svg viewBox="0 0 100 100" width="150" height="150"><g stroke="currentColor" stroke-width="16" stroke-linecap="round"><line x1="50" y1="8" x2="50" y2="92"/><line x1="13.6" y1="29" x2="86.4" y2="71"/><line x1="13.6" y1="71" x2="86.4" y2="29"/></g></svg></div>
      ${person(s.photo, poses, "left:250px;top:250px;width:600px")}
      <div class="lab" style="position:absolute;left:64px;top:64px;z-index:4">${s.eyebrow || ""}</div>
      <div class="lab" style="position:absolute;right:64px;top:64px;z-index:4;color:var(--mute)">${handle}</div>
      <div style="position:absolute;left:56px;right:56px;bottom:70px;z-index:5">
        <h1 style="font-size:${s.size}px;max-width:900px">${s.title}</h1>
        <div style="margin-top:22px;display:flex;gap:14px">
          ${s.tag ? `<span class="pill">${s.tag}</span>` : ""}
          <span class="pill">Comenta <em>${spec.keyword}</em></span>
        </div>
      </div>
      <div class="paper"></div></div>`;
  }
  if (s.type === "cta") {
    const dl = s.deliver.map((d) => `<div style="font-size:32px;grid-template-columns:60px 1fr"><span style="display:flex;align-items:center"><svg viewBox="0 0 24 24" width="34" height="34"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>${d}</div>`).join("");
    return `<div class="s">
      ${person(s.photo, poses, "right:-150px;bottom:0;width:640px")}
      <div class="lab" style="position:absolute;left:64px;top:64px;z-index:4">${s.eyebrow}</div>
      <div style="position:absolute;left:64px;top:150px;z-index:4;max-width:620px">
        <h1 style="font-size:170px">Comenta<br><mark>${spec.keyword}</mark></h1>
        <p class="body" style="margin-top:44px;font-size:36px">${s.sub}</p>
        <div class="list" style="margin-top:30px;gap:14px">${dl}</div>
      </div>
      <div class="lab" style="position:absolute;left:64px;bottom:64px;z-index:4;color:var(--mute)">Salva pra aplicar depois · ${handle}</div>
      <div class="paper"></div></div>`;
  }
  // statement / step (ambos com moldura)
  const extra = visual(s);
  return `<div class="s">
    <div class="box"></div>
    <div class="lab inner" style="top:92px">${(s as any).label || ""}</div>
    <div class="inner fit" style="top:190px">
      <h2 style="font-size:${s.size}px">${s.title}</h2>
      ${s.body ? `<p class="body" style="margin-top:50px">${s.body}</p>` : ""}
      ${extra}
    </div>
    <div class="corner">${String(i).padStart(2, "0")}/${String(n).padStart(2, "0")} <i><svg viewBox="0 0 24 24" width="26" height="26" style="vertical-align:-4px"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></i></div>
    <div class="paper"></div></div>`;
}

export function specToHtml(spec: TSpec, poses: PoseMap, _baseUrl?: string) {
  const n = spec.slides.length;
  // A fonte embutida não tem travessão, aspas curvas e reticências: viravam quadradinho.
  const pages = spec.slides
    .map((s, i) => slideHtml(s, i + 1, n, spec, poses))
    .join("\n")
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, "-")
    .replace(/\u00AD/g, "")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "") // emoji vira quadradinho na fonte
    .replace(/[\u00A0\u202F\u2007\u2009]/g, " ")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u2026/g, "...");
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css()}</style></head><body>${pages}<script>
document.fonts.ready.then(()=>{document.querySelectorAll(".giant").forEach(g=>{let f=parseFloat(getComputedStyle(g).fontSize);g.style.whiteSpace="nowrap";const r=document.createRange();r.selectNodeContents(g);while(r.getBoundingClientRect().width>1000&&f>80){f-=6;g.style.fontSize=f+"px";}});document.querySelectorAll(".fit").forEach(el=>{
  const s=el.closest(".s"),lim=s.getBoundingClientRect().top+${H}-150;let z=1;
  while(el.getBoundingClientRect().bottom>lim&&z>0.55){z-=0.04;el.style.zoom=String(z);}
});document.body.dataset.fit="ok";});
</script></body></html>`;
}
