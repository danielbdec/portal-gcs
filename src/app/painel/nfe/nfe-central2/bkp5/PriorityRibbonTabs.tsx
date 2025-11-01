"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

/** Lista canônica */
export const RIBBON_STATUS_LIST = [
  "Todos", "Enviadas", "Falha ERP", "Compras", "Fiscal",
  "Erro I.A.", "Não Recebidas", "Importado", "Manual",
] as const;

type Counts = Record<string, number>;
type Size = "xs" | "sm" | "md";

type Props = {
  filtroStatus: string;
  statusCounts: Counts;
  onChange: (key: string) => void;
  size?: Size;
  /** Força o tema deste componente (ignora auto-detecção) */
  forceTheme?: "light" | "dark";
};

const VARS = {
  border: "var(--gcs-border-color, rgba(203,213,225,.6))",
  surfaceLight: "#FFFFFF",
  surfaceDark: "linear-gradient(180deg, rgba(50,60,75,.25), rgba(30,40,55,.35))",
} as const;

/* Tamanhos dos chips */
const SZ = {
  xs: { padY: 6, padX: 12, minW: 120, label: 12, gap: 10, ringW: 4, badgeFs: 11, badgePx: "2px 6px" },
  sm: { padY: 8, padX: 14, minW: 136, label: 13, gap: 12, ringW: 5, badgeFs: 12, badgePx: "3px 7px" },
  md: { padY: 12, padX: 16, minW: 176, label: 14, gap: 12, ringW: 6, badgeFs: 13, badgePx: "4px 8px" },
} as const;

/* Paletas dos chips */
const CHIP = {
  neutral: {
    light: { from: "#FFFFFF", to: "#F6F8FB", text: "#0F172A", ring: "#CBD5E1" },
    dark:  { from: "rgba(255,255,255,.12)", to: "rgba(255,255,255,.06)", text: "#E6EDF6", ring: "rgba(255,255,255,.28)" },
  },
  p1: {
    light: { from: "#FBE9EE", to: "#F6D5DE", text: "#5F123B", ring: "#F1A7B8" },
    dark:  { from: "rgba(225,29,46,.30)", to: "rgba(225,29,46,.20)", text: "#FFCDCD", ring: "rgba(225,29,46,.36)" },
  },
  p2: {
    light: { from: "#FFF0E8", to: "#FFE4D4", text: "#7C2D12", ring: "#F4B38D" },
    dark:  { from: "rgba(250,204,21,.30)", to: "rgba(250,204,21,.20)", text: "#FDE68A", ring: "rgba(250,204,21,.36)" },
  },
  p3: {
    light: { from: "#EDF3F9", to: "#E5EEF6", text: "#18344F", ring: "#B4C6D8" },
    dark:  { from: "rgba(31,78,121,.22)", to: "rgba(31,78,121,.12)", text: "#E6EEF7", ring: "rgba(31,78,121,.40)" },
  },
} as const;

const BADGE = {
  neutral: "var(--gcs-badge-neutral, #64748B)",
  p1: "var(--gcs-brand-red, #E11D2E)",
  p2: "var(--gcs-brand-orange, #EA580C)",
  p3: "var(--gcs-brand-blue, #1F4E79)",
} as const;

/* Util */
function hexToRgba(hex: string, a = 1) {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? h.split("").map(x => x + x).join("") : h;
  if (f.length !== 6) return `rgba(0,0,0,${a})`;
  const n = parseInt(f, 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

/* Chip */
type ChipProps = {
  label: string;
  count?: number;
  active?: boolean;
  themeIsDark: boolean;
  onClick?: () => void;
  size: typeof SZ[Size];
  palette: { from: string; to: string; text: string; ring: string };
  badgeColor: string;
};
function Chip({
  label, count = 0, active, themeIsDark, onClick, size: s, palette, badgeColor,
}: ChipProps) {
  const cText = useMemo(
    () => (count > 9999 ? `${Math.floor(count / 100) / 10}k+` : String(count)),
    [count],
  );

  return (
    <button
      className={`seg-item ${active ? "active" : ""} ${themeIsDark ? "mode-dark" : "mode-light"}`}
      onClick={onClick}
      aria-pressed={!!active}
      style={{
        minWidth: s.minW,
        padding: `${s.padY}px ${s.padX}px`,
        borderRadius: 9999,
        background: `linear-gradient(180deg, ${palette.from}, ${palette.to})`,
        color: palette.text,
        fontSize: s.label,
        position: "relative",
        overflow: "visible",
        zIndex: 2,
        ...(themeIsDark
          ? {
              border: "1px solid rgba(255,255,255,.28)",
              boxShadow: active
                ? `0 0 0 ${s.ringW}px ${palette.ring}, 0 8px 18px rgba(0,0,0,.10)`
                : "0 6px 14px rgba(0,0,0,.08)",
              backdropFilter: "blur(8px) saturate(120%)",
              WebkitBackdropFilter: "blur(8px) saturate(120%)",
            }
          : {
              border: `1px solid ${VARS.border}`,
              boxShadow: active
                ? `0 0 0 ${s.ringW}px ${palette.ring}, 0 2px 8px rgba(15,23,42,.06)`
                : "0 1px 3px rgba(15,23,42,.06)",
              backdropFilter: "none",
              WebkitBackdropFilter: "none",
            }),
      }}
    >
      {themeIsDark && <span className="chipFX" />}
      <span className="txt">{label}</span>
      {count > 0 && (
        <span
          className="badge"
          aria-label={`${cText} itens em ${label}`}
          style={{ background: badgeColor, fontSize: s.badgeFs, padding: s.badgePx }}
        >
          {cText}
        </span>
      )}

      <style jsx>{`
        .seg-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: transform .1s ease, box-shadow .12s ease, background .12s ease;
          cursor: pointer;
          outline: none;
          white-space: nowrap;
        }
        .seg-item .txt { font-weight: 700; }
        .seg-item .badge {
          position: absolute; top: -8px; right: -8px;
          display: inline-flex; align-items: center; justify-content: center;
          color:#fff; border-radius:9999px; line-height:1; font-weight:900;
          border:2px solid #fff; box-shadow:0 3px 6px rgba(0,0,0,.25);
          pointer-events:none;
        }
        .seg-item:active { transform: translateY(1px) scale(.997); }

        .seg-item.mode-dark:hover { filter: brightness(1.06); }
        .seg-item.mode-light:hover { box-shadow: 0 2px 12px rgba(15,23,42,.10); filter: none; }

        .chipFX{
          pointer-events:none; position:absolute; inset:0; border-radius:inherit; z-index:1;
          background:
            linear-gradient(180deg, rgba(255,255,255,.45), rgba(255,255,255,0) 45%),
            radial-gradient(60% 60% at 50% 0%, rgba(255,255,255,.35), transparent 60%),
            radial-gradient(60% 80% at 50% 120%, rgba(0,0,0,.12), transparent 60%);
          mix-blend-mode: screen; opacity:.9;
        }
      `}</style>
    </button>
  );
}

/* Componente principal */
export default function PriorityRibbonTabs({
  filtroStatus,
  statusCounts,
  onChange,
  size = "xs",
  forceTheme,
}: Props) {
  const s = SZ[size];
  const [isDark, setIsDark] = useState(false);
  const themeIsDark = forceTheme ? forceTheme === "dark" : isDark;
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // auto-detecção somente se não forçado
  useEffect(() => {
    if (forceTheme) return;
    if (typeof window === "undefined") return;

    const resolve = () => {
      const el = document.documentElement;
      const bd = document.body;
      const hasDark = el.classList.contains("dark") || bd.classList.contains("dark");
      const hasLight = el.classList.contains("light") || bd.classList.contains("light");
      if (hasDark) setIsDark(true);
      else if (hasLight) setIsDark(false);
      else {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        setIsDark(mq.matches);
      }
    };

    resolve();
    const obs = new MutationObserver(resolve);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    if (document.body) obs.observe(document.body, { attributes: true, attributeFilter: ["class", "data-theme"] });
    const mq2 = window.matchMedia("(prefers-color-scheme: dark)");
    const mqH = (e: MediaQueryListEvent) => { if (!forceTheme) setIsDark(e.matches); };
    mq2.addEventListener("change", mqH);
    return () => { obs.disconnect(); mq2.removeEventListener("change", mqH); };
  }, [forceTheme]);

  useEffect(() => {
    if (!wrapRef.current) return;
    wrapRef.current.setAttribute("data-theme", themeIsDark ? "dark" : "light");
  }, [themeIsDark]);

  const get = (k: string) => Number(statusCounts?.[k] ?? 0) || 0;
  const on = (k: string) => () => onChange(k);

  // Ajuste de contraste para MODO CLARO
  const toneNeutral = themeIsDark ? CHIP.neutral.dark : CHIP.neutral.light;
  const toneP1 = themeIsDark
    ? CHIP.p1.dark
    : { ...CHIP.p1.light, from: CHIP.neutral.light.from, to: CHIP.neutral.light.to };
  const toneP2 = themeIsDark
    ? CHIP.p2.dark
    : { ...CHIP.p2.light, from: CHIP.neutral.light.from, to: CHIP.neutral.light.to };
  const toneP3 = themeIsDark
    ? CHIP.p3.dark
    : { ...CHIP.p3.light, from: CHIP.neutral.light.from, to: CHIP.neutral.light.to };

  return (
    <div
      ref={wrapRef}
      className="ribbon"
      data-theme={themeIsDark ? "dark" : "light"}
      style={{
        background: themeIsDark ? VARS.surfaceDark : VARS.surfaceLight,
        borderRadius: 16,
        padding: 12,
        position: "relative",
        border: `1px solid ${themeIsDark ? "rgba(255,255,255,.28)" : VARS.border}`,
        boxShadow: themeIsDark ? "0 8px 22px rgba(0,0,0,.18)" : "0 1px 3px rgba(15,23,42,.06)",
        backdropFilter: themeIsDark ? "blur(6px) saturate(120%)" : "none",
        WebkitBackdropFilter: themeIsDark ? "blur(6px) saturate(120%)" : "none",
      }}
    >
      {/* Coluna do “Todos” */}
      <div className="left">
        <Chip
          label="Todos"
          count={get("Todos")}
          active={filtroStatus === "Todos"}
          themeIsDark={themeIsDark}
          onClick={on("Todos")}
          size={s}
          palette={toneNeutral}
          badgeColor={BADGE.neutral}
        />
      </div>

      {/* Faixas diagonais + conteúdo encaixado */}
      <div className="flagsWrap">
        <svg className="flagsBg" viewBox="0 0 3000 120" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="g-p1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--p1-from)" />
              <stop offset="100%" stopColor="var(--p1-to)" />
            </linearGradient>
            <linearGradient id="g-p2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--p2-from)" />
              <stop offset="100%" stopColor="var(--p2-to)" />
            </linearGradient>
            <linearGradient id="g-p3" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--p3-from)" />
              <stop offset="100%" stopColor="var(--p3-to)" />
            </linearGradient>
            <linearGradient id="g-sheen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"  stopColor="rgba(255,255,255,.28)" />
              <stop offset="45%" stopColor="rgba(255,255,255,.10)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>

          {/* ordem p3->p2->p1 para encaixe das setas */}
          <path d="M 2000 0 L 3000 0 L 3000 120 L 2000 120 Z M 2000 0 L 2120 60 L 2000 120 Z"
                fill="url(#g-p3)" fillRule="evenodd" />
          <path d="M 1000 0 L 2000 0 L 2120 60 L 2000 120 L 1000 120 Z M 1000 0 L 1120 60 L 1000 120 Z"
                fill="url(#g-p2)" fillRule="evenodd" />
          <path d="M 0 0 L 1000 0 L 1120 60 L 1000 120 L 0 120 Z"
                fill="url(#g-p1)" />
          {/* Sheen desligado no claro para não cinzentar */}
          <rect x="0" y="0" width="3000" height="120" fill="url(#g-sheen)"
                style={{ opacity: themeIsDark ? 1 : 0 }} />
        </svg>

        {/* Segmentos (conteúdo CENTRALIZADO dentro das faixas) */}
        <section className="seg seg-p1">
          <header className="seg-head"><span className="tag">01</span><span className="title">Urgente</span></header>
          <div className="seg-actions">
            <Chip label="Enviadas"  count={get("Enviadas")}  active={filtroStatus==="Enviadas"}  themeIsDark={themeIsDark} onClick={on("Enviadas")}  size={s} palette={toneP1} badgeColor={BADGE.p1}/>
            <Chip label="Falha ERP" count={get("Falha ERP")} active={filtroStatus==="Falha ERP"} themeIsDark={themeIsDark} onClick={on("Falha ERP")} size={s} palette={toneP1} badgeColor={BADGE.p1}/>
          </div>
        </section>

        <section className="seg seg-p2">
          <header className="seg-head"><span className="tag">02</span><span className="title">Pendências</span></header>
          <div className="seg-actions">
            <Chip label="Compras" count={get("Compras")} active={filtroStatus==="Compras"} themeIsDark={themeIsDark} onClick={on("Compras")} size={s} palette={toneP2} badgeColor={BADGE.p2}/>
            <Chip label="Fiscal"  count={get("Fiscal")}  active={filtroStatus==="Fiscal"}  themeIsDark={themeIsDark} onClick={on("Fiscal")}  size={s} palette={toneP2} badgeColor={BADGE.p2}/>
          </div>
        </section>

        <section className="seg seg-p3">
          <header className="seg-head"><span className="tag">03</span><span className="title">Monitorar</span></header>
          <div className="seg-actions">
            <Chip label="Erro I.A."     count={get("Erro I.A.")}     active={filtroStatus==="Erro I.A."}     themeIsDark={themeIsDark} onClick={on("Erro I.A.")}     size={s} palette={toneP3} badgeColor={BADGE.p3}/>
            <Chip label="Não Recebidas" count={get("Não Recebidas")} active={filtroStatus==="Não Recebidas"} themeIsDark={themeIsDark} onClick={on("Não Recebidas")} size={s} palette={toneP3} badgeColor={BADGE.p3}/>
            <Chip label="Importado"     count={get("Importado")}     active={filtroStatus==="Importado"}     themeIsDark={themeIsDark} onClick={on("Importado")}     size={s} palette={toneP3} badgeColor={BADGE.p3}/>
            <Chip label="Manual"        count={get("Manual")}        active={filtroStatus==="Manual"}        themeIsDark={themeIsDark} onClick={on("Manual")}        size={s} palette={toneP3} badgeColor={BADGE.p3}/>
          </div>
        </section>
      </div>

      <style jsx>{`
        /* Layout base */
        .ribbon{
          display:grid;
          grid-template-columns: 200px 1fr;
          gap: 0;
        }
        .left{
          display:flex; align-items:center; justify-content:center;
          padding-right:16px; margin-right:12px;
          border-right:1px dashed ${VARS.border}; z-index:3;
        }

        /* Área das faixas (120px) com conteúdo centralizado */
        .flagsWrap{
          position:relative;
          height:120px;
          display:grid;
          grid-template-columns: 1fr 1fr 1fr;
          column-gap: 0;
          border-radius:16px;
        }
        .flagsBg{ position:absolute; inset:0; width:100%; height:100%; z-index:0; }

        /* Cada segmento ocupa toda a altura e centraliza header+chips */
        .seg{
          position:relative; z-index:1;
          height:120px;
          display:grid;
          grid-template-rows: auto auto;
          align-content: start;      /* <<< CORREÇÃO: Alinha todos os headers no topo */
          justify-items: center;
          row-gap: 8px;
          padding-top: 6px;
          min-width: 0;
        }

        /* “Notches”: reserva nas bordas para o bico da seta vizinha */
        :root{ --notch: 84px; }
        .seg-p1{ padding: 0 calc(var(--notch)) 0 12px; }
        .seg-p2{ padding: 0 calc(var(--notch)) 0 calc(var(--notch)); }
        .seg-p3{ padding: 0 12px 0 calc(var(--notch)); }

        .seg-head{ display:flex; align-items:center; gap:10px; }
        .tag{
          display:inline-flex; align-items:center; justify-content:center;
          min-width:26px; height:26px; padding:0 6px; border-radius:8px;
          font-size:11px; font-weight:800; line-height:1;
          border:1px solid rgba(0,0,0,.06);
          background:#fff; color:#0F172A;
          box-shadow: 0 1px 1px rgba(0,0,0,.04);
        }
        .title{ font-size:12px; font-weight:800; text-transform:uppercase; color:#0F172A; }

        .seg-actions{
          display:flex;
          flex-wrap:wrap;
          gap:${s.gap}px;
          align-items:center;
          justify-content: center;
          /* AJUSTE 2x2: Força a largura a ter espaço para 2 botões + 1 gap */
          max-width: calc((${s.minW}px * 2) + ${s.gap}px);
        }

        /* Tema LIGHT */
        .ribbon[data-theme="light"]{
          --p1-from:#FBE9EE; --p1-to:#F6D5DE;
          --p2-from:#FFF0E8; --p2-to:#FFE4D4;
          --p3-from:#EDF3F9; --p3-to:#E5EEF6;
          backdrop-filter:none; -webkit-backdrop-filter:none; box-shadow:none;
        }
        .ribbon[data-theme="light"] .left{ border-right-color:${VARS.border}; }
        .ribbon[data-theme="light"] .title{ color:#0F172A; }
        .ribbon[data-theme="light"] .tag{
          background:#fff;
          color:#0F172A;
          border-color:${VARS.border};
        }

        /* Tema DARK */
        .ribbon[data-theme="dark"]{
          --p1-from: rgba(239,68,68,.40); --p1-to: rgba(225,29,46,.30);
          --p2-from: rgba(250,204,21,.35); --p2-to: rgba(234,179,8,.25);
          --p3-from: rgba(59,130,246,.30); --p3-to: rgba(31,78,121,.20);
          box-shadow: 0 10px 24px rgba(0,0,0,.12);
          backdrop-filter: blur(10px) saturate(120%); -webkit-backdrop-filter: blur(10px) saturate(120%);
        }
        .ribbon[data-theme="dark"] .title{ color:#E6EDF6; }
        .ribbon[data-theme="dark"] .tag{
          background: rgba(255,255,255,.06); color:#E6EDF6; border-color: rgba(255,255,255,.28);
        }

        /* Responsivo */
        @media (max-width:1200px){
          .ribbon{ grid-template-columns: 1fr; }
          .left{ border-right:none; border-bottom:1px dashed ${VARS.border}; margin-right:0; padding-bottom:12px; justify-content:flex-start; }
          .flagsBg{ display:none; }
          .flagsWrap{ height:auto; grid-template-columns:1fr; row-gap:10px; }
          .seg{ height:auto; padding: 8px 12px; border-radius:14px; background: rgba(255,255,255,.12); }
          .seg-p1,.seg-p2,.seg-p3{ padding:8px 12px; }
          /* No mobile, remove a largura máxima para permitir scroll horizontal */
          .seg-actions{ max-width: none; }
        }
        @media (max-width:768px){
          .seg-actions{ overflow-x:auto; flex-wrap:nowrap; -ms-overflow-style:none; scrollbar-width:none; padding-bottom:6px; }
          .seg-actions::-webkit-scrollbar{ display:none; }
        }
      `}</style>
    </div>
  );
}