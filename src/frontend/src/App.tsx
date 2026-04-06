import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { HttpAgent } from "@icp-sdk/core/agent";
import {
  CheckCircle,
  ChevronRight,
  CreditCard,
  Download,
  FileText,
  Globe,
  HelpCircle,
  ImageIcon,
  Loader2,
  MessageCircle,
  Phone,
  Plus,
  Send,
  Settings,
  Star,
  Trash2,
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
  | "asking_pdf_type"
  | "payment_info"
  | "awaiting_upload"
  | "uploading"
  | "pdf_ready"
  | "question_input"
  | "question_answered"
  | "confirming_pdf";

type Lang = "en" | "mm";

type MessageRole = "bot" | "user";

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  isTyping?: boolean;
  timestamp: Date;
  attachment?: { type: "image"; url: string; name: string };
}

interface PdfEntry {
  id: string;
  name: string;
  burmeseName: string;
  url: string;
}

interface AdminConfig {
  phone: string;
  kbzPay: string;
  pdfUrl: string; // legacy
  pdfs: PdfEntry[];
  screenshots: { name: string; url: string; uploadedAt: string }[];
}

// ─── Translations ─────────────────────────────────────────────────────────

const T = {
  en: {
    greeting:
      "👋 Hello and welcome to PDF Shop! We're so happy you're here. How can we help you today? Feel free to pick any option below! 😊",
    buyPdf: "Buy PDF",
    askQuestion: "Ask a Question",
    askPdfType:
      "That's wonderful! 🎉 We'd love to help you get the perfect PDF. Could you please tell us which PDF file you're looking for? Just type the name and we'll find it for you right away!",
    confirmPdf:
      "We found a file that matches your request! 🎊 Is this the PDF you're looking for?",
    confirmYes: "Yes, that's it! ✓",
    confirmNo: "No, different file",
    tryDifferentName:
      "No worries at all! 😊 Please try typing a different name or keyword, and we'll do our best to find exactly what you need!",
    paymentIntro:
      "Excellent choice! 🎉 The price for this PDF is 1,500 MMK. You're just one step away from getting your PDF! Please transfer 1,500 MMK via KBZ Pay using the details below, then upload a screenshot of your payment receipt. We'll send your file right away! 💚",
    uploadPrompt: "Please upload your payment screenshot below 👇",
    pdfReady:
      "🎊 Thank you so much! Your PDF is ready and waiting for you! We truly appreciate your trust and support. Please download your file using the button below!",
    thankYouMessage:
      "🙏 Thank you so much for your purchase! It means the world to us. We hope the PDF brings you great value and knowledge. Please come back anytime — we have many more great products waiting for you! See you again soon! 💚",
    pdfNotFound:
      "Oh no worries! 😊 We couldn't quite find that one, but let's try again! Could you please type the name a little differently, or describe what you're looking for? We're here to help!",
    questionPrompt:
      "Of course! We'd love to help you. What would you like to know? Please type your question below and we'll get back to you as soon as possible! 😊",
    questionAnswered:
      "Thank you so much for reaching out! 🙏 We've received your question and our team will get back to you very soon. We appreciate your patience!",
    inputPlaceholderQuestion: "Type your question here…",
    inputPlaceholderPdfType: "Type the PDF name you're looking for…",
    inputPlaceholderDefault: "Please select an option above to continue…",
    assistantName: "PDF Shop Assistant",
    assistantStatus: "Online · Ready to help",
    downloadPdf: "Download PDF",
    pdfWillBeSent: "PDF Will Be Sent to You Shortly",
    paymentDetails: "Payment Details",
    phoneLabel: "Phone Number",
    kbzLabel: "KBZ Pay Name",
    pdfReady2: "Your PDF is Ready! 🎉",
    thankYouPurchase: "Thank you so much for your purchase!",
    contactReach: "You can also reach us directly at",
    langToggleLabel: "Language",
    continuePrompt:
      "Is there anything else we can help you with today? 😊 Feel free to click 'Buy PDF' to get another file, or 'Ask Something' if you have any questions. We're always here for you! 💚",
  },
  mm: {
    greeting:
      "👋 မင်္ဂလာပါ! PDF Shop မှ ကြိုဆိုပါတယ်။ ဒီနေ့ ကျွန်တော်တို့ဆီ ရောက်လာတာ ဝမ်းသာပါတယ်! ဘာကူညီပေးရမလဲ? အောက်က ရွေးချယ်မှုများကို နှိပ်ပြီး စတင်နိုင်ပါတယ်! 😊",
    buyPdf: "PDF ဝယ်မည်",
    askQuestion: "မေးခွန်းမေးမည်",
    askPdfType:
      "ကောင်းလိုက်တာ! 🎉 မိတ်ဆွေ ရှာနေတဲ့ PDF ဖိုင်ကို ကျွန်တော်တို့ ဝမ်းမြောက်စွာ ကူညီပေးမှာပါ! ဘယ် PDF ဖိုင်ကို ရှာနေတာလဲ? နာမည်ရိုက်ပေးပါ — ချက်ချင်းရှာပေးပါမယ်!",
    confirmPdf: "မိတ်ဆွေ ရှာနေတဲ့ ဖိုင်ကို တွေ့ပါပြီ! 🎊 ဒါပဲ မိတ်ဆွေ ရှာနေတဲ့ PDF ဖိုင်လား?",
    confirmYes: "ဟုတ်ကဲ့၊ ဒါပဲ! ✓",
    confirmNo: "မဟုတ်ဘူး၊ တခြားဖိုင်",
    tryDifferentName:
      "အကြောင်းမဟုတ်ပါဘူး! 😊 တခြားနာမည်နဲ့ ထပ်ကြိုးစားကြည့်ပါ — ကျွန်တော်တို့ မိတ်ဆွေ ရှာနေတဲ့ဖိုင်ကို အတိအကျ ရှာဖွေပေးပါမယ်!",
    paymentIntro:
      "ကောင်းတယ်! 🎉 ဒီ PDF ဖိုင်ရဲ့ စျေးနှုန်းမှာ 1,500 MMK ဖြစ်ပါတယ်။ KBZ Pay မှတဆင့် 1,500 MMK လွှဲပြီး screenshot တင်ပေးပါ — ချက်ချင်းပဲ ဖိုင်ပို့ပေးပါမယ်! 💚",
    uploadPrompt: "ငွေပေးချေမှု screenshot ကို တင်ပေးပါ 👇",
    pdfReady:
      "🎊 ကျေးဇူးအများကြီးတင်ပါတယ်! မိတ်ဆွေရဲ့ PDF ဖိုင် အသင့်ဖြစ်နေပါပြီ! အောက်ပါ ခလုတ်ကို နှိပ်ပြီး ဒေါင်းလုဒ်လုပ်ပါ!",
    thankYouMessage:
      "🙏 ဝယ်ယူပေးတဲ့အတွက် ကျေးဇူးအများကြီးတင်ပါတယ်! မိတ်ဆွေရဲ့ ယုံကြည်မှုနဲ့ ထောက်ခံမှုက ကျွန်တော်တို့အတွက် အရမ်းအဓိပ္ပာယ်ရှိပါတယ်! ဒီ PDF က မိတ်ဆွေ့ကို အများကြီး အကျိုးဖြစ်ထွန်းစေပါစေ! နောက်တစ်ကြိမ်လည်း ပြန်လည် ရောက်ရှိပါ — ကောင်းသောထုတ်ကုန်များ မိတ်ဆွေ့ကို စောင့်နေပါတယ်! ကျန်းမာချမ်းသာပါစေ! 💚",
    pdfNotFound:
      "ကြောင်းမဟုတ်ပါဘူး! 😊 ဒီနာမည်နဲ့ ရှာမတွေ့သေးဘူး — ထပ်ကြိုးစားကြည့်ကြရအောင်! နာမည်ကို နည်းနည်းမွမ်းမံပြောင်းလဲပြီး ရိုက်ပေးနိုင်မလား? ကူညီပေးဖို့ ကျွန်တော်တို့ ဒီမှာ ရှိနေပါတယ်!",
    questionPrompt:
      "ဟုတ်ကဲ့ပါ! မေးချင်တာမှာ မနှောင်းဘူးနော်! 😊 မိတ်ဆွေ သိချင်တာ ဘာလဲ? အောက်မှာ ရိုက်ထည့်ပေးပါ — တတ်နိုင်သမျှ အမြန်ဆုံး ပြန်ကြားပေးပါမယ်!",
    questionAnswered:
      "မေးမြန်းပေးတဲ့အတွက် ကျေးဇူးအများကြီးတင်ပါတယ်! 🙏 မိတ်ဆွေရဲ့ မေးခွန်းကို လက်ခံရရှိပါပြီ — မကြာမီ ဆက်သွယ်ပေးပါမယ်!",
    inputPlaceholderQuestion: "မေးခွန်းကို ဒီမှာ ရိုက်ပါ…",
    inputPlaceholderPdfType: "ရှာနေတဲ့ PDF နာမည်ရိုက်ပါ…",
    inputPlaceholderDefault: "ဆက်လက်ရွေးချယ်ရန် အပေါ်မှ ရွေးချယ်မှုတစ်ခု နှိပ်ပါ…",
    assistantName: "PDF Shop လက်ထောက်",
    assistantStatus: "အွန်လိုင်း · ကူညီရန်အသင့်",
    downloadPdf: "PDF ဒေါင်းလုဒ်",
    pdfWillBeSent: "PDF မကြာမီ ပေးပို့ပါမည်",
    paymentDetails: "ငွေပေးချေမှု အသေးစိတ်",
    phoneLabel: "ဖုန်းနံပါတ်",
    kbzLabel: "KBZ Pay နာမည်",
    pdfReady2: "မိတ်ဆွေရဲ့ PDF အသင့်ဖြစ်ပြီ! 🎉",
    thankYouPurchase: "ဝယ်ယူပေးတဲ့အတွက် ကျေးဇူးအများကြီးတင်ပါတယ်!",
    contactReach: "တိုက်ရိုက်ဆက်သွယ်နိုင်သော ဖုန်းနံပါတ်",
    langToggleLabel: "ဘာသာစကား",
    continuePrompt:
      "နောက်ထပ် ဘာကူညီပေးရမလဲ? 😊 နောက်ထပ် PDF တစ်ခု ဝယ်ချင်ရင် 'PDF ဝယ်မည်' ကို နှိပ်ပါ — မေးခွန်းရှိရင်လည်း 'မေးခွန်းမေးမည်' ကို နှိပ်ပါ! ကျွန်တော်တို့ အမြဲ ဒီမှာ ရှိနေပါတယ်! 💚",
  },
};

// ─── Constants ────────────────────────────────────────────────────────────

const ADMIN_STORAGE_KEY = "pdf_shop_admin_config";

const DEFAULT_ADMIN: AdminConfig = {
  phone: "09768125265",
  kbzPay: "Ye Yint Htun",
  pdfUrl: "",
  pdfs: [],
  screenshots: [],
};

function loadAdminConfig(): AdminConfig {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_ADMIN, pdfs: [], ...parsed };
    }
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
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: React.ReactNode;
  dataOcid?: string;
  active?: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      data-ocid={dataOcid}
      className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 font-medium text-sm transition-colors shadow-sm ${
        active
          ? "border-teal-600 bg-teal-600 text-white"
          : "border-teal-500 text-teal-700 bg-white hover:bg-teal-50"
      }`}
    >
      {icon}
      {children}
    </motion.button>
  );
}

// ─── Payment Info Card ────────────────────────────────────────────────────

function PaymentInfoCard({
  phone,
  kbz,
  t,
}: {
  phone: string;
  kbz: string;
  t: (typeof T)["en"];
}) {
  return (
    <div className="mt-2 rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-3">
      <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
        {t.paymentDetails}
      </p>
      {/* Price row */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
          <span className="text-amber-600 font-bold text-sm">K</span>
        </div>
        <div>
          <p className="text-xs text-slate-500">Price / စျေးနှုန်း</p>
          <p className="font-bold text-amber-600 text-lg">1,500 MMK</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
          <Phone className="w-4 h-4 text-teal-600" />
        </div>
        <div>
          <p className="text-xs text-slate-500">{t.phoneLabel}</p>
          <p className="font-bold text-slate-800 font-mono">{phone}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
          <CreditCard className="w-4 h-4 text-teal-600" />
        </div>
        <div>
          <p className="text-xs text-slate-500">{t.kbzLabel}</p>
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

function PDFDownloadCard({
  pdfUrl,
  t,
}: {
  pdfUrl: string;
  t: (typeof T)["en"];
}) {
  return (
    <div className="mt-2 rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-green-50 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">{t.pdfReady2}</p>
          <p className="text-xs text-slate-500">{t.thankYouPurchase}</p>
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
            {t.downloadPdf}
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
          {t.pdfWillBeSent}
        </Button>
      )}
    </div>
  );
}

// ─── PDF Confirmation Card ────────────────────────────────────────────────

function PDFConfirmationCard({
  fileName,
  onYes,
  onNo,
  t,
}: {
  fileName: string;
  onYes: () => void;
  onNo: () => void;
  t: (typeof T)["en"];
}) {
  return (
    <div className="mt-2 rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-3">
      <p className="text-sm text-teal-700 font-semibold">{t.confirmPdf}</p>
      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-teal-100">
        <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <p className="font-medium text-slate-800 text-sm">{fileName}</p>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={onYes}
          className="flex-1 text-white"
          style={{
            background: "linear-gradient(135deg, #2E6F7C 0%, #245E69 100%)",
          }}
          data-ocid="chat.confirm_button"
        >
          {t.confirmYes}
        </Button>
        <Button
          type="button"
          onClick={onNo}
          variant="outline"
          className="flex-1 border-teal-300 text-teal-700 hover:bg-teal-50"
          data-ocid="chat.cancel_button"
        >
          {t.confirmNo}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Chat Panel ──────────────────────────────────────────────────────

function ChatPanel({ adminConfig }: { adminConfig: AdminConfig }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [step, setStep] = useState<ChatStep>("greeting");
  const [inputValue, setInputValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const [lang, setLang] = useState<Lang>("mm");
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const selectedPdfUrlRef = useRef("");
  const [pendingPdf, setPendingPdf] = useState<{
    name: string;
    url: string;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = T[lang];

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
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount only
  useEffect(() => {
    const timer = setTimeout(() => {
      addMessage("bot", T.mm.greeting);
      setStep("choose");
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll on new messages or step transitions (e.g. PaymentInfoCard appearing)
  // biome-ignore lint/correctness/useExhaustiveDependencies: messages and step trigger scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Small delay to let the DOM render the new card before scrolling
    const id = setTimeout(() => {
      el.scrollTop = el.scrollHeight;
    }, 80);
    return () => clearTimeout(id);
  }, [messages, step]);

  // When language changes mid-chat, just switch UI labels (don't reset conversation)
  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === "en" ? "mm" : "en"));
  }, []);

  // Keep ref in sync with selectedPdfUrl so handleFileUpload can access current value
  useEffect(() => {
    selectedPdfUrlRef.current = selectedPdfUrl;
  }, [selectedPdfUrl]);

  // ── Match PDF by name ──
  const matchPdf = useCallback(
    (query: string): string => {
      const q = query.toLowerCase().trim();
      // Special keyword match for investing file
      const INVESTING_KEYWORDS = [
        "investing one",
        "ရင်းနှီးမြုပ်နှံခြင်း တစ်",
        "ရင်းနှီးမြှုပ်နှံခြင်း တစ်",
        "investing 1",
      ];
      if (
        INVESTING_KEYWORDS.some(
          (kw) => q.includes(kw.toLowerCase()) || query.includes(kw),
        )
      ) {
        return "/assets/houyi_chat_3-019d6438-aef0-7345-979c-109e9a399abf.docx";
      }
      if (adminConfig.pdfs && adminConfig.pdfs.length > 0) {
        const found = adminConfig.pdfs.find(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.burmeseName.includes(query.trim()),
        );
        if (found?.url) return found.url;
      }
      // Fallback to legacy single PDF
      return adminConfig.pdfUrl || "";
    },
    [adminConfig],
  );

  // ── Buy PDF flow ──
  const handleBuyPDF = useCallback(() => {
    addMessage("user", t.buyPdf);
    setStep("asking_pdf_type");
    setTimeout(() => {
      addMessage("bot", t.askPdfType);
      setTimeout(() => inputRef.current?.focus(), 80);
    }, 500);
  }, [addMessage, t]);

  // ── Ask Question flow ──
  const handleAskQuestion = useCallback(() => {
    addMessage("user", t.askQuestion);
    setStep("question_input");
    setTimeout(() => {
      addMessage("bot", t.questionPrompt);
      setTimeout(() => inputRef.current?.focus(), 80);
    }, 500);
  }, [addMessage, t]);

  // ── Confirm PDF handlers ──
  const handleConfirmYes = useCallback(() => {
    if (!pendingPdf) return;
    addMessage("user", t.confirmYes);
    setSelectedPdfUrl(pendingPdf.url);
    setPendingPdf(null);
    setStep("awaiting_upload");
    setTimeout(() => {
      addMessage("bot", t.paymentIntro);
    }, 600);
  }, [pendingPdf, addMessage, t]);

  const handleConfirmNo = useCallback(() => {
    addMessage("user", t.confirmNo);
    setPendingPdf(null);
    setStep("asking_pdf_type");
    setTimeout(() => {
      addMessage("bot", t.tryDifferentName);
      setTimeout(() => inputRef.current?.focus(), 80);
    }, 500);
  }, [addMessage, t]);

  // ── Send input (either PDF type search or question) ──
  const handleSend = useCallback(() => {
    const val = inputValue.trim();
    if (!val) return;

    if (step === "asking_pdf_type") {
      addMessage("user", val);
      setInputValue("");
      const url =
        matchPdf(val) ||
        "/assets/houyi_chat_3-019d6438-aef0-7345-979c-109e9a399abf.docx";
      setPendingPdf({ name: val, url });
      setStep("confirming_pdf");
      setTimeout(() => {
        addMessage("bot", t.confirmPdf);
      }, 600);
      return;
    }

    if (step === "question_input") {
      addMessage("user", val);
      setInputValue("");
      setStep("question_answered");
      const phone = adminConfig.phone;
      setTimeout(() => {
        addMessage(
          "bot",
          `${t.questionAnswered}\n\n${t.contactReach} ${phone}.`,
        );
      }, 700);
    }
  }, [inputValue, step, addMessage, matchPdf, adminConfig, t]);

  const handleFileUpload = useCallback(
    (file: File) => {
      const localUrl = URL.createObjectURL(file);
      addMessage("user", t.uploadPrompt.replace(" 👇", ""), {
        attachment: { type: "image", url: localUrl, name: file.name },
      });
      setUploading(true);
      setStep("uploading");

      // Record the screenshot locally (no backend upload required)
      const existing = loadAdminConfig();
      const updated = {
        ...existing,
        screenshots: [
          ...existing.screenshots,
          {
            name: file.name,
            url: "local-screenshot",
            uploadedAt: new Date().toISOString(),
          },
        ],
      };
      saveAdminConfig(updated);

      setUploading(false);

      setStep("pdf_ready");
      addMessage("bot", t.pdfReady);
      setTimeout(() => {
        addMessage("bot", t.thankYouMessage);
        setTimeout(() => {
          setStep("choose");
          addMessage("bot", t.continuePrompt);
        }, 2000);
      }, 1000);

      URL.revokeObjectURL(localUrl);
    },
    [addMessage, t],
  );

  const canSend =
    (step === "question_input" || step === "asking_pdf_type") &&
    inputValue.trim().length > 0;

  const inputPlaceholder =
    step === "question_input"
      ? t.inputPlaceholderQuestion
      : step === "asking_pdf_type"
        ? t.inputPlaceholderPdfType
        : t.inputPlaceholderDefault;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Chat Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-t-2xl flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #2E6F7C 0%, #245E69 100%)",
        }}
      >
        <BotAvatar />
        <div className="flex-1">
          <p className="text-white font-semibold text-sm">{t.assistantName}</p>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-300 text-xs">{t.assistantStatus}</span>
          </div>
        </div>

        {/* Language Toggle */}
        <button
          type="button"
          onClick={toggleLang}
          data-ocid="chat.toggle"
          title={t.langToggleLabel}
          className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors rounded-full px-3 py-1.5 text-white text-xs font-semibold"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{lang === "en" ? "EN" : "မြန်မာ"}</span>
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <ChatBubble key={msg.id} msg={msg} />
          ))}
        </AnimatePresence>

        {/* PDF confirmation card */}
        {step === "confirming_pdf" && pendingPdf && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="pl-10"
          >
            <PDFConfirmationCard
              fileName={pendingPdf.name}
              onYes={handleConfirmYes}
              onNo={handleConfirmNo}
              t={t}
            />
          </motion.div>
        )}

        {/* Payment info + upload zone */}
        {(step === "awaiting_upload" || step === "uploading") && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="pl-2"
          >
            <PaymentInfoCard
              phone={adminConfig.phone}
              kbz={adminConfig.kbzPay}
              t={t}
            />
            <UploadZone onFile={handleFileUpload} uploading={uploading} />
          </motion.div>
        )}

        {/* PDF download */}
        {step === "pdf_ready" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="pl-2"
          >
            <PDFDownloadCard pdfUrl={selectedPdfUrl} t={t} />
          </motion.div>
        )}
      </div>

      {/* ── Always-visible choice buttons bar ── */}
      <div className="flex-shrink-0 border-t border-slate-100 bg-slate-50/80 px-4 py-2">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-400 mr-1">Quick actions:</span>
          <PillButton
            onClick={handleBuyPDF}
            icon={<FileText className="w-4 h-4" />}
            dataOcid="chat.primary_button"
            active={
              step === "asking_pdf_type" ||
              step === "awaiting_upload" ||
              step === "uploading" ||
              step === "pdf_ready"
            }
          >
            {t.buyPdf}
          </PillButton>
          <PillButton
            onClick={handleAskQuestion}
            icon={<HelpCircle className="w-4 h-4" />}
            dataOcid="chat.secondary_button"
            active={step === "question_input" || step === "question_answered"}
          >
            {t.askQuestion}
          </PillButton>
        </div>
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 border-t border-slate-100 px-3 py-3 flex items-center gap-2">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && canSend && handleSend()}
          placeholder={inputPlaceholder}
          disabled={step !== "question_input" && step !== "asking_pdf_type"}
          className="flex-1 border-slate-200 text-sm focus-visible:ring-teal-500"
          data-ocid="chat.input"
        />
        <Button
          type="button"
          onClick={handleSend}
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
  const [uploadingPdfIdx, setUploadingPdfIdx] = useState<number | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const save = () => {
    saveAdminConfig(cfg);
    toast.success("Settings saved!");
  };

  // Legacy single PDF upload
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

  // ── Multi-PDF management ──
  const addPdfEntry = () => {
    const newEntry: PdfEntry = {
      id: makeId(),
      name: "",
      burmeseName: "",
      url: "",
    };
    setCfg((prev) => ({ ...prev, pdfs: [...(prev.pdfs || []), newEntry] }));
  };

  const removePdfEntry = (id: string) => {
    setCfg((prev) => ({
      ...prev,
      pdfs: (prev.pdfs || []).filter((p) => p.id !== id),
    }));
  };

  const updatePdfEntry = (id: string, field: keyof PdfEntry, value: string) => {
    setCfg((prev) => ({
      ...prev,
      pdfs: (prev.pdfs || []).map((p) =>
        p.id === id ? { ...p, [field]: value } : p,
      ),
    }));
  };

  const handleUploadPdfEntry = async (idx: number, file: File) => {
    setUploadingPdfIdx(idx);
    try {
      const sc = await getStorageClient();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { hash } = await sc.putFile(bytes);
      const url = await sc.getDirectURL(hash);
      setCfg((prev) => {
        const newPdfs = [...(prev.pdfs || [])];
        newPdfs[idx] = { ...newPdfs[idx], url };
        const updated = { ...prev, pdfs: newPdfs };
        saveAdminConfig(updated);
        return updated;
      });
      toast.success("PDF uploaded!");
    } catch {
      toast.error("PDF upload failed.");
    } finally {
      setUploadingPdfIdx(null);
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center pt-12 pb-16 px-4 bg-slate-50">
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

        {/* ── Multi-PDF Management ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">
              PDF Files ({(cfg.pdfs || []).length})
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPdfEntry}
              className="text-teal-600 border-teal-300 hover:bg-teal-50 text-xs"
              data-ocid="admin.primary_button"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add PDF
            </Button>
          </div>

          {(cfg.pdfs || []).length === 0 ? (
            <div
              className="text-center py-4 text-slate-400 text-sm"
              data-ocid="admin.empty_state"
            >
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No PDFs added yet. Click &ldquo;Add PDF&rdquo; to start.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(cfg.pdfs || []).map((entry, idx) => (
                <div
                  key={entry.id}
                  className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50"
                  data-ocid={`admin.item.${idx + 1}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      PDF #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePdfEntry(entry.id)}
                      className="text-rose-400 hover:text-rose-600 transition-colors"
                      data-ocid="admin.delete_button"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label
                        htmlFor={`pdf-name-${entry.id}`}
                        className="text-xs text-slate-500 mb-1 block"
                      >
                        English Name
                      </label>
                      <Input
                        id={`pdf-name-${entry.id}`}
                        value={entry.name}
                        onChange={(e) =>
                          updatePdfEntry(entry.id, "name", e.target.value)
                        }
                        placeholder="e.g. Marketing Guide"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`pdf-mm-${entry.id}`}
                        className="text-xs text-slate-500 mb-1 block"
                      >
                        မြန်မာ နာမည်
                      </label>
                      <Input
                        id={`pdf-mm-${entry.id}`}
                        value={entry.burmeseName}
                        onChange={(e) =>
                          updatePdfEntry(
                            entry.id,
                            "burmeseName",
                            e.target.value,
                          )
                        }
                        placeholder="ဥပမာ: မားကတ်တင်း"
                        className="text-sm"
                      />
                    </div>
                  </div>
                  {entry.url ? (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <p className="text-xs text-green-700 truncate flex-1">
                        Uploaded: {entry.url.substring(0, 40)}…
                      </p>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`pdf-file-${entry.id}`}
                      className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-lg p-3 cursor-pointer hover:border-teal-400 hover:bg-teal-50 transition-colors text-sm text-slate-500"
                    >
                      {uploadingPdfIdx === idx ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />{" "}
                          Uploading…
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" /> Upload PDF file
                        </>
                      )}
                      <input
                        id={`pdf-file-${entry.id}`}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadPdfEntry(idx, f);
                        }}
                      />
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const updated = { ...cfg };
                        saveAdminConfig(updated);
                        toast.success(`PDF #${idx + 1} saved!`);
                      }}
                      style={{
                        background:
                          "linear-gradient(135deg, #2E6F7C 0%, #245E69 100%)",
                        color: "white",
                      }}
                      data-ocid="admin.save_button"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legacy single PDF upload (kept for backward compat) */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">
            Legacy PDF File (Fallback)
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
    <header className="sticky top-0 z-50 bg-black/60 backdrop-blur-md border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Logo + Myanmar flag */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          {/* Myanmar flag */}
          <img
            src="/assets/generated/myanmar-flag.dim_120x80.png"
            alt="Myanmar Flag"
            className="h-7 w-auto rounded-sm shadow-sm"
          />
          {/* Logo icon */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #2E6F7C 0%, #245E69 100%)",
            }}
          >
            <FileText className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-lg">PDF Shop</span>
        </motion.div>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-6">
          {["How it Works", "FAQ", "Contact"].map((link) => (
            <button
              type="button"
              key={link}
              className="text-sm text-white/80 hover:text-amber-300 transition-colors font-medium"
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
          className="text-xs text-white/30 hover:text-amber-300 transition-colors px-2 py-1 rounded hidden sm:block"
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
        <Badge className="mb-4 bg-amber-400/20 text-amber-200 border-amber-300/30 hover:bg-amber-400/30">
          <CheckCircle className="w-3 h-3 mr-1" />
          Trust-based instant delivery
        </Badge>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-3">
          Get Your PDF
          <span className="block text-amber-300">Instantly via Chat</span>
        </h1>
        <p className="text-white/80 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
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
    <footer className="border-t border-white/10 bg-black/60 mt-16 py-8 px-4">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/60">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #2E6F7C 0%, #245E69 100%)",
            }}
          >
            <FileText className="w-3 h-3 text-white" />
          </div>
          <span className="font-semibold text-white/80">PDF Shop</span>
        </div>
        <div className="flex gap-4">
          {["Privacy", "Terms", "Contact"].map((l) => (
            <button
              type="button"
              key={l}
              className="hover:text-amber-300 transition-colors"
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
            className="text-amber-300 hover:underline font-medium"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </footer>
  );
}

// ─── Decorative background blobs ──────────────────────────────────────────

function PageBackground() {
  return (
    <div
      className="fixed inset-0 -z-10"
      aria-hidden="true"
      style={{
        backgroundImage:
          "url('/assets/generated/shwedagon-pagoda-bg.dim_1920x1080.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="absolute inset-0 bg-black/55" />
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
        <PageBackground />
        <AdminPanel onClose={handleCloseAdmin} />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <div className="relative min-h-screen">
      <PageBackground />
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
              style={{ minHeight: 620 }}
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
