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
h1,h2{font-family:Anton;font-weight:400;text-transform:uppercase;line-height:1.02;letter-spacing:-.01em}
em{font-style:normal;color:var(--or)}
mark{background:linear-gradient(transparent 6%,var(--or) 6%,var(--or) 94%,transparent 94%);color:var(--ink);padding:0 .06em;-webkit-box-decoration-break:clone}
.giant{position:absolute;left:0;right:0;text-align:center;font-family:Anton;color:var(--or);line-height:.8;text-transform:uppercase;z-index:1}
.person{position:absolute;z-index:2}
.person img{display:block;width:100%;height:auto;-webkit-mask-image:linear-gradient(#000 70%,transparent 98%)}
.pill{display:inline-block;border:2.5px solid var(--ink);border-radius:99px;padding:8px 22px;font-family:Cond;font-weight:700;font-size:26px;text-transform:uppercase;background:var(--bg)}
.box{position:absolute;inset:44px;border:2.5px solid var(--ink);z-index:3}
.inner{position:absolute;left:96px;right:96px;z-index:4}
.body{font-family:Body;font-size:40px;line-height:1.3;color:#1b1b1b;max-width:820px}
.body b{font-weight:600}
.corner{position:absolute;right:96px;bottom:84px;z-index:4;font-family:Cond;font-weight:700;font-size:26px;letter-spacing:.06em}
.corner i{font-style:normal;color:var(--or)}
.star{position:absolute;z-index:3;color:var(--or);font-weight:600;line-height:1;font-size:170px;right:70px;top:150px}
.list{display:grid;gap:26px;margin-top:56px}
.list div{display:grid;grid-template-columns:90px 1fr;align-items:baseline;font-size:40px;line-height:1.2;font-weight:600}
.list span{font-family:Anton;font-size:52px;color:var(--or)}
.chat{display:grid;gap:18px;margin-top:60px;max-width:820px}
.bb{border:2.5px solid var(--ink);padding:20px 26px;font-size:32px;line-height:1.3;max-width:640px;background:#fff}
.bb.me{justify-self:end;background:var(--or);border-color:var(--or)}
.bb small{display:block;font-family:Cond;font-weight:700;font-size:20px;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;opacity:.7}
.flow{display:flex;align-items:center;margin-top:64px}
.node{border:2.5px solid var(--ink);padding:16px 20px;font-family:Cond;font-weight:700;font-size:26px;text-transform:uppercase;background:#fff}
.node.on{background:var(--or);border-color:var(--or)}
.wire{flex:1;height:2.5px;background:var(--ink);min-width:24px}
`;
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
      <div class="star">✱</div>
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
    const dl = s.deliver.map((d) => `<div style="font-size:32px;grid-template-columns:60px 1fr"><span style="font-size:38px">✓</span>${d}</div>`).join("");
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
  let extra = "";
  if (s.type === "step") {
    if (s.chat?.length) {
      extra = `<div class="chat">${s.chat
        .map((b) => `<div class="bb ${b.side === "me" ? "me" : ""}"><small>${b.who}</small>${b.text}</div>`)
        .join("")}</div>`;
    } else if (s.flow?.length) {
      extra = `<div class="flow">${s.flow
        .map((x, k) => `<div class="node ${k === s.flow_on ? "on" : ""}">${x}</div>`)
        .join('<div class="wire"></div>')}</div>`;
    } else if (s.items?.length) {
      extra = `<div class="list">${s.items
        .map((x, k) => `<div><span>${String(k + 1).padStart(2, "0")}</span>${x}</div>`)
        .join("")}</div>`;
    }
  }
  return `<div class="s">
    <div class="box"></div>
    <div class="lab inner" style="top:92px">${(s as any).label || ""}</div>
    <div class="inner" style="top:190px">
      <h2 style="font-size:${s.size}px">${s.title}</h2>
      ${s.body ? `<p class="body" style="margin-top:50px">${s.body}</p>` : ""}
      ${extra}
    </div>
    <div class="corner">${String(i).padStart(2, "0")}/${String(n).padStart(2, "0")} <i>→</i></div>
    <div class="paper"></div></div>`;
}

export function specToHtml(spec: TSpec, poses: PoseMap, _baseUrl?: string) {
  const n = spec.slides.length;
  const pages = spec.slides.map((s, i) => slideHtml(s, i + 1, n, spec, poses)).join("\n");
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css()}</style></head><body>${pages}</body></html>`;
}
