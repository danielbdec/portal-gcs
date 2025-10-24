// components/PriorityRibbonTabs.tsx
"use client";
import React, { useEffect, useMemo } from "react";

type Counts = Record<string, number>;
type Props = {
  filtroStatus: string;
  statusCounts: Counts;
  onChange: (key: string) => void;
  size?: "xs" | "sm" | "md"; // padrão xs (compacto)
};

/**
 * O componente usa as variáveis do seu tema:
 * --gcs-brand-blue, --gcs-brand-orange, --gcs-brand-red
 * Se não existirem no CSS global, caem nos fallbacks.
 */

// BADGES 100% sólidos (sem translucidez) — lidos das CSS vars
const BADGE = {
  neutral: "var(--gcs-badge-neutral, #64748B)", // cinza
  p1: "var(--gcs-brand-red, #E11D2E)",          // vermelho (urgente)
  p2: "var(--gcs-brand-orange, #EA580C)",       // laranja (pendências)
  p3: "var(--gcs-brand-blue, #1F4E79)",         // azul (monitorar)
} as const;

// tamanhos (pílulas agora são "stadium" — radius 9999)
const SIZE = {
  xs: { padY: 6, padX: 10, minW: 116, radius: 9999, label: 12, gap: 10, ringW: 4, badgeFs: 11, badgePx: "2px 6px" },
  sm: { padY: 8, padX: 12, minW: 136, radius: 9999, label: 13, gap: 10, ringW: 5, badgeFs: 12, badgePx: "3px 7px" },
  md: { padY: 12, padX: 16, minW: 176, radius: 9999, label: 14, gap: 12, ringW: 6, badgeFs: 13, badgePx: "4px 8px" },
};

// paleta das PÍLULAS (fundos clarinhos; textos escuros; anel = tom claro)
const tones = {
  neutral: { from: "#FFFFFF", to: "#F6F8FB", text: "#0F172A", ring: "#CBD5E1" },
  p1: { from: "#FBE9EE", to: "#F6D5DE", text: "#5F123B", ring: "#F1A7B8" }, // vermelho claro
  p2: { from: "#FFF0E8", to: "#FFE4D4", text: "#7C2D12", ring: "#F4B38D" }, // laranja claro
  p3: { from: "#EDF3F9", to: "#E5EEF6", text: "#18344F", ring: "#B4C6D8" }, // azul claro
} as const;

export default function PriorityRibbonTabs({
  filtroStatus,
  statusCounts,
  onChange,
  size = "xs",
}: Props) {
  // atalhos
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "0") onChange("Todos");
      if (e.key === "1") onChange("Enviadas");
      if (e.key === "2") onChange("Compras");
      if (e.key === "3") onChange("Fiscal");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onChange]);

  // [REMOVIDO] O cálculo de 'outrasTotal' foi removido pois não é mais exibido.

  // ===== PÍLULA com BADGE SÓLIDO (opaco) e rótulos sem uppercase (CÓDIGO ORIGINAL DO USUÁRIO) =====
  const SegmentItem = ({
    label,
    count,
    active,
    onClick,
    tone,
  }: {
    label: string;
    count?: number;
    active?: boolean;
    onClick: () => void;
    tone: "p1" | "p2" | "p3" | "neutral";
  }) => {
    const t = tones[tone];
    const s = SIZE[size];
    const badgeBg = BADGE[tone];
    const showBadge = count && count > 0; // Mostrar badge apenas se count > 0

    const countStr = useMemo(() => // UseMemo adicionado para evitar recálculo
      typeof count === "number"
        ? count > 9999
          ? `${Math.floor(count / 100) / 10}k+`
          : String(count)
        : "0"
    , [count]);

    return (
      <button
        className={`seg-item ${active ? "active" : ""}`}
        onClick={onClick}
        aria-pressed={active}
        style={{
          color: t.text,
          background: `linear-gradient(180deg, ${t.from}, ${t.to})`,
          // Padding horizontal ajustado para compensar clip-path no container pai (.seg.flag-*)
          padding: `${s.padY}px calc(${s.padX}px + var(--notch, 0px) / 2)`,
          minWidth: s.minW,
          borderRadius: s.radius, // Usa o radius definido em SIZE (9999)
          gap: s.gap,
          // Estilos ativos aplicados diretamente
          borderColor: active ? t.ring : "var(--gcs-border-color)",
          boxShadow: active
            ? `0 6px 16px rgba(0,0,0,.06), 0 0 0 ${s.ringW}px ${hexToRgba(t.ring, .15)}` // Sombra + Ring
            : "0 1px 0 rgba(0,0,0,.02)", // Sombra padrão sutil
        }}
      >
        <span className="txt" style={{ fontSize: s.label }}>{label}</span>

        {/* badge sólido posicionado */}
        {showBadge && (
             <span
             className="badge"
             aria-label={`${countStr} itens em ${label}`}
             style={{
                 fontSize: s.badgeFs,
                 padding: s.badgePx,
                 background: badgeBg, // Usa cor sólida definida em BADGE
             }}
             >
             {countStr}
             </span>
         )}

        {/* --- ESTILOS DO BOTÃO ORIGINAL + BADGE --- */}
        <style jsx>{`
          .seg-item {
            position: relative; /* Badge precisa de pai relativo */
            display: inline-flex;
            align-items: center;
            justify-content: center; /* Centraliza texto */
            border: 1px solid var(--gcs-border-color); /* Borda padrão */
            font-weight: 700; /* sem maiúsculas */
            letter-spacing: .01em;
            cursor: pointer;
            transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease, background .18s ease;
            isolation: isolate; /* Para o brilho */
            white-space: nowrap; /* Não quebrar texto */
          }
          /* Efeito de brilho sutil */
          .seg-item::after{
            content:"";
            position:absolute; inset:0;
            border-radius: inherit; /* Segue o border-radius do botão */
            pointer-events:none;
            z-index: 0; /* brilho atrás do badge */
            background:
              radial-gradient(90px 45px at 85% 0%, rgba(255,255,255,.30), transparent 60%),
              radial-gradient(90px 45px at 0% 100%, rgba(255,255,255,.18), transparent 60%);
            mix-blend-mode: normal; /* Sem blend mode estranho */
            opacity: 0.7; /* Brilho mais sutil */
          }
          .seg-item:hover:not(.active) { /* Hover apenas para inativos */
             transform: translateY(-0.5px) scale(1.01); /* Leve scale e lift */
             box-shadow: 0 6px 12px rgba(0,0,0,.05);
             border-color: #B0B0B0; /* Borda cinza no hover */
          }
          .seg-item.active {
             border-width: 2px; /* Borda mais grossa no ativo */
             transform: translateY(-1px); /* Mantém leve elevação */
          }
           /* Hover no ativo não faz nada extra */
          .seg-item.active:hover {
             transform: translateY(-1px);
          }

          .txt { z-index: 1; line-height: 1.1; } /* Texto acima do brilho */

          .badge {
            position: absolute;
            top: -8px; /* Posição fixa */
            right: -8px; /* Posição fixa */
            color: #fff; /* Texto branco */
            border: 2px solid #fff; /* Borda branca */
            border-radius: 9999px; /* Garantir círculo/pílula */
            line-height: 1; /* Centralizar texto verticalmente */
            box-shadow: 0 3px 6px rgba(0,0,0,.25); /* Sombra */
            pointer-events: none; /* Não interfere com clique */
            font-weight: 900; /* Bem forte */
            letter-spacing: -0.01em;
            z-index: 2; /* Acima de tudo */
            mix-blend-mode: normal; /* Sem blend mode */
            display: inline-flex; /* Para padding funcionar corretamente */
            align-items: center;
            justify-content: center;
            min-width: calc(var(--badge-fs) * 1.5); /* Largura mínima baseada na fonte */
            height: calc(var(--badge-fs) * 1.5 + 4px); /* Altura baseada na fonte + borda */
          }

          /* Passar variáveis CSS para o badge */
          .badge {
              --badge-fs: ${SIZE[size].badgeFs}px;
              font-size: var(--badge-fs);
              padding: ${SIZE[size].badgePx};
          }


          @media (max-width: 768px) {
            .badge { top: -6px; right: -6px; }
          }
        `}</style>
      </button>
    );
  };
  // ==========================================================================

  return (
    <div className="ribbon-card">
      {/* CSS vars locais com fallback */}
      <style jsx>{`
        .ribbon-card {
          /* Tamanho do 'dente'/'entalhe' */
          --notch: 18px;
          /* Sobreposição entre os cards */
          --overlap: 18px; /* Deve ser igual a --notch */

          /* Cores (lidas das vars globais, com fallback) */
          --brand-blue: var(--gcs-brand-blue, #1F4E79);
          --brand-orange: var(--gcs-brand-orange, #EA580C);
          --brand-red: var(--gcs-brand-red, #E11D2E);

          /* Borda do card */
          --card-border: var(--gcs-border-color);
        }
      `}</style>

      <div className="ribbon">
        <div className="left">
          <SegmentItem
            label="Todos"
            count={statusCounts["Todos"] ?? 0}
            active={filtroStatus === "Todos"}
            onClick={() => onChange("Todos")}
            tone="neutral"
          />
        </div>

        {/* --- Segmentos com classes flag-* --- */}
        <section className="seg p1 flag flag-left">
          <header className="seg-head">
            <span className="tag">01</span>
            <span className="title">Urgente</span>
          </header>
          <div className="seg-actions">
            <SegmentItem label="Enviadas" count={statusCounts["Enviadas"] ?? 0} active={filtroStatus === "Enviadas"} onClick={() => onChange("Enviadas")} tone="p1" />
            <SegmentItem label="Falha ERP" count={statusCounts["Falha ERP"] ?? 0} active={filtroStatus === "Falha ERP"} onClick={() => onChange("Falha ERP")} tone="p1" />
          </div>
        </section>

        <section className="seg p2 flag flag-middle">
          <header className="seg-head">
            <span className="tag">02</span>
            <span className="title">Pendências</span>
          </header>
          <div className="seg-actions">
            <SegmentItem label="Compras" count={statusCounts["Compras"] ?? 0} active={filtroStatus === "Compras"} onClick={() => onChange("Compras")} tone="p2" />
            <SegmentItem label="Fiscal" count={statusCounts["Fiscal"] ?? 0} active={filtroStatus === "Fiscal"} onClick={() => onChange("Fiscal")} tone="p2" />
          </div>
        </section>

        <section className="seg p3 flag flag-right">
          <header className="seg-head">
            <span className="tag">03</span>
            <span className="title">Monitorar</span>
            {/* [REMOVIDO] A contagem total (outrasTotal) foi removida daqui */}
          </header>
          <div className="seg-actions">
            <SegmentItem label="Erro I.A." count={statusCounts["Erro I.A."] ?? 0} active={filtroStatus === "Erro I.A."} onClick={() => onChange("Erro I.A.")} tone="p3" />
            <SegmentItem label="Não Recebidas" count={statusCounts["Não Recebidas"] ?? 0} active={filtroStatus === "Não Recebidas"} onClick={() => onChange("Não Recebidas")} tone="p3" />
            <SegmentItem label="Importado" count={statusCounts["Importado"] ?? 0} active={filtroStatus === "Importado"} onClick={() => onChange("Importado")} tone="p3" />
            <SegmentItem label="Manual" count={statusCounts["Manual"] ?? 0} active={filtroStatus === "Manual"} onClick={() => onChange("Manual")} tone="p3" />
          </div>
        </section>
      </div>

      {/* --- ESTILOS GERAIS + CLIP-PATH (INTEGRADOS) --- */}
      <style jsx>{`
        .ribbon-card {
          border: 1px solid var(--card-border);
          border-radius: 22px;
          background: rgba(255,255,255,0.7); /* Fundo vidro */
          backdrop-filter: saturate(180%) blur(10px);
          -webkit-backdrop-filter: saturate(180%) blur(10px);
          padding: 0.75rem 1rem;
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
          overflow: hidden; /* Manter hidden para clip-path funcionar */
        }
        .ribbon {
          display: grid;
          /* Colunas ajustadas */
          grid-template-columns: auto minmax(150px, auto) minmax(240px, auto) 1fr;
          gap: 0; /* SEM gap */
          align-items: stretch;
        }
        .left {
          display: flex; align-items: center; justify-content: center;
          padding-right: 14px;
          margin-right: calc(6px + var(--overlap) / 2);
          border-right: 1px dashed #cbd5e1;
          z-index: 5;
        }

        /* ===== Base dos Segmentos ===== */
        .seg {
          /* Padding base - será ajustado pelos .flag-* */
          padding: 16px;
          position: relative;
          /* Permitir que o badge vaze */
          overflow: visible;
          transition: transform .18s ease, box-shadow .18s ease, filter .18s ease, background .25s ease;
          background: #fff; /* Fundo fallback */
          border-radius: 18px; /* Arredondamento base */
        }
        /* Fundos como na versão anterior */
        .seg.p1 { background: linear-gradient(110deg, #FEE2E2CC, #FECACACC); }
        .seg.p2 { background: linear-gradient(110deg, #FFEDD5CC, #FED7AACC); }
        .seg.p3 { background: linear-gradient(110deg, #DBEAFECC, #BFDBFECC); }

        .seg:hover {
            transform: translateY(-2px) scale(1.01); filter: brightness(1.03);
            z-index: 10; box-shadow: 0 12px 28px rgba(0,0,0,.1);
        }

        .seg-head {
          display: flex; align-items: center; gap: 10px;
          font-weight: 700; letter-spacing: .01em; margin-bottom: 12px;
          color: #111; position: relative; z-index: 1; /* Acima do brilho */
        }
        .tag {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 26px; height: 26px; padding: 0 6px; border-radius: 8px;
          background: rgba(255,255,255,0.8); border: 1px solid rgba(0,0,0,0.08);
          font-size: 11px; font-weight: 800; line-height: 1;
          box-shadow: 0 1px 1px rgba(0,0,0,.04);
        }
        .p1 .tag { color: var(--brand-red, #991B1B); }
        .p2 .tag { color: var(--brand-orange, #9A3412); }
        .p3 .tag { color: var(--brand-blue, #1E3A8A); }
        .title { font-size: 11px; text-transform: uppercase; font-weight: 800; }
        .total { font-size: 11px; opacity: .7; font-weight: 600; }
        .seg-actions { display: flex; flex-wrap: wrap; gap: 8px; position: relative; z-index: 1;}

        /* ====== GEOMETRIA DE ENCAIXE COM CLIP-PATH ====== */
        .flag {
           /* Padding horizontal ajustado para compensar corte do clip-path */
           padding-left: calc(16px + var(--notch));
           padding-right: calc(16px + var(--notch));
           border-radius: 0; /* Remove o border-radius base onde o clip-path atua */
        }
        .flag-left  { margin-right: calc(var(--overlap) * -1); z-index: 3; }
        .flag-right { margin-left:  calc(var(--overlap) * -1); z-index: 1; }
        .flag-middle{ margin: 0 calc(var(--overlap) * -1);    z-index: 2; }

        @supports (clip-path: polygon(0 0)) {
          .flag-left { /* P1: Ponta para a direita */
            clip-path: polygon(0% 0%, calc(100% - var(--notch)) 0%, 100% 50%, calc(100% - var(--notch)) 100%, 0% 100%);
             border-top-right-radius: 12px; border-bottom-right-radius: 12px;
             /* Padding extra na direita para a ponta */
             padding-right: calc(16px + var(--notch) * 1.5);
          }
          .flag-middle { /* P2: Entalhe esquerdo E direito */
             clip-path: polygon(var(--notch) 0%, calc(100% - var(--notch)) 0%, 100% 50%, calc(100% - var(--notch)) 100%, var(--notch) 100%, 0% 50%);
              /* Padding extra nos dois lados */
              padding-left: calc(16px + var(--notch) * 1.5);
              padding-right: calc(16px + var(--notch) * 1.5);
          }
          .flag-right { /* P3: Ponta para a esquerda */
             clip-path: polygon(var(--notch) 0%, 100% 0%, 100% 100%, var(--notch) 100%, 0% 50%);
              border-top-left-radius: 12px; border-bottom-left-radius: 12px;
              /* Padding extra na esquerda para a ponta */
              padding-left: calc(16px + var(--notch) * 1.5);
          }
        }

        /* Ajustes Responsivos */
        @media (max-width: 1200px) {
          .ribbon { grid-template-columns: 1fr; gap: 12px; }
          .left { border-right: none; border-bottom: 1px dashed #cbd5e1; padding-bottom: 12px; margin: 0 0 8px 0; justify-content: flex-start; }
          /* No modo coluna, remove encaixe e restaura padding/radius */
          .flag-left, .flag-right, .flag-middle {
              margin: 0 !important;
              clip-path: none !important;
              border-radius: 18px !important;
              padding: 16px !important;
          }
        }
        @media (max-width: 768px) {
          .seg-actions { overflow-x: auto; flex-wrap: nowrap; -ms-overflow-style: none; scrollbar-width: none; padding-bottom: 6px;}
          .seg-actions::-webkit-scrollbar { display: none; }
          .tag { width: 22px; height: 22px; font-size: 10px;}
          .title { font-size: 10px; }
          .total { font-size: 10px; }
          /* Padding ajustado para mobile SEM clip-path */
          .flag-left, .flag-right, .flag-middle { padding: 12px !important; }
        }
      `}</style>
    </div>
  );
}

/* util */
function hexToRgba(hex: string, a = 1) {
  const c = hex.replace("#", "");
  const fullHex = c.length === 3 ? c.split("").map(x => x + x).join("") : c;
  if (fullHex.length !== 6) return `rgba(0,0,0,${a})`;
  const n = parseInt(fullHex, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}