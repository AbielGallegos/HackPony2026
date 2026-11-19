"use client";
// Ayuda para instalar la PWA. En Android/Chrome usa el aviso nativo si existe; en iPhone explica Safari.
import { useEffect, useState } from "react";

export function InstallHelp() {
  const [prompt, setPrompt] = useState(null);
  const [state, setState] = useState({ ios: false, standalone: false, installed: false });

  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    setState((s) => ({ ...s, ios, standalone }));
    const onPrompt = (e) => { e.preventDefault(); setPrompt(e); };
    const onInstalled = () => setState((s) => ({ ...s, installed: true }));
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (state.standalone) return <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-200">Ya estás usando la app instalada.</p>;
  if (state.installed) return <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-emerald-200">¡Listo! Búscala en tu pantalla de inicio.</p>;
  if (prompt)
    return (
      <button className="btn-primary w-full sm:w-auto" onClick={async () => { prompt.prompt(); await prompt.userChoice; setPrompt(null); }}>
        Instalar la app
      </button>
    );
  return (
    <p className="text-sm text-slate-600">
      {state.ios ? "En iPhone usa Safari y sigue los pasos de abajo." : "Si tu navegador no muestra el botón de instalar, sigue los pasos de abajo."}
    </p>
  );
}
