import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { HttpAgent } from "@icp-sdk/core/agent";
import {
  BookOpen,
  CheckCircle,
  ChevronRight,
  CreditCard,
  Download,
  FileText,
  HelpCircle,
  ImageIcon,
  Loader2,
  MessageCircle,
  Phone,
  Send,
  Settings,
  Star,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { loadConfig } from "./config";
import { StorageClient } from "./utils/StorageClient";

// ─── Types ────────────────────────────────────────────────────────────────

type ChatStep =
  | "greeting"
  | "choose"
  | "payment_info"
  | "awaiting_upload"
  | "uploading"
  | "pdf_ready"
  | "question_input"
  | "question_answered";

type MessageRole = "bot" | "user";

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  isTyping?: boolean;
  timestamp: Date;
  attachment?: { type: "image"; url: string; name: string };
}

interface AdminConfig {
  phone: string;
  kbzPay: string;
  pdfUrl: string;
  screenshots: { name: string; url: string; uploadedAt: string }[];
}

// ─── Constants ────────────────────────────────────────────────────────────

const ADMIN_STORAGE_KEY = "pdf_shop_admin_config";

const DEFAULT_ADMIN: AdminConfig = {
  phone: "09123456789",
  kbzPay: "09123456789",
  pdfUrl: "",
  screenshots: [],
};

function loadAdminConfig(): AdminConfig {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) return { ...DEFAULT_ADMIN, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_ADMIN };
}

function saveAdminConfig(cfg: AdminConfig) {
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(cfg));
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Featured PDF products ────────────────────────────────────────────────

const FEATURED_PDFS = [
  {
    id: 1,
    title: "Digital Marketing Mastery",
    subtitle: "Complete 2025 guide",
    price: "5,000 MMK",
    pages: 120,
    color: "from-teal-100 to-teal-200",
    icon: "📈",
  },
  {
    id: 2,
    title: "TikTok Content Blueprint",
    subtitle: "Grow 0 to 100K followers",
    price: "3,500 MMK",
    pages: 85,
    color: "from-purple-100 to-purple-200",
    icon: "🎯",
  },
  {
    id: 3,
    title: "Freelance Success Pack",
    subtitle: "Templates + strategies",
    price: "7,000 MMK",
    pages: 200,
    color: "from-amber-100 to-amber-200",
    icon: "💼",
  },
  {
    id: 4,
    title: "Social Media Schedule",
    subtitle: "30-day content calendar",
    price: "2,000 MMK",
    pages: 40,
    color: "from-rose-100 to-rose-200",
    icon: "📅",
  },
];

// ─── StorageClient factory ────────────────────────────────────────────────

async function getStorageClient(): Promise<StorageClient> {
  const config = await loadConfig();
  const agent = new HttpAgent({ host: config.backend_host });
  if (config.backend_host?.includes("localhost")) {
    await agent.fetchRootKey().catch(() => {});
  }
  return new StorageClient(
    config.bucket_name,
    config.storage_gateway_url,
    config.backend_canister_id,
    config.project_id,
    agent,
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  );
}

// ─── Bot avatar ───────────────────────────────────────────────────────────

function BotAvatar() {
  return (
    <div
      className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold"
      style={{
        background: "linear-gradient(135deg, #2E6F7C 0%, #245E69 100%)",
      }}
    >
      <FileText className="w-4 h-4" />
    </div>
  );
}

// ─── Chat Message ─────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isBot = msg.role === "bot";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={`flex items-end gap-2 ${isBot ? "justify-start" : "justify-end"}`}
    >
      {isBot && <BotAvatar />}
      <div
        className={`rounded-2xl px-4 py-3 max-w-[80%] text-sm leading-relaxed ${
          isBot
            ? "bg-slate-100 text-slate-800 rounded-bl-sm"
            : "text-white rounded-br-sm"
        }`}
        style={
          isBot
            ? {}
            : {
                background: "linear-gradient(135deg, #2E6F7C 0%, #245E69 100%)",
              }
        }
      >
        {msg.isTyping ? (
          <TypingIndicator />
        ) : (
          <>
            <p className="whitespace-pre-wrap">{msg.content}</p>
            {msg.attachment && (
              <div className="mt-2 rounded-lg overflow-hidden border border-white/20">
                <img
                  src={msg.attachment.url}
                  alt={msg.attachment.name}
                  className="max-w-full max-h-48 object-cover"
                />
                <p className="text-xs mt-1 opacity-70">{msg.attachment.name}</p>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Pill Button ──────────────────────────────────────────────────────────

function PillButton({
  children,
  onClick,
  icon,
  dataOcid,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: React.ReactNode;
  dataOcid?: string;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      data-ocid={dataOcid}
      className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-teal-500 text-teal-700 bg-white font-medium text-sm hover:bg-teal-50 transition-colors shadow-sm"
    >
      {icon}
      {children}
    </motion.button>
  );
}

// ─── Payment Info Card ────────────────────────────────────────────────────

function PaymentInfoCard({ phone, kbz }: { phone: string; kbz: string }) {
  return (
    <div className="mt-2 rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-3">
      <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
        Payment Details
      </p>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
          <Phone className="w-4 h-4 text-teal-600" />
        </div>
        <div>
          <p className="text-xs text-slate-500">Phone Number</p>
          <p className="font-bold text-slate-800 font-mono">{phone}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
          <CreditCard className="w-4 h-4 text-teal-600" />
        </div>
        <div>
          <p className="text-xs text-slate-500">KBZ Pay Number</p>
          <p className="font-bold text-slate-800 font-mono">{kbz}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Upload Zone ──────────────────────────────────────────────────────────

function UploadZone({
  onFile,
  uploading,
}: {
  onFile: (file: File) => void;
  uploading: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith("image/")) {
        onFile(file);
      } else {
        toast.error("Please upload a JPG or PNG image.");
      }
    },
    [onFile],
  );

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && !uploading) {
        inputRef.current?.click();
      }
    },
    [uploading],
  );

  return (
    <button
      type="button"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      onKeyDown={handleKeyDown}
      data-ocid="chat.dropzone"
      className={`mt-3 rounded-xl border-2 border-dashed cursor-pointer transition-all p-6 flex flex-col items-center gap-2 text-center ${
        dragging
          ? "border-teal-500 bg-teal-50"
          : "border-slate-300 bg-slate-50 hover:border-teal-400 hover:bg-teal-50"
      } ${uploading ? "pointer-events-none opacity-60" : ""}`}
    >
      {uploading ? (
        <>
          <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
          <p className="text-sm text-slate-600 font-medium">
            Uploading screenshot…
          </p>
        </>
      ) : (
        <>
          <Upload className="w-8 h-8 text-slate-400" />
          <p className="text-sm font-medium text-slate-700">
            Drag &amp; Drop or Click to Upload
          </p>
          <p className="text-xs text-slate-400">
            Payment Screenshot (JPG, PNG)
          </p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/*"
        className="hidden"
        onChange={handleInput}
        data-ocid="chat.upload_button"
      />
    </button>
  );
}

// ─── PDF Download Card ────────────────────────────────────────────────────

function PDFDownloadCard({ pdfUrl }: { pdfUrl: string }) {
  return (
    <div className="mt-2 rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-green-50 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">
            Your PDF is ready!
          </p>
          <p className="text-xs text-slate-500">Thank you for your purchase</p>
        </div>
      </div>
      {pdfUrl ? (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
          data-ocid="chat.primary_button"
          className="block"
        >
          <Button
            className="w-full text-white"
            style={{
              background: "linear-gradient(135deg, #2E6F7C 0%, #245E69 100%)",
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </a>
      ) : (
        <Button
          disabled
          className="w-full"
          data-ocid="chat.primary_button"
          style={{
            background: "linear-gradient(135deg, #2E6F7C 0%, #245E69 100%)",
            color: "white",
            opacity: 0.7,
          }}
        >
          <Download className="w-4 h-4 mr-2" />
          PDF Will Be Sent to You Shortly
        </Button>
      )}
    </div>
  );
}

// ─── Main Chat Panel ──────────────────────────────────────────────────────

function ChatPanel({ adminConfig }: { adminConfig: AdminConfig }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [step, setStep] = useState<ChatStep>("greeting");
  const [inputValue, setInputValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addMessage = useCallback(
    (role: MessageRole, content: string, extra?: Partial<ChatMessage>) => {
      const msg: ChatMessage = {
        id: makeId(),
        role,
        content,
        timestamp: new Date(),
        ...extra,
      };
      setMessages((prev) => [...prev, msg]);
      return msg.id;
    },
    [],
  );

  // Initial greeting
  useEffect(() => {
    const timer = setTimeout(() => {
      addMessage(
        "bot",
        "👋 Hi there! Welcome to PDF Shop. I'm here to help you get your digital products instantly.\n\nHow can I help you today?",
      );
      setStep("choose");
    }, 500);
    return () => clearTimeout(timer);
  }, [addMessage]);

  // Auto-scroll
  // biome-ignore lint/correctness/useExhaustiveDependencies: messages triggers scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleBuyPDF = useCallback(() => {
    addMessage("user", "Buy PDF");
    setStep("payment_info");
    setTimeout(() => {
      addMessage(
        "bot",
        "Great! 🎉 To get your PDF, please transfer the payment via KBZ Pay and send us a screenshot of the receipt.",
      );
      setStep("awaiting_upload");
    }, 600);
  }, [addMessage]);

  const handleAskQuestion = useCallback(() => {
    addMessage("user", "Ask a Question");
    addMessage(
      "bot",
      "Of course! What would you like to know? Type your question below and I'll get back to you.",
    );
    setStep("question_input");
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [addMessage]);

  const handleSendQuestion = useCallback(() => {
    const q = inputValue.trim();
    if (!q) return;
    addMessage("user", q);
    setInputValue("");
    setStep("question_answered");
    const phone = adminConfig.phone;
    setTimeout(() => {
      addMessage(
        "bot",
        `Thank you for your question! 🙏\n\nOur team will get back to you shortly. You can also reach us directly at ${phone}.`,
      );
    }, 700);
  }, [inputValue, addMessage, adminConfig.phone]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      const localUrl = URL.createObjectURL(file);
      addMessage("user", "Payment screenshot", {
        attachment: { type: "image", url: localUrl, name: file.name },
      });
      setUploading(true);
      setStep("uploading");
      const phone = adminConfig.phone;

      try {
        const sc = await getStorageClient();
        const bytes = new Uint8Array(await file.arrayBuffer());
        const { hash } = await sc.putFile(bytes);

        const existing = loadAdminConfig();
        const updated = {
          ...existing,
          screenshots: [
            ...existing.screenshots,
            {
              name: file.name,
              url: hash,
              uploadedAt: new Date().toISOString(),
            },
          ],
        };
        saveAdminConfig(updated);

        setUploading(false);
        setStep("pdf_ready");
        addMessage(
          "bot",
          "Thank you! ✅ We've received your payment screenshot. Here is your PDF:",
        );
      } catch {
        setUploading(false);
        setStep("awaiting_upload");
        toast.error("Upload failed. Please try again.");
        addMessage(
          "bot",
          `⚠️ Upload failed. Please try again or contact us at ${phone}`,
        );
      } finally {
        URL.revokeObjectURL(localUrl);
      }
    },
    [addMessage, adminConfig.phone],
  );

  const canSend = step === "question_input" && inputValue.trim().length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-t-2xl"
        style={{
          background: "linear-gradient(135deg, #2E6F7C 0%, #245E69 100%)",
        }}
      >
        <BotAvatar />
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">PDF Shop Assistant</p>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-300 text-xs">
              Online · Ready to help
            </span>
          </div>
        </div>
        <MessageCircle className="w-5 h-5 text-white/60" />
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <ChatBubble key={msg.id} msg={msg} />
          ))}
        </AnimatePresence>

        {/* Quick reply buttons */}
        {step === "choose" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-2 pl-10"
          >
            <PillButton
              onClick={handleBuyPDF}
              icon={<FileText className="w-4 h-4" />}
              dataOcid="chat.primary_button"
            >
              Buy PDF
            </PillButton>
            <PillButton
              onClick={handleAskQuestion}
              icon={<HelpCircle className="w-4 h-4" />}
              dataOcid="chat.secondary_button"
            >
              Ask a Question
            </PillButton>
          </motion.div>
        )}

        {/* Payment info + upload zone */}
        {(step === "awaiting_upload" || step === "uploading") && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="pl-10"
          >
            <PaymentInfoCard
              phone={adminConfig.phone}
              kbz={adminConfig.kbzPay}
            />
            <UploadZone onFile={handleFileUpload} uploading={uploading} />
          </motion.div>
        )}

        {/* PDF download */}
        {step === "pdf_ready" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="pl-10"
          >
            <PDFDownloadCard pdfUrl={adminConfig.pdfUrl} />
          </motion.div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-slate-100 px-3 py-3 flex items-center gap-2">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && canSend && handleSendQuestion()
          }
          placeholder={
            step === "question_input"
              ? "Type your question…"
              : "Select an option above to continue…"
          }
          disabled={step !== "question_input"}
          className="flex-1 border-slate-200 text-sm focus-visible:ring-teal-500"
          data-ocid="chat.input"
        />
        <Button
          type="button"
          onClick={handleSendQuestion}
          disabled={!canSend}
          size="icon"
          className="flex-shrink-0"
          style={
            canSend
              ? {
                  background:
                    "linear-gradient(135deg, #2E6F7C 0%, #245E69 100%)",
                  color: "white",
                }
              : {}
          }
          data-ocid="chat.submit_button"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Featured PDF Sidebar ─────────────────────────────────────────────────

function FeaturedPDFs() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Star className="w-4 h-4 text-amber-500" />
        <h3 className="font-semibold text-slate-800 text-sm">
          Featured Products
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {FEATURED_PDFS.map((pdf) => (
          <motion.div
            key={pdf.id}
            whileHover={{ y: -2 }}
            className="pdf-card p-3 cursor-pointer"
            data-ocid={`pdf.item.${pdf.id}`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${pdf.color} flex items-center justify-center text-lg flex-shrink-0`}
              >
                {pdf.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm leading-tight truncate">
                  {pdf.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {pdf.subtitle}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs font-bold text-teal-600">
                    {pdf.price}
                  </span>
                  <span className="text-xs text-slate-400">
                    {pdf.pages} pages
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="rounded-xl bg-teal-50 border border-teal-100 p-3">
        <p className="text-xs font-semibold text-teal-700 mb-1">How it works</p>
        <ol className="text-xs text-slate-600 space-y-1">
          <li className="flex items-start gap-1.5">
            <span className="text-teal-500 font-bold">1.</span>Click &ldquo;Buy
            PDF&rdquo; in chat
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-teal-500 font-bold">2.</span>Transfer via KBZ
            Pay
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-teal-500 font-bold">3.</span>Upload payment
            screenshot
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-teal-500 font-bold">4.</span>Get your PDF
            instantly!
          </li>
        </ol>
      </div>
    </div>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────

function AdminPanel({ onClose }: { onClose: () => void }) {
  const [cfg, setCfg] = useState<AdminConfig>(loadAdminConfig);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const save = () => {
    saveAdminConfig(cfg);
    toast.success("Settings saved!");
  };

  const handleUploadPdf = async () => {
    if (!pdfFile) return;
    setUploadingPdf(true);
    try {
      const sc = await getStorageClient();
      const bytes = new Uint8Array(await pdfFile.arrayBuffer());
      const { hash } = await sc.putFile(bytes);
      const url = await sc.getDirectURL(hash);
      const updated = { ...cfg, pdfUrl: url };
      setCfg(updated);
      saveAdminConfig(updated);
      toast.success("PDF uploaded and URL saved!");
      setPdfFile(null);
    } catch {
      toast.error("PDF upload failed.");
    } finally {
      setUploadingPdf(false);
    }
  };

  const handlePdfZoneKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") pdfInputRef.current?.click();
  };

  return (
    <div className="min-h-screen page-gradient flex items-start justify-center pt-12 pb-16 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white rounded-2xl shadow-chat p-6 space-y-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-bold text-slate-800">Admin Panel</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            data-ocid="admin.close_button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contact Info */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">
            Payment Details
          </h3>
          <div>
            <label
              htmlFor="admin-phone"
              className="text-xs text-slate-500 mb-1 block"
            >
              Phone Number
            </label>
            <Input
              id="admin-phone"
              value={cfg.phone}
              onChange={(e) => setCfg((p) => ({ ...p, phone: e.target.value }))}
              placeholder="09xxxxxxxxx"
              data-ocid="admin.input"
            />
          </div>
          <div>
            <label
              htmlFor="admin-kbz"
              className="text-xs text-slate-500 mb-1 block"
            >
              KBZ Pay Number
            </label>
            <Input
              id="admin-kbz"
              value={cfg.kbzPay}
              onChange={(e) =>
                setCfg((p) => ({ ...p, kbzPay: e.target.value }))
              }
              placeholder="09xxxxxxxxx"
              data-ocid="admin.input"
            />
          </div>
          <Button
            type="button"
            onClick={save}
            className="w-full"
            style={{
              background: "linear-gradient(135deg, #2E6F7C 0%, #245E69 100%)",
              color: "white",
            }}
            data-ocid="admin.save_button"
          >
            Save Settings
          </Button>
        </div>

        {/* PDF Upload */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">
            PDF File
          </h3>
          {cfg.pdfUrl && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <p className="text-xs text-green-700 truncate flex-1">
                PDF uploaded: {cfg.pdfUrl.substring(0, 50)}…
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => pdfInputRef.current?.click()}
            onKeyDown={handlePdfZoneKeyDown}
            className="w-full border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition-colors"
            data-ocid="admin.dropzone"
          >
            <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600">
              {pdfFile ? pdfFile.name : "Click to select PDF file"}
            </p>
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            />
          </button>
          {pdfFile && (
            <Button
              type="button"
              onClick={handleUploadPdf}
              disabled={uploadingPdf}
              className="w-full"
              style={{
                background: "linear-gradient(135deg, #2E6F7C 0%, #245E69 100%)",
                color: "white",
              }}
              data-ocid="admin.upload_button"
            >
              {uploadingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload PDF
                </>
              )}
            </Button>
          )}
        </div>

        {/* Screenshots list */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">
            Payment Screenshots ({cfg.screenshots.length})
          </h3>
          {cfg.screenshots.length === 0 ? (
            <div
              className="text-center py-6 text-slate-400 text-sm"
              data-ocid="admin.empty_state"
            >
              <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No screenshots yet
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {cfg.screenshots.map((s, i) => (
                <div
                  key={s.uploadedAt}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100"
                  data-ocid={`admin.item.${i + 1}`}
                >
                  <ImageIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">
                      {s.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(s.uploadedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────

function Navbar({ onAdminHint }: { onAdminHint: () => void }) {
  return (
    <header className="sticky top-0 z-50 bg-white shadow-nav border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #2E6F7C 0%, #245E69 100%)",
            }}
          >
            <FileText className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-800 text-lg">PDF Shop</span>
        </motion.div>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-6">
          {["How it Works", "FAQ", "Contact"].map((link) => (
            <button
              type="button"
              key={link}
              className="text-sm text-slate-600 hover:text-teal-600 transition-colors font-medium"
              data-ocid="nav.link"
            >
              {link}
            </button>
          ))}
        </nav>

        {/* Hidden admin trigger */}
        <button
          type="button"
          onClick={onAdminHint}
          className="text-xs text-slate-300 hover:text-teal-600 transition-colors px-2 py-1 rounded hidden sm:block"
          title="Admin"
        >
          ···
        </button>
      </div>
    </header>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="text-center pt-12 pb-6 px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
      >
        <Badge className="mb-4 bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-100">
          <CheckCircle className="w-3 h-3 mr-1" />
          Trust-based instant delivery
        </Badge>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight mb-3">
          Get Your PDF
          <span className="block" style={{ color: "#1F6E7A" }}>
            Instantly via Chat
          </span>
        </h1>
        <p className="text-slate-600 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
          Browse our digital products, pay via KBZ Pay, upload your receipt —
          and receive your PDF file immediately. Simple, fast, and trusted.
        </p>
      </motion.div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────

function Footer() {
  const year = new Date().getFullYear();
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  return (
    <footer className="border-t border-slate-200 bg-white mt-16 py-8 px-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #2E6F7C 0%, #245E69 100%)",
            }}
          >
            <FileText className="w-3 h-3 text-white" />
          </div>
          <span className="font-semibold text-slate-700">PDF Shop</span>
        </div>
        <div className="flex gap-4">
          {["Privacy", "Terms", "Contact"].map((l) => (
            <button
              type="button"
              key={l}
              className="hover:text-teal-600 transition-colors"
            >
              {l}
            </button>
          ))}
        </div>
        <p>
          © {year}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 hover:underline font-medium"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </footer>
  );
}

// ─── Decorative background blobs ──────────────────────────────────────────

function BackgroundBlobs() {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden -z-10"
      aria-hidden="true"
    >
      <div
        className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-30"
        style={{
          background: "radial-gradient(circle, #d0ede9, transparent 70%)",
        }}
      />
      <div
        className="absolute top-1/3 -right-32 w-80 h-80 rounded-full opacity-20"
        style={{
          background: "radial-gradient(circle, #a3d8d4, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-20 left-1/4 w-64 h-64 rounded-full opacity-25"
        style={{
          background: "radial-gradient(circle, #eaf7f0, transparent 70%)",
        }}
      />
      <div className="absolute top-24 left-16 opacity-5">
        <FileText className="w-16 h-16 text-teal-500" />
      </div>
      <div className="absolute top-40 right-24 opacity-5">
        <BookOpen className="w-12 h-12 text-teal-500" />
      </div>
      <div className="absolute bottom-40 right-16 opacity-5">
        <FileText className="w-20 h-20 text-teal-400" />
      </div>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────

export default function App() {
  const isAdmin =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("admin") === "true";
  const [showAdmin, setShowAdmin] = useState(isAdmin);
  const [adminConfig, setAdminConfig] = useState<AdminConfig>(loadAdminConfig);

  const handleCloseAdmin = () => {
    setAdminConfig(loadAdminConfig());
    setShowAdmin(false);
  };

  const handleAdminHint = () => {
    const input = window.prompt("Enter admin code:");
    if (input === "admin") setShowAdmin(true);
  };

  if (showAdmin) {
    return (
      <>
        <BackgroundBlobs />
        <AdminPanel onClose={handleCloseAdmin} />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <div className="page-gradient relative">
      <BackgroundBlobs />
      <Navbar onAdminHint={handleAdminHint} />

      <main>
        <Hero />

        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
          <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
            {/* Chat Window */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="w-full lg:w-[520px] bg-white rounded-2xl overflow-hidden chat-shadow flex flex-col"
              style={{ minHeight: 520, maxHeight: 600 }}
              data-ocid="chat.panel"
            >
              <ChatPanel adminConfig={adminConfig} />
            </motion.div>

            {/* Sidebar */}
            <motion.aside
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45, duration: 0.5 }}
              className="w-full lg:w-72 space-y-4"
              data-ocid="pdf.list"
            >
              <div className="bg-white rounded-2xl p-4 shadow-card">
                <FeaturedPDFs />
              </div>

              <div
                className="rounded-2xl p-4 text-white"
                style={{
                  background:
                    "linear-gradient(135deg, #2E6F7C 0%, #1F6E7A 100%)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-semibold text-sm">
                    Trust-Based Delivery
                  </span>
                </div>
                <p className="text-xs text-teal-100 leading-relaxed">
                  We operate on mutual trust. Send your payment screenshot and
                  receive your PDF instantly — no accounts needed.
                </p>
                <div className="mt-3 flex items-center gap-1 text-xs text-teal-200">
                  <ChevronRight className="w-3 h-3" />
                  Contact: {adminConfig.phone}
                </div>
              </div>
            </motion.aside>
          </div>
        </section>
      </main>

      {/* Floating chat launcher (mobile) */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
        className="fixed bottom-6 right-6 lg:hidden z-50"
      >
        <button
          type="button"
          className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white"
          style={{
            background: "linear-gradient(135deg, #2E6F7C 0%, #245E69 100%)",
          }}
          onClick={() =>
            document
              .querySelector('[data-ocid="chat.panel"]')
              ?.scrollIntoView({ behavior: "smooth" })
          }
          data-ocid="chat.open_modal_button"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </motion.div>

      <Footer />
      <Toaster position="top-right" richColors />
    </div>
  );
}
