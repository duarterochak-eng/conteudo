"use client";
import { useState } from "react";
import "../globals.css";

export default function Login() {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  async function entrar(e: any) {
    e.preventDefault();
    const r = await fetch("/api/login", { method: "POST", body: JSON.stringify({ senha }) });
    if (r.ok) location.href = "/";
    else setErro("Senha errada");
  }
  return (
    <div className="wrap" style={{ maxWidth: 380, paddingTop: 120 }}>
      <h1>Entrar</h1>
      <form onSubmit={entrar} style={{ marginTop: 16, display: "grid", gap: 10 }}>
        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Senha" autoFocus />
        <button className="btn primary">Entrar</button>
        {erro && <span style={{ color: "#B42A2A" }}>{erro}</span>}
      </form>
    </div>
  );
}
