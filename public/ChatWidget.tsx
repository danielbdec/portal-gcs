"use client";
import { marked } from "marked";
import { useState, useEffect, useRef } from "react";

export default function ChatWidget() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ sender: string; text: string; timestamp: string }[]>([]);
  const [input, setInput] = useState("");
  const [aguardandoResposta, setAguardandoResposta] = useState(false);
  const [notificacaoPendente, setNotificacaoPendente] = useState(false);
  const [toast, setToast] = useState("");
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);

  const fimDasMensagensRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  useEffect(() => {
    if (fimDasMensagensRef.current) {
      fimDasMensagensRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, aguardandoResposta]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setCarregandoHistorico(true);
      fetch("/api/assistente-historico", {
        method: "POST",
      })
        .then((res) => res.json())
        .then((dados) => {
          console.log("🧠 Histórico carregado:", dados);
          setMessages(dados);
        })
        .finally(() => {
          setCarregandoHistorico(false);
        });
    }
  }, [open]);

  const enviarMensagem = async () => {
    if (!input.trim()) return;

    const novaMsg = {
      sender: "user",
      text: input,
      timestamp: new Date().toISOString(),
    };
    setMessages([...messages, novaMsg]);
    setInput("");
    setAguardandoResposta(true);

    try {
      const resposta = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      const text = await resposta.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch {
        data = { resposta: text };
      }

      const mensagem = data.resposta?.trim() || "Desculpe, não entendi.";
      const respostaMsg = {
        sender: "bot",
        text: mensagem,
        timestamp: new Date().toISOString(),
      };

      setMessages((msgs) => [...msgs, respostaMsg]);

      setTimeout(() => {
        if (!open) {
          setNotificacaoPendente(true);
          setToast("Nova resposta recebida");
          setTimeout(() => setToast(""), 3000);
        }
      }, 50);
    } catch (err) {
      setMessages((msgs) => [
        ...msgs,
        {
          sender: "bot",
          text: "Desculpe, houve um erro ao se comunicar com o servidor.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setAguardandoResposta(false);
    }
  };

  return (
  
<div style={{ position: "relative", zIndex: 9999 }}>
  <style>{`
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .chat-message-enter {
      animation: fadeInUp 0.3s ease forwards;
    }

    @keyframes blink {
      0%, 80%, 100% { opacity: 0; transform: scale(0.9); }
      40% { opacity: 1; transform: scale(1.2); }
    }
    .dot {
      width: 6px;
      height: 6px;
      background-color: #666;
      border-radius: 50%;
      display: inline-block;
      animation: blink 1.4s infinite both;
    }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }

    .chat-button:hover {
      transform: scale(1.1);
      box-shadow: 0 0 0 3px rgba(35,67,37,0.2);
    }

    @media (max-width: 400px) {
      .chat-box {
        width: 95vw !important;
        height: 85vh !important;
        right: 2.5vw !important;
        bottom: 90px !important;
      }
    }
  `}</style>

  <style>{`
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .chat-message-enter {
      animation: fadeInUp 0.3s ease forwards;
    }
  `}</style>      <style>{`        @keyframes fadeInUp {          from { opacity: 0; transform: translateY(10px); }          to { opacity: 1; transform: translateY(0); }        }        .chat-message-enter {          animation: fadeInUp 0.3s ease forwards;        }      `}</style>
      <style>
        {`
          @keyframes blink {
            0%, 80%, 100% { opacity: 0; transform: scale(0.9); }
            40% { opacity: 1; transform: scale(1.2); }
          }
          .dot {
            width: 6px;
            height: 6px;
            background-color: #666;
            border-radius: 50%;
            display: inline-block;
            animation: blink 1.4s infinite both;
          }
          .dot:nth-child(2) { animation-delay: 0.2s; }
          .dot:nth-child(3) { animation-delay: 0.4s; }

          .chat-button:hover {
            transform: scale(1.1);
            box-shadow: 0 0 0 3px rgba(35,67,37,0.2);
          }

          @media (max-width: 400px) {
            .chat-box {
              width: 95vw !important;
              height: 85vh !important;
              right: 2.5vw !important;
              bottom: 90px !important;
            }
          }
        `}
      </style>

      <div>
        <div style={{ position: "relative" }}>
          <button
            onClick={() => {
              setOpen(!open);
              setNotificacaoPendente(false);
            }}
            className="chat-button"
            style={{
              position: "fixed",
              bottom: 20,
              right: 20,
              borderRadius: "50%",
              width: 60,
              height: 60,
              backgroundColor: "#4E744E",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
              color: "white",
              border: "none",
              cursor: "pointer",
              zIndex: 9999,
              transition: "transform 0.2s ease-in-out",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-message-square-more-icon lucide-message-square-more"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <path d="M8 10h.01" />
              <path d="M12 10h.01" />
              <path d="M16 10h.01" />
            </svg>
          </button>

          {notificacaoPendente && (
            <span
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                width: 12,
                height: 12,
                backgroundColor: "red",
                borderRadius: "50%",
                border: "2px solid white",
                zIndex: 10000,
              }}
            />
          )}
        </div>

        {open && (
          <div
            className="chat-box"
            style={{
              position: "fixed",
              bottom: 90,
              right: 20,
              width: 320,
              height: 440,
              backgroundColor: "#fff",
              borderRadius: 14,
              boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              zIndex: 9999,
              fontFamily: "'Segoe UI', Roboto, sans-serif",
            }}
          >
            <div style={{ padding: "10px", textAlign: "center", background: "linear-gradient(to right, #4E744E, #6EB85D)", borderBottom: "1px solid #eee" }}>
<img src="/logo.png" alt="Logo" style={{ height: 28 }} />
<div style={{ fontSize: 10, color: "#eefae5", marginTop: 4 }}>🟢 Assistente online</div>
</div>
<div style={{ flex: 1, padding: 12, overflowY: "auto" }}>
              {carregandoHistorico ? (
                <div style={{ textAlign: "center", marginTop: 20, color: "#666", fontSize: 14 }}>
                  Carregando histórico...
                </div>
              ) : (
                <>
  <style>{`
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .chat-message-enter {
      animation: fadeInUp 0.3s ease forwards;
    }
  `}</style>      <style>{`        @keyframes fadeInUp {          from { opacity: 0; transform: translateY(10px); }          to { opacity: 1; transform: translateY(0); }        }        .chat-message-enter {          animation: fadeInUp 0.3s ease forwards;        }      `}</style>
                  {messages.map((msg, i) => (
<>
  <div style={{ width: "100%", textAlign: msg.sender === "user" ? "right" : "left", fontSize: 11, fontWeight: "bold", color: msg.sender === "bot" ? "#3c3c3c" : "#4E744E", margin: "4px 0" }}>
    {msg.sender === "bot" ? "Assistente:" : "Você:"}
  </div>
                    <div key={i} className="chat-message-enter" style={{ display: "flex", justifyContent: msg.sender === "user" ? "flex-end" : "flex-start", gap: 8, marginBottom: 10, alignItems: "flex-start" }}>
                      {msg.sender === "bot" && (
  <img src="/bot-avatar.png" alt="Bot" style={{ width: 28, height: 28, borderRadius: "50%", marginTop: 4 }} />
)}

<div
                        style={{
                          display: "inline-block",
                          backgroundColor: msg.sender === "user" ? "#DCF8C6" : "#F1F1F1",
                          padding: "10px 12px",
                          borderRadius: 10,
                          maxWidth: "80%",
                          fontSize: 14,
                        }}
                      >
                        {msg.sender === "bot" ? (
  <div style={{ whiteSpace: "pre-line" }} dangerouslySetInnerHTML={{ __html: marked.parse(msg.text || "") }} />
) : (
  <div>{msg.text}</div>
)}
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#999",
                            marginTop: 4,
                            textAlign: "right",
                          }}
                        >
                          {new Date(msg.timestamp).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  </>
))}
                  {aguardandoResposta && (
                    <div style={{ textAlign: "left", marginBottom: 5 }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          backgroundColor: "#F1F1F1",
                          padding: 10,
                          borderRadius: 10,
                          maxWidth: "80%",
                          fontStyle: "italic",
                          opacity: 0.8,
                        }}
                      >
                        <span className="dot" />
                        <span className="dot" />
                        <span className="dot" />
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={fimDasMensagensRef} />
            </div>
            <div style={{ display: "flex", borderTop: "1px solid #eee", padding: 10 }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    enviarMensagem();
                  }
                }}
                placeholder="Digite sua mensagem..."
                rows={1}
                style={{
                  flex: 1,
                  minHeight: 38,
                  maxHeight: 120,
                  border: "1px solid #ccc",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 14,
                  lineHeight: "20px",
                  resize: "none",
                  overflow: "hidden",
                }}
              ></textarea>
              <button
                onClick={enviarMensagem}
                style={{
                  background: "#4E744E",
                  color: "white",
                  border: "none",
                  padding: "0 16px",
                  marginLeft: 8,
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                ➤
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 100,
            right: 100,
            backgroundColor: "#333",
            color: "white",
            padding: "10px 16px",
            borderRadius: 8,
            fontSize: 14,
            opacity: 0.95,
            zIndex: 10000,
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          {toast}
        </div>
      )}
  </div>
  );
}
