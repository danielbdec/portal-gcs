"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Pagination, Tooltip } from "antd";
import * as XLSX from "xlsx";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  ResponsiveContainer,
  Sector,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  RefreshCcw,
  FileText,
  AlertTriangle,
  Search,
  Building2,
  Hash,
  Truck,
  Calendar,
  BadgeCheck,
  MessageSquare,
  User,
  Settings2,
  ChevronsUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X,
  FileDown,
  TrendingUp,
  Send,
  ShoppingCart,
  Landmark,
  Lock,
  CheckSquare,
  Square,
  Sun,
  Moon,
} from "lucide-react";
import ModalDetalhes from "./ModalDetalhes";
import NotificationModal from "./NotificationModal";
import { createPortal } from "react-dom";
import "antd/dist/reset.css";
import PriorityRibbonTabs, { RIBBON_STATUS_LIST } from "./PriorityRibbonTabs";

/* ======================== HELPERS GERAIS ======================== */

const LoadingSpinner = ({ text }: { text: string }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      textAlign: "center",
    }}
  >
    <div
      style={{
        width: "40px",
        height: "40px",
        border: "4px solid var(--gcs-gray-medium)",
        borderTop: "4px solid var(--gcs-blue)",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }}
    />
    <div
      style={{
        marginTop: "1rem",
        fontWeight: "bold",
        color: "var(--gcs-blue)",
      }}
      className="loading-text"
    >
      {text}
    </div>
  </div>
);

const AcessoNegado = () => {
  const router = useRouter();
  return (
    <div
      className="content-card"
      style={{
        textAlign: "center",
        padding: "3rem",
        maxWidth: "600px",
        margin: "auto",
      }}
    >
      <Lock size={48} color="var(--gcs-orange)" />
      <h2 style={{ marginTop: "1.5rem", color: "var(--gcs-blue)" }}>
        Acesso Negado
      </h2>
      <p
        style={{
          color: "var(--gcs-gray-dark)",
          maxWidth: "400px",
          margin: "1rem auto",
        }}
      >
        Você não tem as permissões necessárias para visualizar esta página.
        Por favor, contacte um administrador se acredita que isto é um erro.
      </p>
      <button
        onClick={() => router.push("/painel")}
        className="btn btn-green"
        style={{ marginTop: "1rem" }}
      >
        Voltar ao Painel
      </button>
    </div>
  );
};

const formatTimeAgo = (date: Date | null): string => {
  if (!date) return "";
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "agora mesmo";
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return `há 1 minuto`;
  if (minutes < 60) return `há ${minutes} minutos`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return `há 1 hora`;
  if (hours < 24) return `há ${hours} horas`;
  const days = Math.floor(hours / 24);
  if (days === 1) return `há 1 dia`;
  return `há ${days} dias`;
};

const formatProtheusDateTime = (
  dateString: string | null | undefined
): string => {
  if (!dateString) return "—";
  try {
    const year = dateString.substring(0, 4);
    const month = dateString.substring(5, 7);
    const day = dateString.substring(8, 10);
    const hour = dateString.substring(11, 13);
    const minute = dateString.substring(14, 16);

    if (
      year.length !== 4 ||
      month.length !== 2 ||
      day.length !== 2 ||
      hour.length !== 2 ||
      minute.length !== 2
    ) {
      return "—";
    }

    return `${day}/${month}/${year} ${hour}:${minute}`;
  } catch {
    return "—";
  }
};

/* ======================== TIPOS ======================== */

interface Nota {
  filial: string;
  dt_recebimento: string;
  hr_Recebimento: string;
  grp_empresa: string;
  nf: string;
  serie: string;
  tipo_nf: string;
  nome_fornecedor: string;
  chave: string;
  status_nf: string;
  dt_atualizacao: string;
  observacao: string;
  comprador: string;
  status_lancamento?: string;
  status_envio_unidade?: string;
  status_compras?: string;
  status_fiscal?: string;
  dt_lcto_protheus?: string;
  conferido?: "S" | "N" | null;
}

/* ======================== COMPONENTES ======================== */

const StatusSetorDots = ({
  statusUnidade,
  statusCompras,
  statusFiscal,
}: {
  statusUnidade?: string;
  statusCompras?: string;
  statusFiscal?: string;
}) => {
  const getIconBgColor = (status: string | undefined, completedValue: string) =>
    typeof status === "string" && status.trim().toUpperCase() === completedValue
      ? "#28a745"
      : "#dc3545";

  let unidadeTitleText = "Pendente";
  if (typeof statusUnidade === "string") {
    if (statusUnidade.trim().toUpperCase() === "SIM") unidadeTitleText = "Enviado";
    else if (statusUnidade.trim().toUpperCase() === "NAO")
      unidadeTitleText = "Não Enviado";
  }

  const unidadeBgColor = getIconBgColor(statusUnidade, "SIM");
  const comprasBgColor = getIconBgColor(statusCompras, "CONCLUÍDO");
  const fiscalBgColor = getIconBgColor(statusFiscal, "CONCLUÍDO");

  const iconContainerStyle: React.CSSProperties = {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        title={`Fazenda: ${unidadeTitleText}`}
        style={{ ...iconContainerStyle, backgroundColor: unidadeBgColor }}
      >
        <Send size={16} color="white" />
      </div>
      <div
        title={`Compras: ${statusCompras || "Pendente"}`}
        style={{ ...iconContainerStyle, backgroundColor: comprasBgColor }}
      >
        <ShoppingCart size={16} color="white" />
      </div>
      <div
        title={`Fiscal: ${statusFiscal || "Pendente"}`}
        style={{ ...iconContainerStyle, backgroundColor: fiscalBgColor }}
      >
        <Landmark size={16} color="white" />
      </div>
    </div>
  );
};

/* ==== FilterPopover — ANCORADO AO CONTÊINER ROLÁVEL ==== */

/** Encontra o ancestral rolável mais próximo (overflow: auto|scroll) */
function getScrollParent(node: HTMLElement | null): HTMLElement | null {
  if (!node) return null;
  const style = (el: HTMLElement) => getComputedStyle(el);
  let cur: HTMLElement | null = node.parentElement;
  while (cur && cur !== document.body) {
    const s = style(cur);
    const overflowY = s.overflowY;
    const overflow = s.overflow;
    const isScrollable =
      overflowY === "auto" ||
      overflowY === "scroll" ||
      overflow === "auto" ||
      overflow === "scroll";
    if (isScrollable) return cur;
    cur = cur.parentElement;
  }
  return document.scrollingElement as HTMLElement;
}

const FilterPopover = ({
  allFiliais,
  allTipos,
  allCompradores,
  allStatusLancamento,
  onApplyFilters,
  initialFilters,
}: {
  allFiliais: string[];
  allTipos: string[];
  allCompradores: string[];
  allStatusLancamento: string[];
  onApplyFilters: (filters: any) => void;
  initialFilters: any;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const [filial, setFilial] = useState(initialFilters.filial || "Todas");
  const [tipo, setTipo] = useState(initialFilters.tipo || "Todos");
  const [responsavel, setResponsavel] = useState(
    initialFilters.responsavel || "Todos"
  );
  const [statusLancamento, setStatusLancamento] = useState(
    initialFilters.statusLancamento || "Todos"
  );
  const [startDate, setStartDate] = useState(initialFilters.startDate || "");
  const [endDate, setEndDate] = useState(initialFilters.endDate || "");
  const [startDateProtheus, setStartDateProtheus] = useState(
    initialFilters.startDateProtheus || ""
  );
  const [endDateProtheus, setEndDateProtheus] = useState(
    initialFilters.endDateProtheus || ""
  );

  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const scrollParentRef = useRef<HTMLElement | null>(null);

  // Posição relativa ao SCROLL PARENT
  const POPOVER_WIDTH = 360;
  const [relPos, setRelPos] = useState<{ top: number; left: number }>({
    top: -9999,
    left: -9999,
  });

  const [isBrowser, setIsBrowser] = useState(false);
  useEffect(() => setIsBrowser(true), []);

  const computeRelativePosition = useCallback(() => {
    if (!buttonRef.current || !scrollParentRef.current) return;

    const btnRect = buttonRef.current.getBoundingClientRect();
    const parentRect = scrollParentRef.current.getBoundingClientRect();

    // posição do botão dentro do parent (compensa padding/scroll)
    const topInParent = btnRect.bottom - parentRect.top + 8; // 8px abaixo do botão
    const leftInParent = btnRect.right - parentRect.left - POPOVER_WIDTH; // alinhar pela direita

    setRelPos({
      top: Math.max(0, topInParent),
      left: Math.max(0, leftInParent),
    });
  }, []);

  // Ao abrir: encontra o parent rolável e calcula posição
  useEffect(() => {
    if (!isOpen) return;
    const btn = buttonRef.current;
    const parent = getScrollParent(btn as any) as HTMLElement | null;
    scrollParentRef.current = parent || (document.scrollingElement as HTMLElement);

    computeRelativePosition();

    // Ajusta em resize e em mudanças de layout do parent
    const onResize = () => computeRelativePosition();
    window.addEventListener("resize", onResize);

    // Observa mudanças de tamanho/posicionamento do botão
    const ro = new ResizeObserver(() => computeRelativePosition());
    if (btn) ro.observe(btn);

    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, [isOpen, computeRelativePosition]);

  // Fechar ao clicar fora (sem fechar em scroll)
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isButton = target.closest(".btn-filter-toggle");
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        !isButton
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleApply = () => {
    onApplyFilters({
      filial,
      tipo,
      responsavel,
      statusLancamento,
      startDate,
      endDate,
      startDateProtheus,
      endDateProtheus,
    });
    setIsOpen(false);
  };

  const handleClear = () => {
    setFilial("Todas");
    setTipo("Todos");
    setResponsavel("Todos");
    setStatusLancamento("Todos");
    setStartDate("");
    setEndDate("");
    setStartDateProtheus("");
    setEndDateProtheus("");

    onApplyFilters({
      filial: "Todas",
      tipo: "Todos",
      responsavel: "Todos",
      statusLancamento: "Todos",
      startDate: "",
      endDate: "",
      startDateProtheus: "",
      endDateProtheus: "",
    });
    setIsOpen(false);
  };

  const popoverContent = (
    <div
      ref={popoverRef}
      className="filter-popover-content"
      style={{
        position: "absolute", // relativo ao scroll parent
        top: relPos.top,
        left: relPos.left,
        width: `${POPOVER_WIDTH}px`,
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        border: "1px solid var(--gcs-border-color)",
        zIndex: 2147483646,
        padding: "1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h4 style={{ margin: 0, color: "var(--gcs-blue)" }}>Filtros Avançados</h4>
        <button
          onClick={() => setIsOpen(false)}
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <X size={18} color="var(--gcs-gray-dark)" />
        </button>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: "block",
              marginBottom: "4px",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            Dt. Receb. Inicial
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid var(--gcs-border-color)",
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: "block",
              marginBottom: "4px",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            Dt. Receb. Final
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid var(--gcs-border-color)",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: "block",
              marginBottom: "4px",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            Dt. Imp. Protheus Inicial
          </label>
          <input
            type="date"
            value={startDateProtheus}
            onChange={(e) => setStartDateProtheus(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid var(--gcs-border-color)",
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: "block",
              marginBottom: "4px",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            Dt. Imp. Protheus Final
          </label>
          <input
            type="date"
            value={endDateProtheus}
            onChange={(e) => setEndDateProtheus(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid var(--gcs-border-color)",
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label
          style={{
            display: "block",
            marginBottom: "4px",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          Filial
        </label>
        <select
          value={filial}
          onChange={(e) => setFilial(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid var(--gcs-border-color)",
          }}
        >
          {allFiliais.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label
          style={{
            display: "block",
            marginBottom: "4px",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          Tipo
        </label>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid var(--gcs-border-color)",
          }}
        >
          {allTipos.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label
          style={{
            display: "block",
            marginBottom: "4px",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          Responsável
        </label>
        <select
          value={responsavel}
          onChange={(e) => setResponsavel(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid var(--gcs-border-color)",
          }}
        >
          {allCompradores.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <label
          style={{
            display: "block",
            marginBottom: "4px",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          Status da Nota
        </label>
        <select
          value={statusLancamento}
          onChange={(e) => setStatusLancamento(e.target.value)}
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid var(--gcs-border-color)",
          }}
        >
          {allStatusLancamento.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
        <button
          onClick={handleClear}
          className="btn btn-outline-gray"
          style={{ padding: "8px 16px" }}
        >
          Limpar
        </button>
        <button
          onClick={handleApply}
          className="btn btn-green"
          style={{ padding: "8px 16px" }}
        >
          Aplicar
        </button>
      </div>
    </div>
  );

  // Renderiza o popover dentro do SCROLL PARENT
  const renderPopoverInParent = () => {
    if (!isOpen || !isBrowser) return null;
    const parent = scrollParentRef.current;
    if (!parent) return null;
    return createPortal(popoverContent, parent);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (!isOpen) {
            // calcula e ancora no parent imediatamente
            setTimeout(() => {
              // garante que scrollParent foi definido
              const btn = buttonRef.current;
              const parent = getScrollParent(btn as any) as HTMLElement | null;
              scrollParentRef.current = parent || (document.scrollingElement as HTMLElement);
              computeRelativePosition();
            }, 0);
          }
        }}
        title="Filtros Avançados"
        className="btn btn-outline-gray btn-filter-toggle"
        style={{ padding: "9px" }}
        ref={buttonRef}
      >
        <Filter size={20} />
      </button>

      {renderPopoverInParent()}
    </div>
  );
};

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  message,
  title = "Confirmação Necessária",
  icon = <AlertTriangle size={40} color="#f7941d" />,
  confirmText = "OK, Entendi",
  confirmColor = "#dc3545",
  showCancelButton = true,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
  title?: string;
  icon?: React.ReactNode;
  confirmText?: string;
  confirmColor?: string;
  showCancelButton?: boolean;
}) => {
  if (!isOpen) return null;
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.5)",
          zIndex: 2147483648,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          zIndex: 2147483649,
          maxWidth: "450px",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
          {icon}
        </div>
        <h3 style={{ marginTop: 0, marginBottom: "1rem", color: "#333" }}>{title}</h3>
        <p style={{ color: "#666", lineHeight: 1.6 }}>{message}</p>
        <div
          style={{
            marginTop: "1.5rem",
            display: "flex",
            justifyContent: "center",
            gap: "1rem",
          }}
        >
          {showCancelButton && (
            <button
              onClick={onClose}
              style={{
                padding: "10px 20px",
                borderRadius: "5px",
                border: "1px solid #ccc",
                background: "#f1f1f1",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Cancelar
            </button>
          )}
          <button
            onClick={onConfirm}
            style={{
              padding: "10px 20px",
              borderRadius: "5px",
              border: "none",
              background: confirmColor,
              color: "white",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </>
  );
};

/* ======================== PÁGINA ======================== */

export default function ConsultaNotas() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<
    "loading" | "authorized" | "unauthorized"
  >("loading");

  const [notas, setNotas] = useState<Nota[]>([]);
  const [filtroStatus, setFiltroStatus] = useState<string>("Todos");
  const [buscaRaw, setBuscaRaw] = useState<string>("");
  const [busca, setBusca] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [notaSelecionada, setNotaSelecionada] = useState<Nota | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalServidor, setTotalServidor] = useState<number>(0);
  const [totaisAbas, setTotaisAbas] = useState<Record<string, number>>({});
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Nota | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });

  const [isConfirmConferenciaOpen, setIsConfirmConferenciaOpen] =
    useState(false);
  const [conferenciaNota, setConferenciaNota] = useState<Nota | null>(null);
  const [newConferenciaStatus, setNewConferenciaStatus] =
    useState<"S" | "N" | null>(null);
  const [isSubmittingConferencia, setIsSubmittingConferencia] =
    useState(false);
  const [notification, setNotification] = useState({
    visible: false,
    type: "success" as "success" | "error",
    message: "",
  });

  const [advancedFilters, setAdvancedFilters] = useState({
    filial: "Todas",
    tipo: "Todos",
    responsavel: "Todos",
    statusLancamento: "Todos",
    startDate: "",
    endDate: "",
    startDateProtheus: "",
    endDateProtheus: "",
  });

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [chartKey, setChartKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [timeAgo, setTimeAgo] = useState("");

  const [totalPendentes, setTotalPendentes] = useState<number>(0);
  const [totalNotasHoje, setTotalNotasHoje] = useState<number>(0);

  const [allFiliais, setAllFiliais] = useState<string[]>(["Todos"]);
  const [allTipos, setAllTipos] = useState<string[]>(["Todos"]);
  const [allCompradores, setAllCompradores] = useState<string[]>(["Todos"]);
  const [allStatusLancamento, setAllStatusLancamento] =
    useState<string[]>(["Todos"]);

  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark";
    setTheme(saved || "light");
  }, []);
  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setBusca(buscaRaw);
      setPaginaAtual(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [buscaRaw]);

  const handleApplyAdvancedFilters = (filters: any) => {
    setAdvancedFilters(filters);
    setPaginaAtual(1);
  };

  const handleFiltroStatusChange = (status: string) => {
    setFiltroStatus(status);
    setPaginaAtual(1);
  };

  useEffect(() => {
    if (status === "loading") {
      setAuthStatus("loading");
      return;
    }
    if (status === "authenticated") {
      const user = (session as any)?.user;
      const hasAccess =
        user?.is_admin === true ||
        (user?.funcoes || []).includes("nfEntrada.centralDeNotas");
      if (hasAccess) setAuthStatus("authorized");
      else router.push("/login");
    } else {
      router.push("/login");
    }
  }, [status, session, router]);

  useEffect(() => {
    setTimeAgo(formatTimeAgo(lastUpdated));
    const interval = setInterval(
      () => setTimeAgo(formatTimeAgo(lastUpdated)),
      60000
    );
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const statusDisponiveis = RIBBON_STATUS_LIST;

  const statusCounts = useMemo(() => {
    if (totaisAbas && Object.keys(totaisAbas).length) return totaisAbas;
    return {};
  }, [totaisAbas]);

  const dadosGraficoStatus = useMemo(() => {
    return statusDisponiveis
      .filter((key) => key !== "Todos" && (statusCounts as any)[key] > 0)
      .map((name) => ({ name, value: (statusCounts as any)[name] }));
  }, [statusCounts]);

  const areFiltersApplied = useMemo(() => {
    const isStatusFiltered = filtroStatus !== "Todos";
    const isSearchFiltered = busca.trim() !== "";
    const isAdvancedFiltered =
      advancedFilters.filial !== "Todas" ||
      advancedFilters.responsavel !== "Todos" ||
      advancedFilters.tipo !== "Todos" ||
      advancedFilters.statusLancamento !== "Todos" ||
      advancedFilters.startDate !== "" ||
      advancedFilters.endDate !== "" ||
      advancedFilters.startDateProtheus !== "" ||
      advancedFilters.endDateProtheus !== "";
    return isStatusFiltered || isSearchFiltered || isAdvancedFiltered;
  }, [filtroStatus, busca, advancedFilters]);

  useEffect(() => {
    if (filtroStatus === "Todos") setActiveIndex(null);
    else {
      const i = dadosGraficoStatus.findIndex((d) => d.name === filtroStatus);
      setActiveIndex(i !== -1 ? i : null);
    }
  }, [filtroStatus, dadosGraficoStatus]);

  useEffect(() => {
    setChartKey((k) => k + 1);
  }, [filtroStatus, theme]);

  const onPieEnter = (_: any, index: number) => setActiveIndex(index);
  const onPieLeave = () => {
    const i = dadosGraficoStatus.findIndex((d) => d.name === filtroStatus);
    setActiveIndex(i !== -1 ? i : null);
  };
  const handleChartClick = (d: any) => {
    if (d && d.name && statusDisponiveis.includes(d.name)) {
      handleFiltroStatusChange(d.name);
    }
  };

  const abrirModalDetalhes = (nota: Nota) => {
    if (!nota.chave) return;
    setNotaSelecionada(nota);
    setModalAberto(true);
  };

  const statusFiltroToStatusNf = (tab: string): string | null => {
    const map: Record<string, string> = {
      "Erro I.A.": "erro i.a.",
      "Não Recebidas": "aguardando",
      Importado: "importado",
      Manual: "manual",
      "Falha ERP": "erro execauto",
    };
    return map[tab] ?? null;
  };

  const sortWhitelist = new Set([
    "dt_atualizacao",
    "dt_recebimento",
    "nf",
    "serie",
    "nome_fornecedor",
    "status_nf",
    "tipo_nf",
    "dt_lcto_protheus",
  ]);
  const sortKeyToBackend = (k: keyof Nota | null) =>
    k && sortWhitelist.has(k as string) ? (k as string) : "dt_atualizacao";

  const fetchNotas = async () => {
    try {
      setLoading(true);
      const body: any = {
        page: paginaAtual,
        pageSize,
        sortBy: sortKeyToBackend(sortConfig.key),
        sortDir: sortConfig.direction || "asc",
        termo: (busca || "").trim() || undefined,
        filial:
          advancedFilters.filial === "Todas" ? undefined : advancedFilters.filial,
        tipo: advancedFilters.tipo === "Todos" ? undefined : advancedFilters.tipo,
        responsavel:
          advancedFilters.responsavel === "Todos"
            ? undefined
            : advancedFilters.responsavel,
        statusLancamento:
          advancedFilters.statusLancamento === "Todos"
            ? undefined
            : advancedFilters.statusLancamento,
        startDate: advancedFilters.startDate || undefined,
        endDate: advancedFilters.endDate || undefined,
        startDateProtheus: advancedFilters.startDateProtheus || undefined,
        endDateProtheus: advancedFilters.endDateProtheus || undefined,
      };

      if (filtroStatus && filtroStatus !== "Todos") {
        const statusNf = statusFiltroToStatusNf(filtroStatus);
        if (statusNf) {
          body.status_nf = statusNf;
        } else {
          if (filtroStatus === "Compras") body.only_compras_pendentes = true;
          if (filtroStatus === "Fiscal") body.only_fiscal_pendentes = true;
          if (filtroStatus === "Enviadas") body.only_enviadas_pendentes = true;
        }
      }

      const response = await fetch(
        "/api/nfe/nfe-consulta-notas-cabecalho-paginado",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(body),
        }
      );
      const payload = await response.json();

      setNotas(Array.isArray(payload?.data) ? payload.data : []);
      setTotalServidor(Number(payload?.total ?? 0));
      setTotaisAbas(payload?.tabs || {});
      setTotalPendentes(Number(payload?.pendentes_total ?? 0));
      setTotalNotasHoje(Number(payload?.notas_hoje ?? 0));

      if (Array.isArray(payload?.distinct_filiais) && payload.distinct_filiais.length > 0)
        setAllFiliais(payload.distinct_filiais);
      else if (!advancedFilters.filial || advancedFilters.filial === "Todas")
        setAllFiliais(["Todos"]);

      if (Array.isArray(payload?.distinct_tipos) && payload.distinct_tipos.length > 0)
        setAllTipos(payload.distinct_tipos);
      else if (!advancedFilters.tipo || advancedFilters.tipo === "Todos")
        setAllTipos(["Todos"]);

      if (
        Array.isArray(payload?.distinct_compradores) &&
        payload.distinct_compradores.length > 0
      )
        setAllCompradores(payload.distinct_compradores);
      else if (!advancedFilters.responsavel || advancedFilters.responsavel === "Todos")
        setAllCompradores(["Todos"]);

      if (Array.isArray(payload?.distinct_status) && payload.distinct_status.length > 0)
        setAllStatusLancamento(payload.distinct_status);
      else if (
        !advancedFilters.statusLancamento ||
        advancedFilters.statusLancamento === "Todos"
      )
        setAllStatusLancamento(["Todos"]);

      setChartKey((k) => k + 1);
      setLastUpdated(new Date());
    } catch {
      setNotas([]);
      setTotalServidor(0);
      setTotaisAbas({});
      setTotalPendentes(0);
      setTotalNotasHoje(0);
      setAllFiliais(["Todos"]);
      setAllTipos(["Todos"]);
      setAllCompradores(["Todos"]);
      setAllStatusLancamento(["Todos"]);
    } finally {
      setLoading(false);
    }
  };

  const requestSort = (key: keyof Nota) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
    setPaginaAtual(1);
  };

  const notasPaginadas = notas;

  const coresStatus: Record<string, string> = {
    "Erro I.A.": "#ff6f61",
    "Não Recebidas": "var(--gcs-orange)",
    Importado: "var(--gcs-green)",
    Manual: "#343a40",
    "Falha ERP": "#8B0000",
    Compras: "#FFC107",
    Fiscal: "#00314A",
    Enviadas: "#17a2b8",
  };

  const coresStatusDonut: Record<string, string> = {
    "Erro I.A.": "url(#gradVermelho)",
    "Não Recebidas": "url(#gradLaranja)",
    Importado: "url(#gradVerde)",
    Manual: "url(#gradCinza)",
    "Falha ERP": "url(#gradVermelho)",
    Compras: "url(#gradAmarelo)",
    Fiscal: "url(#gradAzul)",
    Enviadas: "url(#gradAzulClaro)",
  };

  const SortIcon = ({ columnKey }: { columnKey: keyof Nota }) => {
    if (sortConfig.key !== columnKey) {
      return (
        <ChevronsUpDown size={14} style={{ marginLeft: "4px", color: "#ffffff80" }} />
      );
    }
    if (sortConfig.direction === "asc") {
      return <ArrowUp size={14} style={{ marginLeft: "4px" }} />;
    }
    return <ArrowDown size={14} style={{ marginLeft: "4px" }} />;
  };

  const handleExportXLSX = () => {
    const headers = [
      "Conferido",
      "Status da Nota",
      "Filial",
      "Nota",
      "Série",
      "Tipo",
      "Fornecedor",
      "Recebimento",
      "Lançamento Protheus",
      "Status Envio Unidade",
      "Status Compras",
      "Status Fiscal",
      "Observação",
      "Responsável",
      "Chave",
    ];

    const data = notasPaginadas.map((nota) => [
      nota.conferido === "S" ? "Sim" : "Não",
      nota.status_lancamento || "",
      nota.filial,
      nota.nf,
      nota.serie,
      nota.tipo_nf || "",
      nota.nome_fornecedor,
      `${nota.dt_recebimento} ${nota.hr_Recebimento}`,
      formatProtheusDateTime(nota.dt_lcto_protheus),
      nota.status_envio_unidade || "",
      nota.status_compras || "",
      nota.status_fiscal || "",
      nota.observacao || "",
      nota.comprador || "",
      nota.chave,
    ]);

    const worksheetData = [headers, ...data];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet["!cols"] = [
      { wch: 10 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
      { wch: 10 },
      { wch: 10 },
      { wch: 40 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 50 },
      { wch: 25 },
      { wch: 50 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Notas Fiscais");
    XLSX.writeFile(workbook, "Consulta_Notas_Fiscais_Pagina.xlsx");
  };

  // 1) Abre modal confirmação conferência
  const handleCheckboxClick = (nota: Nota) => {
    if (isSubmittingConferencia) return;
    const newStatus = nota.conferido === "S" ? "N" : "S";
    setConferenciaNota(nota);
    setNewConferenciaStatus(newStatus);
    setIsConfirmConferenciaOpen(true);
  };

  // 2) Fecha modal
  const handleCloseConferencia = () => {
    if (isSubmittingConferencia) return;
    setIsConfirmConferenciaOpen(false);
    setConferenciaNota(null);
    setNewConferenciaStatus(null);
  };

  // 3) Confirma alteração
  const handleConfirmConferencia = async () => {
    if (!session?.user?.email) {
      setNotification({
        visible: true,
        type: "error",
        message: "Erro: Sessão do usuário não encontrada. Faça login novamente.",
      });
      setIsConfirmConferenciaOpen(false);
      return;
    }
    if (!conferenciaNota || !newConferenciaStatus) {
      setNotification({
        visible: true,
        type: "error",
        message: "Erro: Informações da nota não encontradas. Tente novamente.",
      });
      setIsConfirmConferenciaOpen(false);
      return;
    }
    setIsSubmittingConferencia(true);
    try {
      const bodyPayload = {
        chave: conferenciaNota.chave,
        email_solicitante: (session.user as any).email,
        conferido: newConferenciaStatus,
      };
      const response = await fetch("/api/nfe/nfe-conferencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result?.status === "ok") {
        setNotification({
          visible: true,
          type: "success",
          message: `Nota ${
            newConferenciaStatus === "S" ? "marcada" : "desmarcada"
          } com sucesso!`,
        });
        fetchNotas();
      } else {
        const msg =
          result?.message ||
          `Erro ao se comunicar com o servidor (HTTP ${response.status})`;
        throw new Error(msg);
      }
    } catch (error: any) {
      setNotification({
        visible: true,
        type: "error",
        message: error?.message || "Não foi possível realizar a operação.",
      });
    } finally {
      setIsSubmittingConferencia(false);
      setIsConfirmConferenciaOpen(false);
      setConferenciaNota(null);
      setNewConferenciaStatus(null);
    }
  };

  const handleCloseNotification = () => {
    setNotification({ visible: false, type: "success", message: "" });
  };

  const renderLegendText = (value: string) => (
    <span style={{ marginLeft: "4px" }} className="recharts-legend-item-text">
      {value}
    </span>
  );

  useEffect(() => {
    if (authStatus === "authorized") {
      fetchNotas();
    }
  }, [authStatus, paginaAtual, pageSize, busca, filtroStatus, advancedFilters, sortConfig]);

  const glassTooltipStyle: React.CSSProperties = {
    borderRadius: "12px",
    border: "1px solid",
    backdropFilter: "blur(14px) saturate(140%)",
    WebkitBackdropFilter: "blur(14px) saturate(140%)",
    boxShadow: "0 8px 24px rgba(0,0,0,.12)",
    color: theme === "dark" ? "#E2E8F0" : "#00314A",
    background: theme === "dark" ? "rgba(25,39,53,.50)" : "rgba(255,255,255,.25)",
    borderColor: theme === "dark" ? "rgba(125,173,222,.28)" : "rgba(255,255,255,.35)",
  };
  const tooltipLabelStyle: React.CSSProperties = {
    color: theme === "dark" ? "#E2E8F0" : "#00314A",
    fontWeight: "bold",
  };
  const tooltipItemStyle: React.CSSProperties = {
    color: theme === "dark" ? "#E2E8F0" : "#00314A",
  };

  const renderActiveShape = (props: any) => {
    const RADIAN = Math.PI / 180;
    const {
      cx,
      cy,
      midAngle,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      fill,
      payload,
      percent,
      value,
    } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 2) * cos;
    const sy = cy + (outerRadius + 2) * sin;
    const mx = cx + (outerRadius + 15) * cos;
    const my = cy + (outerRadius + 15) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 15;
    const ey = my;
    const textAnchor = cos >= 0 ? "start" : "end";
    const labelFillColor = theme === "dark" ? "#F1F5F9" : "#333";
    const percentFillColor = theme === "dark" ? "#94A3B8" : "#999";

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 4}
          outerRadius={outerRadius + 8}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text
          x={ex + (cos >= 0 ? 1 : -1) * 12}
          y={ey}
          textAnchor={textAnchor}
          fill={labelFillColor}
          style={{ fontSize: "13px" }}
        >
          {`${payload.name}`}
        </text>
        <text
          x={ex + (cos >= 0 ? 1 : -1) * 12}
          y={ey}
          dy={18}
          textAnchor={textAnchor}
          fill={percentFillColor}
          style={{ fontSize: "12px" }}
        >
          {`(${value} - ${(percent * 100).toFixed(1)}%)`}
        </text>
      </g>
    );
  };

  const ConferidoCheckbox = ({
    conferido,
    onClick,
  }: {
    conferido: "S" | "N" | null | undefined;
    onClick: () => void;
  }) => {
    const isChecked = conferido === "S";
    const color = isChecked ? "var(--gcs-green)" : "var(--gcs-gray-dark)";
    return (
      <button
        onClick={onClick}
        title={isChecked ? "Desmarcar conferência" : "Marcar como conferido"}
        disabled={isSubmittingConferencia}
        style={{
          background: "none",
          border: "none",
          cursor: isSubmittingConferencia ? "wait" : "pointer",
          padding: "4px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color,
          opacity: isSubmittingConferencia ? 0.5 : 1,
        }}
        className="conferido-checkbox-btn"
      >
        {isChecked ? <CheckSquare size={20} /> : <Square size={20} />}
      </button>
    );
  };

  return (
    <>
      {/* --- SVG DE GRADIENTES --- */}
      <svg width="0" height="0" style={{ position: "absolute", zIndex: -1 }}>
        <defs>
          <linearGradient id="gradLaranja" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f79b4d" />
            <stop offset="100%" stopColor="#F58220" />
          </linearGradient>
          <linearGradient id="gradVerde" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9DDE5B" />
            <stop offset="100%" stopColor="#5FB246" />
          </linearGradient>
          <linearGradient id="gradVermelho" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff6f61" />
            <stop offset="100%" stopColor="#E11D2E" />
          </linearGradient>
          <linearGradient id="gradAmarelo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFC107" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
          <linearGradient id="gradAzul" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1F4E79" />
            <stop offset="100%" stopColor="#00314A" />
          </linearGradient>
          <linearGradient id="gradAzulClaro" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#17a2b8" />
            <stop offset="100%" stopColor="#1F4E79" />
          </linearGradient>
          <linearGradient id="gradCinza" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6c757d" />
            <stop offset="100%" stopColor="#343a40" />
          </linearGradient>
        </defs>
      </svg>

      {/* --- ESTILOS --- */}
      <style>{`
        :root {
          --gcs-blue: #00314A;
          --gcs-green: #5FB246;
          --gcs-orange: #F58220;
          --gcs-orange-light: #FDBA74;
          --gcs-gray-light: #f8f9fa;
          --gcs-gray-medium: #e9ecef;
          --gcs-gray-dark: #6c757d;
          --gcs-border-color: #dee2e6;
          --gcs-gray-soft: #adb5bd;

          --gcs-red-light-bg: #f8d7da;
          --gcs-red-border: #f1c2c7;
          --gcs-red-text: #b22c38;
          --gcs-brand-red: #E11D2E;

          --gcs-orange-light-bg: #fff8e1;
          --gcs-orange-border: #FDBA74;
          --gcs-orange-text: #F58220;
          --gcs-brand-orange: #EA580C;

          --gcs-blue-light-bg: #f1f5fb;
          --gcs-blue-border: #a3b8d1;
          --gcs-blue-text: #00314A;
          --gcs-brand-blue: #1F4E79;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        /* ====== TODA ESTILIZAÇÃO DA PÁGINA FICA ESCOPO-LOCAL ====== */
        .nfe-central-page .btn { cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; border: 1px solid transparent; padding: 10px 20px; border-radius: 8px; }
        .nfe-central-page .btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .nfe-central-page .btn:disabled { cursor: not-allowed; opacity: 0.6; }

        .nfe-central-page .th-sortable { cursor: pointer; transition: color 0.2s; user-select: none; display: flex; align-items: center; }
        .nfe-central-page .th-sortable:hover { color: #ffffffd0; }

        .nfe-central-page .status-badge { padding: 4px 10px; border-radius: 16px; color: #fff; font-weight: 500; font-size: 12px; display: inline-block; text-align: center; min-width: 80px; }

        .nfe-central-page .clickable-chart .recharts-pie-sector path { cursor: pointer; transition: all 0.3s; }
        .nfe-central-page .chart-3d-effect .recharts-pie-sector path { stroke: #fff; stroke-width: 1px; filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.1)) drop-shadow(2px 2px 0px rgba(0,0,0,0.09)) drop-shadow(3px 3px 0px rgba(0,0,0,0.08)) drop-shadow(4px 4px 0px rgba(0,0,0,0.07)) drop-shadow(5px 5px 0px rgba(0,0,0,0.06)); }

        body.light { background-color: #E9ECEF !important; transition: background 0.3s ease; }
        body.light .main-container { background-color: #E9ECEF; }
        body.light .nfe-central-page .btn-green { background-color: var(--gcs-green); color: white; }
        body.light .nfe-central-page .btn-green:hover:not(:disabled) { background-color: #4a9d3a; }
        body.light .nfe-central-page .btn-dark-gray { background-color: #344054; color: white; padding: 8px 16px; font-size: 14px; border: 1px solid #1d2939; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        body.light .nfe-central-page .btn-dark-gray:hover:not(:disabled) { background-color: #1d2939; }
        body.light .nfe-central-page .btn-outline-gray { background-color: #fff; color: var(--gcs-gray-dark); border-color: var(--gcs-border-color); }
        body.light .nfe-central-page .btn-outline-gray:hover:not(:disabled) { border-color: var(--gcs-gray-dark); background-color: var(--gcs-gray-light); }
        body.light .nfe-central-page .btn-outline-blue { background-color: #fff; color: var(--gcs-blue); border-color: var(--gcs-border-color); }
        body.light .nfe-central-page .btn-outline-blue:hover:not(:disabled) { border-color: var(--gcs-blue); background-color: #f1f5fb; }

        body.light .ant-pagination-item-active { background-color: var(--gcs-blue) !important; border-color: var(--gcs-blue) !important; }
        body.light .ant-pagination-item-active a { color: white !important; }

        body.light .nfe-central-page .data-row:hover { background-color: var(--gcs-gray-light) !important; cursor: default; }
        body.light .nfe-central-page .kpi-card, 
        body.light .nfe-central-page .chart-card, 
        body.light .nfe-central-page .main-content-card, 
        body.light .nfe-central-page .content-card, 
        body.light .nfe-central-page .responsive-table-wrapper { background-color: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid var(--gcs-border-color); }
        body.light .nfe-central-page .kpi-card, 
        body.light .nfe-central-page .chart-card, 
        body.light .nfe-central-page .main-content-card, 
        body.light .nfe-central-page .content-card { padding: 1.5rem; }

        body.light .nfe-central-page .responsive-table thead { background-color: var(--gcs-blue); color: #fff; }
        body.light .nfe-central-page .responsive-table tbody tr { border-top: 1px solid var(--gcs-border-color); }
        body.light .nfe-central-page .responsive-table tbody tr:nth-of-type(odd) { background-color: #ffffff; }
        body.light .nfe-central-page .responsive-table tbody tr:nth-of-type(even) { background-color: var(--gcs-gray-light); }
        body.light .nfe-central-page .responsive-table td { color: #333; }
        body.light .nfe-central-page .responsive-table td::before { color: var(--gcs-blue); }

        body.light .recharts-default-tooltip { border-radius: 12px !important; border: 1px solid rgba(255,255,255,.35) !important; background: rgba(255,255,255,.25) !important; backdrop-filter: blur(14px) saturate(140%) !important; -webkit-backdrop-filter: blur(14px) saturate(140%) !important; box-shadow: 0 8px 24px rgba(0,0,0,.12) !important; color: #00314A !important; }
        body.light .recharts-legend-item-text { color: #333 !important; }
        body.light .nfe-central-page .loading-text { color: var(--gcs-blue); }

        .nfe-central-page .theme-toggle-btn { background: none; border: 1px solid transparent; border-radius: 8px; padding: 9px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        body.light .nfe-central-page .theme-toggle-btn { color: var(--gcs-gray-dark); border-color: var(--gcs-border-color); background: #fff; }
        body.light .nfe-central-page .theme-toggle-btn:hover { background: var(--gcs-gray-light); border-color: var(--gcs-gray-dark); }

        body.light .nfe-central-page .filter-popover-content { background-color: white; border: 1px solid var(--gcs-border-color); }
        body.light .nfe-central-page .filter-popover-content h4 { color: var(--gcs-blue); }
        body.light .nfe-central-page .filter-popover-content label { color: #333; }
        body.light .nfe-central-page .filter-popover-content input, 
        body.light .nfe-central-page .filter-popover-content select { background-color: #fff; color: #333; border: 1px solid var(--gcs-border-color); }

        body.dark { background-image: url('/img_fundo_glass.png') !important; background-size: cover !important; background-position: center center !important; background-attachment: fixed !important; transition: background 0.3s ease; }
        body.dark .main-container { background-color: transparent !important; }

        body.dark .nfe-central-page .kpi-card, 
        body.dark .nfe-central-page .chart-card, 
        body.dark .nfe-central-page .main-content-card, 
        body.dark .nfe-central-page .content-card, 
        body.dark .nfe-central-page .responsive-table-wrapper { background: rgba(25, 39, 53, 0.25) !important; backdrop-filter: blur(16px) !important; -webkit-backdrop-filter: blur(16px) !important; border: 1px solid rgba(125, 173, 222, 0.2) !important; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important; }
        body.dark .nfe-central-page .kpi-card, 
        body.dark .nfe-central-page .chart-card, 
        body.dark .nfe-central-page .main-content-card, 
        body.dark .nfe-central-page .content-card { padding: 1.5rem; }

        body.dark .nfe-central-page .page-title, 
        body.dark .nfe-central-page .page-title svg { color: #F1F5F9 !important; }
        body.dark .nfe-central-page .time-ago-text { color: #BFDBFE !important; }
        body.dark .nfe-central-page .filter-applied-text { color: #FECACA !important; }
        body.dark h4, body.dark .nfe-central-page .kpi-title { color: #E2E8F0 !important; }
        body.dark .nfe-central-page .kpi-value-green { color: #86EFAC !important; }
        body.dark .nfe-central-page .kpi-value-orange { color: #FDBA74 !important; }

        body.dark .nfe-central-page .loading-text { color: #93C5FD; }
        body.dark .ant-pagination-total-text { color: #CBD5E1 !important; }

        body.dark .nfe-central-page .btn-green { background-color: var(--gcs-green); color: white; }
        body.dark .nfe-central-page .btn-green:hover:not(:disabled) { background-color: #4a9d3a; }
        body.dark .nfe-central-page .btn-dark-gray { background-color: rgba(30, 41, 59, 0.7); color: #E2E8F0; padding: 8px 16px; font-size: 14px; border: 1px solid rgba(125, 173, 222, 0.3); }
        body.dark .nfe-central-page .btn-dark-gray:hover:not(:disabled) { background-color: rgba(51, 65, 85, 0.8); }
        body.dark .nfe-central-page .btn-outline-gray, 
        body.dark .nfe-central-page .btn-outline-blue { background-color: rgba(25, 39, 53, 0.5) !important; color: #E2E8F0 !important; border-color: rgba(125, 173, 222, 0.3) !important; }
        body.dark .nfe-central-page .btn-outline-gray:hover:not(:disabled), 
        body.dark .nfe-central-page .btn-outline-blue:hover:not(:disabled) { background-color: rgba(40, 60, 80, 0.7) !important; border-color: rgba(125, 173, 222, 0.5) !important; }

        body.dark .nfe-central-page .theme-toggle-btn { background-color: rgba(25,39,53,0.5) !important; color: #E2E8F0 !important; border-color: rgba(125,173,222,0.3) !important; }
        body.dark .nfe-central-page .theme-toggle-btn:hover { background-color: rgba(40,60,80,0.7) !important; border-color: rgba(125,173,222,0.5) !important; }

        body.dark .nfe-central-page .search-input { background-color: rgba(25, 39, 53, 0.5) !important; color: #E2E8F0 !important; border-color: rgba(125, 173, 222, 0.3) !important; }
        body.dark .nfe-central-page .search-input::placeholder { color: #94A3B8; }

        body.dark .nfe-central-page .responsive-table thead { background-color: var(--gcs-blue); color: #fff; }
        body.dark .nfe-central-page .responsive-table tbody tr { background-color: transparent !important; border-top: 1px solid rgba(125, 173, 222, 0.2) !important; }
        body.dark .nfe-central-page .responsive-table tbody tr:nth-of-type(even) { background-color: rgba(25, 39, 53, 0.15) !important; }
        body.dark .nfe-central-page .data-row:hover { background-color: rgba(40, 60, 80, 0.3) !important; }
        body.dark .nfe-central-page .responsive-table td { color: #CBD5E1; }
        body.dark .nfe-central-page .conferido-checkbox-btn { color: #94A3B8; }
        body.dark .nfe-central-page .conferido-checkbox-btn[style*="rgb(40, 167, 69)"] { color: var(--gcs-green) !important; }
        body.dark .nfe-central-page .table-note-number { font-weight: bold; color: #E2E8F0; }
        body.dark .nfe-central-page .table-note-series { color: #94A3B8; }

        body.dark .nfe-central-page .responsive-table tr { border: 1px solid rgba(125, 173, 222, 0.2) !important; }
        body.dark .nfe-central-page .responsive-table td { border-bottom: 1px solid rgba(125, 173, 222, 0.1) !important; }
        body.dark .nfe-central-page .responsive-table td::before { color: #93C5FD; }

        body.dark .ant-pagination-item a, body.dark .ant-pagination-item-link { color: #CBD5E1 !important; }
        body.dark .ant-pagination-item { background-color: transparent !important; border-color: rgba(125, 173, 222, 0.3) !important; }
        body.dark .ant-pagination-item-active { background-color: #3B82F6 !important; border-color: #3B82F6 !important; }
        body.dark .ant-pagination-item-active a { color: white !important; }
        body.dark .ant-pagination-disabled .ant-pagination-item-link { color: #475569 !important; }

        body.dark .nfe-central-page .filter-popover-content { background: rgba(25, 39, 53, 0.98) !important; backdrop-filter: blur(8px) !important; -webkit-backdrop-filter: blur(8px) !important; border: 1px solid rgba(125, 173, 222, 0.3) !important; box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important; }
        body.dark .nfe-central-page .filter-popover-content h4 { color: #F1F5F9 !important; }
        body.dark .nfe-central-page .filter-popover-content label { color: #CBD5E1; }
        body.dark .nfe-central-page .filter-popover-content input[type="date"], 
        body.dark .nfe-central-page .filter-popover-content select { background-color: rgba(25, 39, 53, 0.5) !important; color: #E2E8F0 !important; border-color: rgba(125, 173, 222, 0.3) !important; }
        body.dark .nfe-central-page .filter-popover-content input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); }

        body.dark .recharts-default-tooltip { border: 1px solid rgba(125,173,222,.28) !important; background: rgba(25,39,53,.50) !important; color: #E2E8F0 !important; border-radius: 12px !important; backdrop-filter: blur(14px) saturate(140%) !important; -webkit-backdrop-filter: blur(14px) saturate(140%) !important; }
        body.dark .recharts-legend-item-text { color: #E2E8F0 !important; }

        .ant-tooltip-inner { background-color: var(--gcs-blue) !important; color: white !important; border-radius: 6px !important; }
        .ant-tooltip-arrow::before, .ant-tooltip-arrow::after { background: var(--gcs-blue) !important; }
        body.dark .ant-tooltip-inner { background: rgba(25,39,53,0.9) !important; color: #E2E8F0 !important; border: 1px solid rgba(125, 173, 222, 0.2) !important; }
        body.dark .ant-tooltip-arrow::before, body.dark .ant-tooltip-arrow::after { background: rgba(25,39,53,0.9) !important; }

        @media (max-width: 1200px) {
          .nfe-central-page .header-wrapper { flex-direction: column; align-items: center; gap: 1.5rem; }
          .nfe-central-page .main-content-card, .nfe-central-page .kpi-card { width: 100%; }
        }
        @media (max-width: 768px) {
          .nfe-central-page .main-container { padding: 1rem; }
          .nfe-central-page .page-title { font-size: 1.25rem; text-align: center; }
          .nfe-central-page .controls-group { flex-direction: column; align-items: stretch; width: 100%; }
          .nfe-central-page .search-input { width: 100%; }
          .nfe-central-page .header-wrapper { gap: 1rem; }
          body.light .nfe-central-page .kpi-card, 
          body.light .nfe-central-page .chart-card, 
          body.light .nfe-central-page .main-content-card, 
          body.dark .nfe-central-page .kpi-card, 
          body.dark .nfe-central-page .chart-card, 
          body.dark .nfe-central-page .main-content-card { padding: 1rem; }

          .nfe-central-page .responsive-table thead { display: none; }
          .nfe-central-page .responsive-table tbody, 
          .nfe-central-page .responsive-table tr, 
          .nfe-central-page .responsive-table td { display: block; width: 100%; }
          .nfe-central-page .responsive-table tr { margin-bottom: 1rem; border-radius: 8px; padding: 0.5rem 1rem; }
          body.light .nfe-central-page .responsive-table tr { border: 1px solid var(--gcs-border-color); }
          .nfe-central-page .responsive-table td { display: flex; justify-content: space-between; align-items: center; padding: 0.8rem 0; }
          body.light .nfe-central-page .responsive-table td { border-bottom: 1px solid var(--gcs-gray-medium); }
          .nfe-central-page .responsive-table tr td:last-child { border-bottom: none; }
          .nfe-central-page .responsive-table td::before { content: attr(data-label); font-weight: bold; margin-right: 1rem; }
          body.light .nfe-central-page .responsive-table td::before { color: var(--gcs-blue); }
          body.dark .nfe-central-page .responsive-table td::before { color: #93C5FD; }
          .nfe-central-page .td-status, .nfe-central-page .td-actions { justify-content: flex-start; }
          .nfe-central-page .td-actions .btn { width: 100%; }
        }
      `}</style>

      <div className="nfe-central-page">
        <div className="main-container" style={{ padding: "2rem", minHeight: "100vh" }}>
          <div
            className="header-wrapper"
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: "1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <div
              className="chart-card clickable-chart"
              style={{
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                minWidth: "280px",
                paddingTop: "1rem",
                paddingBottom: "1rem",
              }}
            >
              <h4
                style={{
                  margin: 0,
                  color: "var(--gcs-gray-dark)",
                  fontWeight: 500,
                  fontSize: "1rem",
                }}
              >
                Gráfico por Status
              </h4>
              <div style={{ width: 280, height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart key={chartKey}>
                    <Pie
                      data={dadosGraficoStatus}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={80}
                      cornerRadius={8}
                      stroke={theme === "dark" ? "rgba(25,39,53,0.5)" : "rgba(255,255,255,.35)"}
                      strokeWidth={1}
                      paddingAngle={3}
                      activeIndex={activeIndex as any}
                      activeShape={renderActiveShape}
                      onMouseEnter={onPieEnter}
                      onMouseLeave={onPieLeave}
                      onClick={(data) => handleChartClick((data as any).payload.payload)}
                    >
                      {dadosGraficoStatus.map((entry) => {
                        const pieFill =
                          coresStatusDonut[entry.name] ||
                          coresStatus[entry.name] ||
                          "#ccc";
                        return <Cell key={entry.name} fill={pieFill} />;
                      })}
                    </Pie>
                    <Legend
                      layout="horizontal"
                      align="center"
                      verticalAlign="bottom"
                      iconSize={10}
                      wrapperStyle={{ fontSize: "12px", marginTop: "10px" }}
                      formatter={renderLegendText as any}
                    />
                    <RechartsTooltip
                      contentStyle={glassTooltipStyle}
                      labelStyle={tooltipLabelStyle}
                      itemStyle={tooltipItemStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div
              className="main-content-card"
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: "1.5rem",
                paddingTop: "0.5rem",
                paddingBottom: "0.5rem",
              }}
            >
              <h2
                className="page-title"
                style={{
                  margin: 0,
                  fontSize: "2rem",
                  fontWeight: "bold",
                  color: "var(--gcs-blue)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <FileText size={32} />
                <span>Central de Notas</span>
              </h2>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <input
                    type="text"
                    placeholder="Buscar por fornecedor, nota ou chave"
                    value={buscaRaw}
                    onChange={(e) => setBuscaRaw(e.target.value)}
                    className="search-input"
                    style={{
                      padding: "12px 16px",
                      fontSize: "1rem",
                      borderRadius: "8px",
                      border: "1px solid var(--gcs-border-color)",
                      width: "350px",
                    }}
                  />
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}
                >
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <button
                      onClick={fetchNotas}
                      title="Atualizar Notas Fiscais"
                      className="btn btn-outline-gray"
                      style={{ padding: "9px" }}
                    >
                      <RefreshCcw size={20} />
                    </button>

                    <FilterPopover
                      allFiliais={allFiliais}
                      allTipos={allTipos}
                      allCompradores={allCompradores}
                      allStatusLancamento={allStatusLancamento}
                      onApplyFilters={handleApplyAdvancedFilters}
                      initialFilters={advancedFilters}
                    />

                    <button
                      onClick={handleExportXLSX}
                      title="Exportar para Excel"
                      className="btn btn-outline-blue"
                      style={{ padding: "9px" }}
                    >
                      <FileDown size={20} />
                    </button>

                    <button
                      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                      className="theme-toggle-btn"
                      title={theme === "light" ? "Mudar para tema escuro" : "Mudar para tema claro"}
                    >
                      {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
                    </button>
                  </div>

                  <div
                    style={{
                      height: "auto",
                      marginTop: "0.25rem",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: "0.25rem",
                    }}
                  >
                    {timeAgo && !loading && (
                      <span
                        className="time-ago-text"
                        style={{
                          color: "var(--gcs-gray-dark)",
                          fontSize: "12px",
                          fontStyle: "italic",
                        }}
                      >
                        Atualizado {timeAgo}
                      </span>
                    )}
                    {areFiltersApplied && !loading && (
                      <span
                        className="filter-applied-text"
                        style={{ color: "#dc3545", fontSize: "12px", fontWeight: "bold" }}
                      >
                        Existem filtros aplicados
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="kpi-card"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-around",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <h4
                  className="kpi-title"
                  style={{
                    color: "var(--gcs-gray-dark)",
                    margin: 0,
                    fontWeight: 500,
                    fontSize: "1rem",
                    marginBottom: "0.25rem",
                  }}
                >
                  Notas Hoje
                </h4>
                <p
                  className="kpi-value-green"
                  style={{
                    fontSize: "2.2rem",
                    margin: 0,
                    color: "var(--gcs-green)",
                    fontWeight: "bold",
                    lineHeight: 1.2,
                  }}
                >
                  {totalNotasHoje}
                </p>
              </div>

              <hr
                style={{
                  width: "80%",
                  border: "none",
                  borderTop: "1px solid var(--gcs-border-color)",
                  margin: "0.5rem 0",
                }}
              />

              <div style={{ textAlign: "center" }}>
                <h4
                  className="kpi-title"
                  style={{
                    color: "var(--gcs-gray-dark)",
                    margin: 0,
                    fontWeight: 500,
                    fontSize: "1rem",
                    marginBottom: "0.25rem",
                  }}
                >
                  Pendentes
                </h4>
                <p
                  className="kpi-value-orange"
                  style={{
                    fontSize: "2.2rem",
                    margin: 0,
                    color: "var(--gcs-orange)",
                    fontWeight: "bold",
                    lineHeight: 1.2,
                  }}
                >
                  {totalPendentes}
                </p>
              </div>
            </div>
          </div>

          <div
            className="tabs-card"
            style={{
              marginBottom: "1.5rem",
              padding: 0,
              background: "transparent",
              border: "none",
              boxShadow: "none",
            }}
          >
            <PriorityRibbonTabs
              filtroStatus={filtroStatus}
              statusCounts={statusCounts as any}
              onChange={(key) => {
                if (key === "outras") return;
                handleFiltroStatusChange(key);
              }}
            />
          </div>

          {loading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "2rem",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  border: "4px solid var(--gcs-gray-medium)",
                  borderTop: "4px solid var(--gcs-blue)",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              <div
                className="loading-text"
                style={{
                  marginTop: "1rem",
                  fontWeight: "bold",
                  color: "var(--gcs-blue)",
                }}
              >
                Carregando notas...
              </div>
            </div>
          ) : notasPaginadas.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "var(--gcs-gray-dark)",
                marginTop: "4rem",
                fontSize: "1.1rem",
              }}
            >
              Nenhuma nota encontrada para os filtros aplicados.
            </div>
          ) : (
            <>
              <div
                className="responsive-table-wrapper"
                style={{
                  overflowX: "auto",
                  border: "1px solid var(--gcs-border-color)",
                  borderRadius: "12px",
                  background: "#fff",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                }}
              >
                <table
                  className="responsive-table"
                  style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}
                >
                  <thead
                    style={{
                      backgroundColor: "var(--gcs-blue)",
                      color: "#fff",
                      textAlign: "left",
                    }}
                  >
                    <tr>
                      <th style={{ padding: "16px 12px", textAlign: "center", borderTopLeftRadius: 12 }}>
                        <div className="th-sortable" style={{ justifyContent: "center" }}>
                          <CheckSquare size={16} style={{ marginRight: 8 }} /> Conferido
                        </div>
                      </th>
                      <th style={{ padding: "16px 12px", textAlign: "center" }}>
                        <div className="th-sortable" style={{ justifyContent: "center" }}>
                          <BadgeCheck size={16} style={{ marginRight: 8 }} /> Status da Nota
                        </div>
                      </th>
                      <th style={{ padding: "16px 12px" }}>
                        <div onClick={() => requestSort("filial")} className="th-sortable">
                          <Building2 size={16} style={{ marginRight: 8 }} /> Filial{" "}
                          <ChevronsUpDown size={14} style={{ marginLeft: "4px", color: "#ffffff80" }} />
                        </div>
                      </th>
                      <th style={{ padding: "16px 12px" }}>
                        <div onClick={() => requestSort("nf")} className="th-sortable">
                          <Hash size={16} style={{ marginRight: 8 }} /> Nota / Série{" "}
                          <ChevronsUpDown size={14} style={{ marginLeft: "4px", color: "#ffffff80" }} />
                        </div>
                      </th>
                      <th style={{ padding: "16px 12px", textAlign: "center" }}>
                        <div
                          onClick={() => requestSort("tipo_nf")}
                          className="th-sortable"
                          style={{ justifyContent: "center" }}
                        >
                          <FileText size={16} style={{ marginRight: 8 }} /> Tipo{" "}
                          <ChevronsUpDown size={14} style={{ marginLeft: "4px", color: "#ffffff80" }} />
                        </div>
                      </th>
                      <th style={{ padding: "16px 12px" }}>
                        <div
                          onClick={() => requestSort("nome_fornecedor")}
                          className="th-sortable"
                        >
                          <Truck size={16} style={{ marginRight: 8 }} /> Fornecedor{" "}
                          <ChevronsUpDown size={14} style={{ marginLeft: "4px", color: "#ffffff80" }} />
                        </div>
                      </th>
                      {/* Coluna de datas com tooltip */}
                      <th style={{ padding: "16px 12px", textAlign: "center" }}>
                        <div className="th-sortable" style={{ justifyContent: "center" }}>
                          <Calendar size={16} style={{ marginRight: 8 }} /> Datas
                        </div>
                      </th>
                      <th style={{ padding: "16px 12px", textAlign: "center" }}>
                        <div className="th-sortable" style={{ justifyContent: "center" }}>
                          <TrendingUp size={16} style={{ marginRight: 8 }} /> Status Setor
                        </div>
                      </th>
                      <th style={{ padding: "16px 12px" }}>
                        <div onClick={() => requestSort("observacao")} className="th-sortable">
                          <MessageSquare size={16} style={{ marginRight: 8 }} /> Observação{" "}
                          <ChevronsUpDown size={14} style={{ marginLeft: "4px", color: "#ffffff80" }} />
                        </div>
                      </th>
                      <th style={{ padding: "16px 12px" }}>
                        <div onClick={() => requestSort("comprador")} className="th-sortable">
                          <User size={16} style={{ marginRight: 8 }} /> Responsável{" "}
                          <ChevronsUpDown size={14} style={{ marginLeft: "4px", color: "#ffffff80" }} />
                        </div>
                      </th>
                      <th style={{ padding: "16px 12px", textAlign: "center", borderTopRightRadius: 12 }}>
                        <div className="th-sortable" style={{ justifyContent: "center" }}>
                          <Settings2 size={16} style={{ marginRight: 8 }} /> Ações
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {notasPaginadas.map((nota) => {
                      const statusLancamento = nota.status_lancamento;
                      const statusNotaTexto = statusLancamento || "N/A";
                      let statusNotaCor = "var(--gcs-gray-dark)";
                      if (statusLancamento === "Concluído") statusNotaCor = "var(--gcs-green)";
                      else if (statusLancamento === "Pendente") statusNotaCor = "var(--gcs-orange)";

                      const dateTooltipContent = (
                        <div style={{ fontSize: "12px", textAlign: "left" }}>
                          <div style={{ marginBottom: 4 }}>
                            <strong>Recebimento:</strong> {nota.dt_recebimento} {nota.hr_Recebimento}
                          </div>
                          <div>
                            <strong>Lançamento:</strong> {formatProtheusDateTime(nota.dt_lcto_protheus)}
                          </div>
                        </div>
                      );

                      return (
                        <tr key={nota.chave} className="data-row">
                          <td
                            data-label="Conferido"
                            className="td-conferido"
                            style={{ padding: "14px 12px", verticalAlign: "middle", textAlign: "center" }}
                          >
                            <ConferidoCheckbox
                              conferido={nota.conferido}
                              onClick={() => handleCheckboxClick(nota)}
                            />
                          </td>
                          <td
                            data-label="Status da Nota"
                            className="td-status"
                            style={{ padding: "14px 12px", verticalAlign: "middle", textAlign: "center" }}
                          >
                            <span className="status-badge" style={{ backgroundColor: statusNotaCor }}>
                              {statusNotaTexto}
                            </span>
                          </td>
                          <td data-label="Filial" style={{ padding: "14px 12px", verticalAlign: "middle" }}>
                            {nota.filial}
                          </td>
                          <td
                            data-label="Nota / Série"
                            style={{
                              padding: "14px 12px",
                              verticalAlign: "middle",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <span className="table-note-number">{nota.nf}</span>
                            <span className="table-note-series"> / {nota.serie}</span>
                          </td>
                          <td
                            data-label="Tipo"
                            style={{ padding: "14px 12px", verticalAlign: "middle", textAlign: "center" }}
                          >
                            {nota.tipo_nf ? (
                              <span
                                className="status-badge"
                                style={{
                                  backgroundColor:
                                    nota.tipo_nf.toUpperCase() === "CTE"
                                      ? "var(--gcs-gray-soft)"
                                      : "var(--gcs-gray-dark)",
                                }}
                              >
                                {nota.tipo_nf.toUpperCase()}
                              </span>
                            ) : (
                              <span style={{ color: "var(--gcs-gray-dark)" }}>—</span>
                            )}
                          </td>
                          <td
                            data-label="Fornecedor"
                            style={{ padding: "14px 12px", verticalAlign: "middle", fontSize: "13px" }}
                          >
                            {nota.nome_fornecedor}
                          </td>

                          <td
                            data-label="Datas"
                            style={{ padding: "14px 12px", verticalAlign: "middle", textAlign: "center" }}
                          >
                            <Tooltip title={dateTooltipContent} placement="top">
                              <span style={{ cursor: "help" }}>
                                <Calendar size={18} />
                              </span>
                            </Tooltip>
                          </td>

                          <td
                            data-label="Status Setor"
                            style={{ padding: "14px 12px", verticalAlign: "middle", textAlign: "center" }}
                          >
                            <StatusSetorDots
                              statusUnidade={nota.status_envio_unidade}
                              statusCompras={nota.status_compras}
                              statusFiscal={nota.status_fiscal}
                            />
                          </td>
                          <td
                            data-label="Observação"
                            style={{
                              padding: "14px 12px",
                              verticalAlign: "middle",
                              fontSize: "13px",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}
                          >
                            {nota.observacao ? (
                              nota.observacao
                            ) : (
                              <span style={{ color: "var(--gcs-gray-dark)" }}>—</span>
                            )}
                          </td>
                          <td
                            data-label="Responsável"
                            style={{ padding: "14px 12px", verticalAlign: "middle", fontSize: "13px" }}
                          >
                            {nota.comprador ? (
                              nota.comprador
                            ) : (
                              <span style={{ color: "var(--gcs-gray-dark)" }} title="Sem responsável">
                                —
                              </span>
                            )}
                          </td>
                          <td
                            data-label="Ações"
                            className="td-actions"
                            style={{ padding: "14px 12px", verticalAlign: "middle", textAlign: "center" }}
                          >
                            <button
                              onClick={() => abrirModalDetalhes(nota)}
                              title="Ver Detalhes da Nota"
                              className="btn btn-dark-gray"
                            >
                              <Search size={14} /> Analisar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  marginTop: "2rem",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Pagination
                  current={paginaAtual}
                  total={totalServidor}
                  pageSize={pageSize}
                  onChange={(page) => setPaginaAtual(page)}
                  showSizeChanger={false}
                  showTotal={(total, range) => `${range[0]}-${range[1]} de ${total} notas`}
                />
              </div>
            </>
          )}
        </div>

        <ModalDetalhes
          chave={notaSelecionada?.chave || ""}
          visivel={modalAberto}
          onClose={() => setModalAberto(false)}
          nomeFornecedor={notaSelecionada?.nome_fornecedor}
          statusNF={notaSelecionada?.status_nf || ""}
          onActionSuccess={fetchNotas}
          statusCompras={notaSelecionada?.status_compras}
          observacao={notaSelecionada?.observacao}
        />

        <NotificationModal
          visible={notification.visible}
          type={notification.type}
          message={notification.message}
          onClose={handleCloseNotification}
        />

        <ConfirmationModal
          isOpen={isConfirmConferenciaOpen}
          onClose={handleCloseConferencia}
          onConfirm={handleConfirmConferencia}
          title="Confirmar Conferência"
          message={
            newConferenciaStatus === "S"
              ? "Com essa ação você está confirmando que realizou a conferência dessa nota no Protheus. Deseja continuar?"
              : "Você tem certeza que deseja desmarcar a conferência desta nota?"
          }
          confirmText={
            isSubmittingConferencia
              ? "Processando..."
              : newConferenciaStatus === "S"
              ? "Sim, Continuar"
              : "Sim, Desmarcar"
          }
          confirmColor={newConferenciaStatus === "S" ? "#28a745" : "#dc3545"}
          showCancelButton={!isSubmittingConferencia}
          icon={
            newConferenciaStatus === "S" ? (
              <CheckSquare size={40} color="#28a745" />
            ) : (
              <AlertTriangle size={40} color="#f7941d" />
            )
          }
        />
      </div>
    </>
  );
}
