"use client";
import React, { useEffect, useMemo } from "react";

/** Lista canônica */
export const RIBBON_STATUS_LIST = [
  "Todos","Enviadas","Falha ERP","Compras","Fiscal","Erro I.A.","Não Recebidas","Importado","Manual",
] as const;

type Counts = Record<string, number>;
type Size = "xs" | "sm" | "md";
type Props = {
  filtroStatus: string;
  statusCounts: Counts;
  onChange: (key: string) => void;
  size?: Size;
};

/* ===== Vars ===== */
const VARS = {
  blue:   "var(--gcs-brand-blue, #1F4E79)",
  orange: "var(--gcs-brand-orange, #EA580C)",
  red:    "var(--gcs-brand-red, #E11D2E)",
  border: "var(--gcs-border-color, rgba(203,213,225,.6))",
  ribbonBg: "var(--gcs-ribbon-bg, rgba(15,23,42,0.22))",
};

const SZ = {
  xs: { padY: 6, padX: 12, minW: 120, label: 12, gap: 10, ringW: 4, badgeFs: 11, badgePx: "2px 6px" },
  sm: { padY: 8, padX: 14, minW: 136, label: 13, gap: 12, ringW: 5, badgeFs: 12, badgePx: "3px 7px" },
  md: { padY: 12, padX: 16, minW: 176, label: 14, gap: 12, ringW: 6, badgeFs: 13, badgePx: "4px 8px" },
} as const;

/* Tints das FAIXAS */
const SEG_TINT = {
  p1: { from: "rgba(225,29,46,0.38)", to: "rgba(225,29,46,0.22)" },
  p2: { from: "rgba(234,88,12,0.34)", to: "rgba(234,88,12,0.18)" },
  p3: { from: "rgba(31,78,121,0.32)", to: "rgba(31,78,121,0.16)" },
};

/* Chips (vidro/cores) */
const CHIP = {
  neutral: {
    light: { from: "#FFFFFF", to: "#F6F8FB", text: "#0F172A", ring: "#C8D2E1" },
    dark:  { from: "rgba(255,255,255,.12)", to: "rgba(255,255,255,.06)", text: "#E6EDF6", ring: "rgba(255,255,255,.28)" },
  },
  p1: {
    light: { from: "#FBE9EE", to: "#F6D5DE", text: "#5F123B", ring: "#F0A4B6" },
    dark:  { from: "rgba(225,29,46,.22)", to: "rgba(225,29,46,.12)", text: "#FDE8ED", ring: "rgba(225,29,46,.36)" },
  },
  p2: {
    light: { from: "#FFF1E9", to: "#FFE5D4", text: "#7C2D12", ring: "#F4B38D" },
    dark:  { from: "rgba(234,88,12,.22)", to: "rgba(234,88,12,.12)", text: "#FFEAD9", ring: "rgba(234,88,12,.36)" },
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

/* ===== Component ===== */
export default function PriorityRibbonTabs({ filtroStatus, statusCounts, onChange, size="xs" }: Props) {
  const s = SZ[size];

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "0") onChange("Todos");
      if (e.key === "1") onChange("Enviadas");
      if (e.key === "2") onChange("Compras");
      if (e.key === "3") onChange("Fiscal");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onChange]);

  const SegmentItem = ({
    label, count, active, onClick, tone,
  }: { label: string; count?: number; active?: boolean; onClick: () => void; tone: "p1"|"p2"|"p3"|"neutral"; }) => {
    const isDark = typeof window !== "undefined" && window.matchMedia?.matches
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false;
    const pal = CHIP[tone][isDark ? "dark" : "light"];
    const badgeBg = BADGE[tone];
    const showBadge = typeof count === "number" && count > 0;

    const countStr = useMemo(
      () => (typeof count === "number" ? (count > 9999 ? `${Math.floor(count/100)/10}k+` : String(count)) : "0"),
      [count]
    );

    return (
      <button
        className={`seg-item ${active ? "active" : ""}`}
        onClick={onClick}
        aria-pressed={!!active}
        style={{
          minWidth: s.minW,
          padding: `${s.padY}px ${s.padX}px`,
          borderRadius: 9999,
          background: `linear-gradient(180deg, ${pal.from}, ${pal.to})`,
          color: pal.text,
          border: "1px solid rgba(255,255,255,.28)",
          boxShadow: active
            ? `0 0 0 ${s.ringW}px ${pal.ring}, 0 8px 18px rgba(0,0,0,.10)`
            : "0 6px 14px rgba(0,0,0,.08)",
          backdropFilter: "blur(8px) saturate(120%)",
          WebkitBackdropFilter: "blur(8px) saturate(120%)",
          fontSize: s.label,
          position: "relative",
          overflow: "visible",
          zIndex: 2,
        }}
      >
        <span className="chipFX" />
        <span className="txt" style={{ position: "relative", zIndex: 2 }}>{label}</span>

        {showBadge && (
          <span
            className="badge"
            aria-label={`${countStr} itens em ${label}`}
            style={{ background: badgeBg, fontSize: s.badgeFs, padding: s.badgePx }}
          >
            {countStr}
          </span>
        )}

        <style jsx>{`
          .seg-item{
            display:inline-flex; align-items:center; gap:8px; white-space:nowrap;
            font-weight:700; letter-spacing:.01em; cursor:pointer;
            transition: transform .14s ease, box-shadow .14s ease, filter .14s ease, border-color .14s ease;
            isolation:isolate;
          }
          .seg-item:hover:not(.active){
            transform: translateY(-0.5px) scale(1.01);
            box-shadow: 0 10px 22px rgba(0,0,0,.12);
            filter: brightness(1.02);
          }
          .seg-item.active{ transform: translateY(-1px); }

          .chipFX{
            pointer-events:none; position:absolute; inset:0; border-radius:inherit; z-index:1;
            background:
              linear-gradient(180deg, rgba(255,255,255,.45), rgba(255,255,255,0) 45%),
              radial-gradient(60% 60% at 50% 0%, rgba(255,255,255,.35), transparent 60%),
              radial-gradient(60% 80% at 50% 120%, rgba(0,0,0,.12), transparent 60%);
            mix-blend-mode: screen; opacity:.9;
          }

          .badge{
            position:absolute; top:-8px; right:-8px; z-index:3;
            color:#fff; border:2px solid #fff; border-radius:9999px; line-height:1;
            font-weight:900; letter-spacing:-0.01em;
            box-shadow: 0 3px 6px rgba(0,0,0,.25);
            pointer-events:none; display:inline-flex; align-items:center; justify-content:center;
          }
          @media (max-width:768px){ .badge{ top:-6px; right:-6px; } }
        `}</style>
      </button>
    );
  };

  return (
    <div className="ribbon">
      <div className="left">
        <SegmentItem
          label="Todos"
          count={statusCounts["Todos"] ?? 0}
          active={filtroStatus==="Todos"}
          onClick={()=>onChange("Todos")}
          tone="neutral"
        />
      </div>

      <div className="flagsWrap">
        {/* ===== SVG de fundo com encaixe perfeito via evenodd ===== */}
        <svg className="flagsBg" viewBox="0 0 3000 120" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="g-p1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SEG_TINT.p1.from}/><stop offset="100%" stopColor={SEG_TINT.p1.to}/>
            </linearGradient>
            <linearGradient id="g-p2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SEG_TINT.p2.from}/><stop offset="100%" stopColor={SEG_TINT.p2.to}/>
            </linearGradient>
            <linearGradient id="g-p3" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SEG_TINT.p3.from}/><stop offset="100%" stopColor={SEG_TINT.p3.to}/>
            </linearGradient>
            <linearGradient id="g-sheen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"  stopColor="rgba(255,255,255,.28)"/>
              <stop offset="45%" stopColor="rgba(255,255,255,.10)"/>
              <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
            </linearGradient>
          </defs>

          {/* P3: recorte à esquerda exatamente com a ponta de P2 (2120,60) */}
          <path
            d="M 2000 0 L 3000 0 L 3000 120 L 2000 120 Z M 2000 0 L 2120 60 L 2000 120 Z"
            fill="url(#g-p3)" fillRule="evenodd"
          />
          {/* P2: ponta à direita em (2120,60) e “mordida” à esquerda (1120,60) */}
          <path
            d="M 1000 0 L 2000 0 L 2120 60 L 2000 120 L 1000 120 Z M 1000 0 L 1120 60 L 1000 120 Z"
            fill="url(#g-p2)" fillRule="evenodd"
          />
          {/* P1: ponta em (1120,60) */}
          <path
            d="M 0 0 L 1000 0 L 1120 60 L 1000 120 L 0 120 Z"
            fill="url(#g-p1)"
          />
          {/* Sheen por cima */}
          <rect x="0" y="0" width="3000" height="120" fill="url(#g-sheen)" />
        </svg>

        {/* ===== Conteúdo ===== */}
        <section className="seg seg-p1">
          <header className="seg-head"><span className="tag">01</span><span className="title">Urgente</span></header>
          <div className="seg-actions">
            <SegmentItem label="Enviadas"  count={statusCounts["Enviadas"]}  active={filtroStatus==="Enviadas"}  onClick={()=>onChange("Enviadas")}  tone="p1" />
            <SegmentItem label="Falha ERP" count={statusCounts["Falha ERP"]} active={filtroStatus==="Falha ERP"} onClick={()=>onChange("Falha ERP")} tone="p1" />
          </div>
        </section>

        <section className="seg seg-p2">
          <header className="seg-head"><span className="tag">02</span><span className="title">Pendências</span></header>
          <div className="seg-actions">
            <SegmentItem label="Compras"   count={statusCounts["Compras"]}   active={filtroStatus==="Compras"}   onClick={()=>onChange("Compras")}   tone="p2" />
            <SegmentItem label="Fiscal"    count={statusCounts["Fiscal"]}    active={filtroStatus==="Fiscal"}    onClick={()=>onChange("Fiscal")}    tone="p2" />
          </div>
        </section>

        <section className="seg seg-p3">
          <header className="seg-head"><span className="tag">03</span><span className="title">Monitorar</span></header>
          <div className="seg-actions">
            <SegmentItem label="Erro I.A."     count={statusCounts["Erro I.A."]}     active={filtroStatus==="Erro I.A."}     onClick={()=>onChange("Erro I.A.")}     tone="p3" />
            <SegmentItem label="Não Recebidas" count={statusCounts["Não Recebidas"]} active={filtroStatus==="Não Recebidas"} onClick={()=>onChange("Não Recebidas")} tone="p3" />
            <SegmentItem label="Importado"     count={statusCounts["Importado"]}     active={filtroStatus==="Importado"}     onClick={()=>onChange("Importado")}     tone="p3" />
            <SegmentItem label="Manual"        count={statusCounts["Manual"]}        active={filtroStatus==="Manual"}        onClick={()=>onChange("Manual")}        tone="p3" />
          </div>
        </section>
      </div>

      <style jsx>{`
        .ribbon{
          --height: 120px;
          --notchRatio: 0.12;  /* 120/1000 do SVG = 12% */
          --safe: 8px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04)),
            ${VARS.ribbonBg};
          border: 1px solid ${VARS.border};
          border-radius: 18px;
          box-shadow: 0 20px 40px rgba(0,0,0,.20) inset, 0 10px 24px rgba(0,0,0,.12);
          backdrop-filter: blur(10px) saturate(120%);
          -webkit-backdrop-filter: blur(10px) saturate(120%);
          padding: 10px;
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 0;
          position: relative;
          overflow: visible; /* não cortar badges */
        }
        .left{
          display:flex; align-items:center; justify-content:center;
          padding-right:16px; margin-right:12px; border-right:1px dashed ${VARS.border}; z-index:3;
        }

        .flagsWrap{
          position: relative; border-radius: 18px;
          /* NÃO usar overflow:hidden aqui pra não cortar nenhum conteúdo */
          overflow: visible;
          display: grid; grid-template-columns: 1fr 1fr 1fr; column-gap: 0; align-items: stretch;
          min-height: var(--height); padding: 12px 16px;
        }
        .flagsBg{ position:absolute; inset:0; width:100%; height:var(--height); z-index:0; }

        .seg{ position:relative; z-index:1; display:flex; flex-direction:column; justify-content:center; }
        .seg-p1{ padding-right: calc(var(--notchRatio) * 100% + var(--safe)); padding-left: 8px; }
        .seg-p2{ padding-left:  calc(var(--notchRatio) * 100% + var(--safe)); padding-right: calc(var(--notchRatio) * 100% + var(--safe)); }
        .seg-p3{ padding-left:  calc(var(--notchRatio) * 100% + var(--safe)); padding-right: 8px; }

        .seg-head{ display:flex; align-items:center; gap:10px; margin-bottom:12px; font-weight:800; letter-spacing:.01em; color:#0f172a; }
        .tag{
          display:inline-flex; align-items:center; justify-content:center;
          min-width:26px; height:26px; padding:0 6px; border-radius:8px;
          background: rgba(255,255,255,.9);
          border:1px solid rgba(0,0,0,.06);
          font-size:11px; font-weight:800; line-height:1;
          box-shadow: 0 1px 1px rgba(0,0,0,.04);
        }
        .seg-p1 .tag{ color:#5F123B; }
        .seg-p2 .tag{ color:#7C2D12; }
        .seg-p3 .tag{ color:#18344F; }
        .title{ font-size:11px; text-transform:uppercase; font-weight:800; }

        .seg-actions{ display:flex; flex-wrap:wrap; gap:${s.gap}px; position:relative; z-index:2; }

        .flagsWrap:has(.seg-item:hover) { filter: brightness(1.015); }

        @media (max-width:1200px){
          .ribbon{ grid-template-columns: 1fr; }
          .left{ border-right:none; border-bottom:1px dashed ${VARS.border}; margin-right:0; padding-bottom:12px; justify-content:flex-start; }
          .flagsBg{ display:none; }
          .flagsWrap{ grid-template-columns:1fr; row-gap:10px; padding:12px 10px; }
          .seg{ background: linear-gradient(180deg, rgba(255,255,255,.24), rgba(255,255,255,.12)); border:1px solid rgba(255,255,255,.2); border-radius:14px; padding: 10px 12px; }
          .seg-p1, .seg-p2, .seg-p3{ padding-left:12px; padding-right:12px; }
        }
        @media (max-width:768px){
          .seg-actions{ overflow-x:auto; flex-wrap:nowrap; -ms-overflow-style:none; scrollbar-width:none; padding-bottom:6px; }
          .seg-actions::-webkit-scrollbar{ display:none; }
          .tag{ width:22px; height:22px; font-size:10px; }
          .title{ font-size:10px; }
        }
      `}</style>
    </div>
  );
}

/* util */
function hexToRgba(hex: string, a = 1) {
  const c = hex.replace("#", "");
  const full = c.length === 3 ? c.split("").map(x => x + x).join("") : c;
  if (full.length !== 6) return `rgba(0,0,0,${a})`;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}
