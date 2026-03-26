import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart,
  BarChart2,
  CheckCircle,
  ChevronDown,
  Copy,
  Cpu,
  Headphones,
  History,
  Home,
  Lock,
  Settings,
  Shield,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SiDiscord, SiLinkedin, SiTelegram, SiX } from "react-icons/si";
import {
  Area,
  AreaChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
type OrderConfirmation = {
  coinSymbol: string;
  amount: number;
  orderType: { buy: null } | { sell: null };
  orderKind: { market: null } | { limit: number };
  price: number;
  totalCost: number;
  timestamp: bigint;
};
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useAllCoins, useFeaturedCoins } from "./hooks/useQueries";

type BinaryTradeLocal = {
  id: bigint;
  result: "win" | "lose";
  direction: "long" | "short";
  coinSymbol: string;
  profitLoss: number;
  durationSeconds: bigint;
  timestamp: bigint;
  amount: number;
  profitPercent: number;
};

// ── Static fallback data ──────────────────────────────────────────────────────
const FALLBACK_FEATURED = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    price: 67420.0,
    change24h: 2.34,
    volume24h: 28_400_000_000,
    marketCap: 1_320_000_000_000,
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    price: 3842.5,
    change24h: 1.18,
    volume24h: 14_200_000_000,
    marketCap: 462_000_000_000,
  },
  {
    symbol: "SOL",
    name: "Solana",
    price: 178.3,
    change24h: -0.72,
    volume24h: 3_100_000_000,
    marketCap: 79_000_000_000,
  },
];

const FALLBACK_MARKET = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    price: 67420.0,
    change24h: 2.34,
    volume24h: 28_400_000_000,
    marketCap: 1_320_000_000_000,
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    price: 3842.5,
    change24h: 1.18,
    volume24h: 14_200_000_000,
    marketCap: 462_000_000_000,
  },
  {
    symbol: "BNB",
    name: "BNB",
    price: 598.7,
    change24h: 0.85,
    volume24h: 2_300_000_000,
    marketCap: 89_000_000_000,
  },
  {
    symbol: "SOL",
    name: "Solana",
    price: 178.3,
    change24h: -0.72,
    volume24h: 3_100_000_000,
    marketCap: 79_000_000_000,
  },
  {
    symbol: "XRP",
    name: "XRP",
    price: 0.62,
    change24h: 3.41,
    volume24h: 1_800_000_000,
    marketCap: 34_000_000_000,
  },
  {
    symbol: "ADA",
    name: "Cardano",
    price: 0.48,
    change24h: -1.23,
    volume24h: 420_000_000,
    marketCap: 17_000_000_000,
  },
  {
    symbol: "AVAX",
    name: "Avalanche",
    price: 38.2,
    change24h: 4.12,
    volume24h: 780_000_000,
    marketCap: 16_000_000_000,
  },
  {
    symbol: "DOT",
    name: "Polkadot",
    price: 7.85,
    change24h: -2.05,
    volume24h: 320_000_000,
    marketCap: 10_000_000_000,
  },
  {
    symbol: "MATIC",
    name: "Polygon",
    price: 0.88,
    change24h: 1.67,
    volume24h: 560_000_000,
    marketCap: 8_600_000_000,
  },
  {
    symbol: "LINK",
    name: "Chainlink",
    price: 15.4,
    change24h: 2.89,
    volume24h: 440_000_000,
    marketCap: 9_000_000_000,
  },
];

// ── Mock dashboard data ───────────────────────────────────────────────────────
const HOLDINGS = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    amount: 0,
    price: 67420.0,
    change24h: 2.34,
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    amount: 0,
    price: 3842.5,
    change24h: 1.18,
  },
  {
    symbol: "SOL",
    name: "Solana",
    amount: 0,
    price: 178.3,
    change24h: -0.72,
  },
  { symbol: "BNB", name: "BNB", amount: 0, price: 598.7, change24h: 0.85 },
];

// ── Live market data hook ─────────────────────────────────────────────────────
type CoinData = (typeof FALLBACK_MARKET)[0];
type FeaturedCoinData = (typeof FALLBACK_FEATURED)[0];

// Binance symbol map: our symbol -> Binance trading pair
const BINANCE_SYMBOL_MAP: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  BNB: "BNBUSDT",
  SOL: "SOLUSDT",
  XRP: "XRPUSDT",
  ADA: "ADAUSDT",
  AVAX: "AVAXUSDT",
  DOT: "DOTUSDT",
  MATIC: "MATICUSDT",
  LINK: "LINKUSDT",
  DOGE: "DOGEUSDT",
  USDT: "USDCUSDT",
  USDC: "USDCUSDT",
};

async function fetchBinancePrices(
  symbols: string[],
): Promise<Record<string, number>> {
  const binanceSymbols = symbols
    .map((s) => BINANCE_SYMBOL_MAP[s])
    .filter(Boolean);
  if (binanceSymbols.length === 0) return {};
  try {
    const symbolsParam = JSON.stringify(binanceSymbols);
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbolsParam)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Binance fetch failed");
    const data: Array<{
      symbol: string;
      lastPrice: string;
      priceChangePercent: string;
      volume: string;
      quoteVolume: string;
    }> = await res.json();
    const result: Record<string, number> = {};
    for (const item of data) {
      const ourSymbol = Object.entries(BINANCE_SYMBOL_MAP).find(
        ([, v]) => v === item.symbol,
      )?.[0];
      if (ourSymbol) {
        result[`${ourSymbol}_price`] = Number.parseFloat(item.lastPrice);
        result[`${ourSymbol}_change`] = Number.parseFloat(
          item.priceChangePercent,
        );
        result[`${ourSymbol}_volume`] = Number.parseFloat(item.quoteVolume);
      }
    }
    return result;
  } catch {
    return {};
  }
}

function useLiveMarketData(initial: CoinData[]) {
  const [coins, setCoins] = useState<CoinData[]>(initial);
  const [priceDir, setPriceDir] = useState<
    Record<string, "up" | "down" | null>
  >({});
  const prevPricesRef = useRef<Record<string, number>>({});

  const fetchAndUpdate = useCallback(async () => {
    const symbols = initial.map((c) => c.symbol);
    const prices = await fetchBinancePrices(symbols);
    if (Object.keys(prices).length === 0) return;
    const dirs: Record<string, "up" | "down" | null> = {};
    setCoins((prev) =>
      prev.map((c) => {
        const newPrice = prices[`${c.symbol}_price`];
        if (!newPrice) return c;
        const oldPrice = prevPricesRef.current[c.symbol] ?? c.price;
        dirs[c.symbol] = newPrice > oldPrice ? "up" : "down";
        prevPricesRef.current[c.symbol] = newPrice;
        return {
          ...c,
          price: newPrice,
          change24h: prices[`${c.symbol}_change`] ?? c.change24h,
          volume24h: prices[`${c.symbol}_volume`] ?? c.volume24h,
        };
      }),
    );
    setPriceDir(dirs);
  }, [initial]);

  useEffect(() => {
    fetchAndUpdate();
    const id = setInterval(fetchAndUpdate, 5000);
    return () => clearInterval(id);
  }, [fetchAndUpdate]);

  useEffect(() => {
    if (Object.keys(priceDir).length === 0) return;
    const t = setTimeout(() => setPriceDir({}), 800);
    return () => clearTimeout(t);
  }, [priceDir]);
  return { coins, priceDir };
}

function useLiveFeaturedData(initial: FeaturedCoinData[]) {
  const [coins, setCoins] = useState<FeaturedCoinData[]>(initial);
  const [priceDir, setPriceDir] = useState<
    Record<string, "up" | "down" | null>
  >({});
  const prevPricesRef = useRef<Record<string, number>>({});

  const fetchAndUpdate = useCallback(async () => {
    const symbols = initial.map((c) => c.symbol);
    const prices = await fetchBinancePrices(symbols);
    if (Object.keys(prices).length === 0) return;
    const dirs: Record<string, "up" | "down" | null> = {};
    setCoins((prev) =>
      prev.map((c) => {
        const newPrice = prices[`${c.symbol}_price`];
        if (!newPrice) return c;
        const oldPrice = prevPricesRef.current[c.symbol] ?? c.price;
        dirs[c.symbol] = newPrice > oldPrice ? "up" : "down";
        prevPricesRef.current[c.symbol] = newPrice;
        return {
          ...c,
          price: newPrice,
          change24h: prices[`${c.symbol}_change`] ?? c.change24h,
          volume24h: prices[`${c.symbol}_volume`] ?? c.volume24h,
        };
      }),
    );
    setPriceDir(dirs);
  }, [initial]);

  useEffect(() => {
    fetchAndUpdate();
    const id = setInterval(fetchAndUpdate, 5000);
    return () => clearInterval(id);
  }, [fetchAndUpdate]);

  useEffect(() => {
    if (Object.keys(priceDir).length === 0) return;
    const t = setTimeout(() => setPriceDir({}), 800);
    return () => clearTimeout(t);
  }, [priceDir]);
  return { coins, priceDir };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
function fmtCompact(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(2)}`;
}
function coinIcon(symbol: string) {
  const icons: Record<string, string> = {
    BTC: "₿",
    ETH: "Ξ",
    BNB: "B",
    SOL: "◎",
    XRP: "X",
    ADA: "₳",
    AVAX: "A",
    DOT: "●",
    MATIC: "M",
    LINK: "L",
  };
  return icons[symbol] ?? symbol[0];
}

const PARTICLES = [
  {
    id: "p1",
    color: "#2ED47A",
    left: "8.0%",
    top: "10%",
    delay: "0.0s",
    dur: "5s",
  },
  {
    id: "p2",
    color: "#4A90E2",
    left: "15.5%",
    top: "27%",
    delay: "0.5s",
    dur: "6s",
  },
  {
    id: "p3",
    color: "#9AA6B2",
    left: "23.0%",
    top: "44%",
    delay: "1.0s",
    dur: "7s",
  },
  {
    id: "p4",
    color: "#2ED47A",
    left: "30.5%",
    top: "61%",
    delay: "1.5s",
    dur: "5s",
  },
  {
    id: "p5",
    color: "#4A90E2",
    left: "38.0%",
    top: "78%",
    delay: "2.0s",
    dur: "6s",
  },
  {
    id: "p6",
    color: "#9AA6B2",
    left: "45.5%",
    top: "15%",
    delay: "2.5s",
    dur: "7s",
  },
  {
    id: "p7",
    color: "#2ED47A",
    left: "53.0%",
    top: "32%",
    delay: "3.0s",
    dur: "5s",
  },
  {
    id: "p8",
    color: "#4A90E2",
    left: "60.5%",
    top: "49%",
    delay: "3.5s",
    dur: "6s",
  },
  {
    id: "p9",
    color: "#9AA6B2",
    left: "68.0%",
    top: "66%",
    delay: "4.0s",
    dur: "7s",
  },
  {
    id: "p10",
    color: "#2ED47A",
    left: "75.5%",
    top: "83%",
    delay: "4.5s",
    dur: "5s",
  },
  {
    id: "p11",
    color: "#4A90E2",
    left: "83.0%",
    top: "20%",
    delay: "5.0s",
    dur: "6s",
  },
  {
    id: "p12",
    color: "#9AA6B2",
    left: "90.5%",
    top: "37%",
    delay: "5.5s",
    dur: "7s",
  },
];

// ── Auth Modals ───────────────────────────────────────────────────────────────
type AuthModal = "none" | "register" | "signin";

const INPUT_STYLE = {
  background: "#0B1626",
  border: "1px solid #1E2A3B",
  color: "#F2F5FF",
} as const;

function RegisterModal({
  open,
  onOpenChange,
  onSwitchToSignIn,
  onRegistered,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSwitchToSignIn: () => void;
  onRegistered: (name: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"form" | "connecting">("form");
  const { login, identity, isLoggingIn } = useInternetIdentity();
  const { actor } = useActor();

  useEffect(() => {
    if (!identity || step !== "connecting") return;
    if (!actor) return;
    void (async () => {
      try {
        await actor.saveCallerUserProfile({ name: username });
        onRegistered(username);
        onOpenChange(false);
        toast.success(`Welcome to CRYPT0V, ${username}!`);
      } catch {
        setError("Failed to save profile. Please try again.");
        setStep("form");
      }
    })();
  }, [identity, actor, step, username, onRegistered, onOpenChange]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim()) {
      setError("Username is required.");
      return;
    }
    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    setStep("connecting");
    login();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        style={{
          background: "#0D1521",
          border: "1px solid #1E2A3B",
          color: "#F2F5FF",
        }}
        data-ocid="register.modal"
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-black"
              style={{ background: "#2ED47A", color: "#060B14" }}
            >
              C
            </div>
            <span className="text-base font-bold" style={{ color: "#F2F5FF" }}>
              CRYPT<span style={{ color: "#2ED47A" }}>0</span>V
            </span>
          </div>
          <DialogTitle style={{ color: "#F2F5FF" }}>Create Account</DialogTitle>
          <p className="text-sm" style={{ color: "#9AA6B2" }}>
            Join millions of traders on CRYPT0V
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="reg-username" style={{ color: "#9AA6B2" }}>
              Username
            </Label>
            <Input
              id="reg-username"
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="text-sm"
              style={INPUT_STYLE}
              data-ocid="register.input"
              disabled={step === "connecting" || isLoggingIn}
            />
          </div>
          <div
            className="text-xs px-3 py-2 rounded-lg"
            style={{
              background: "rgba(46,212,122,0.08)",
              border: "1px solid rgba(46,212,122,0.2)",
              color: "#9AA6B2",
            }}
          >
            🔐 You'll authenticate via{" "}
            <span style={{ color: "#2ED47A" }}>Internet Identity</span> — no
            password needed. Secure and decentralized.
          </div>
          {error && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{
                background: "rgba(227,93,106,0.1)",
                border: "1px solid rgba(227,93,106,0.2)",
                color: "#E35D6A",
              }}
              data-ocid="register.error_state"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: "#2ED47A", color: "#060B14" }}
            data-ocid="register.submit_button"
            disabled={step === "connecting" || isLoggingIn}
          >
            {step === "connecting" || isLoggingIn
              ? "Connecting…"
              : "Create Account"}
          </button>
        </form>
        <p className="text-center text-sm mt-2" style={{ color: "#9AA6B2" }}>
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="font-semibold transition-colors hover:opacity-80"
            style={{ color: "#2ED47A" }}
            data-ocid="register.signin.link"
          >
            Sign In
          </button>
        </p>
      </DialogContent>
    </Dialog>
  );
}

function SignInModal({
  open,
  onOpenChange,
  onSwitchToRegister,
  onSignedIn,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSwitchToRegister: () => void;
  onSignedIn: (name: string) => void;
}) {
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const { login, identity, isLoggingIn } = useInternetIdentity();
  const { actor } = useActor();

  useEffect(() => {
    if (!identity || !connecting) return;
    if (!actor) return;
    void (async () => {
      try {
        const profile = await actor.getCallerUserProfile();
        if (profile) {
          onSignedIn(profile.name);
          onOpenChange(false);
          toast.success(`Welcome back, ${profile.name}!`);
        } else {
          setError("No account found. Please register first.");
          setConnecting(false);
        }
      } catch {
        setError("Failed to fetch profile. Please try again.");
        setConnecting(false);
      }
    })();
  }, [identity, actor, connecting, onSignedIn, onOpenChange]);

  function handleSignIn() {
    setError("");
    setConnecting(true);
    login();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        style={{
          background: "#0D1521",
          border: "1px solid #1E2A3B",
          color: "#F2F5FF",
        }}
        data-ocid="signin.modal"
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-black"
              style={{ background: "#2ED47A", color: "#060B14" }}
            >
              C
            </div>
            <span className="text-base font-bold" style={{ color: "#F2F5FF" }}>
              CRYPT<span style={{ color: "#2ED47A" }}>0</span>V
            </span>
          </div>
          <DialogTitle style={{ color: "#F2F5FF" }}>Welcome Back</DialogTitle>
          <p className="text-sm" style={{ color: "#9AA6B2" }}>
            Sign in to your CRYPT0V account
          </p>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div
            className="text-xs px-3 py-2 rounded-lg"
            style={{
              background: "rgba(46,212,122,0.08)",
              border: "1px solid rgba(46,212,122,0.2)",
              color: "#9AA6B2",
            }}
          >
            🔐 Authenticate securely with{" "}
            <span style={{ color: "#2ED47A" }}>Internet Identity</span> —
            decentralized and passwordless.
          </div>
          {error && (
            <p
              className="text-xs px-3 py-2 rounded-lg"
              style={{
                background: "rgba(227,93,106,0.1)",
                border: "1px solid rgba(227,93,106,0.2)",
                color: "#E35D6A",
              }}
              data-ocid="signin.error_state"
            >
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleSignIn}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: "#2ED47A", color: "#060B14" }}
            data-ocid="signin.submit_button"
            disabled={connecting || isLoggingIn}
          >
            {connecting || isLoggingIn
              ? "Connecting…"
              : "Sign In with Internet Identity"}
          </button>
        </div>
        <p className="text-center text-sm mt-2" style={{ color: "#9AA6B2" }}>
          Don't have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-semibold transition-colors hover:opacity-80"
            style={{ color: "#2ED47A" }}
            data-ocid="signin.register.link"
          >
            Register
          </button>
        </p>
      </DialogContent>
    </Dialog>
  );
}

// ── Background SVG overlay ────────────────────────────────────────────────────
function SpaceBackground() {
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #060B14 0%, #0B1626 60%, #060B14 100%)",
        }}
      />
      <svg
        className="absolute inset-0 w-full h-full opacity-10"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Background grid pattern"
      >
        <title>Background grid pattern</title>
        <defs>
          <pattern
            id="grid"
            width="80"
            height="80"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 80 0 L 0 0 0 80"
              fill="none"
              stroke="#2ED47A"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full animate-pulse-glow"
        style={{
          background:
            "radial-gradient(circle, rgba(46,212,122,0.06) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full animate-pulse-glow"
        style={{
          background:
            "radial-gradient(circle, rgba(46,150,212,0.06) 0%, transparent 70%)",
          filter: "blur(40px)",
          animationDelay: "1.5s",
        }}
      />
      {PARTICLES.map((p) => (
        <div
          key={p.id}
          className="absolute w-1 h-1 rounded-full animate-float"
          style={{
            background: p.color,
            left: p.left,
            top: p.top,
            animationDelay: p.delay,
            animationDuration: p.dur,
          }}
        />
      ))}
    </div>
  );
}

// ── Navigation ────────────────────────────────────────────────────────────────
function Navbar({
  onOpenRegister,
  onOpenSignIn,
  loggedInUser,
  onLogout,
}: {
  onOpenRegister: () => void;
  onOpenSignIn: () => void;
  loggedInUser: string | null;
  onLogout: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(6,11,20,0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid #1E2A3B" : "1px solid transparent",
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black"
            style={{ background: "#2ED47A", color: "#060B14" }}
          >
            C
          </div>
          <span
            className="text-lg font-bold tracking-wide"
            style={{ color: "#F2F5FF" }}
          >
            CRYPT<span style={{ color: "#2ED47A" }}>0</span>V
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          {["Markets", "Trade", "Futures", "Earn", "Support"].map((link) => (
            <NavLink key={link} label={link} />
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {loggedInUser ? (
            <>
              <span
                className="hidden sm:block text-sm font-medium px-3 py-1.5 rounded-lg"
                style={{
                  background: "rgba(46,212,122,0.1)",
                  color: "#2ED47A",
                  border: "1px solid rgba(46,212,122,0.2)",
                }}
                data-ocid="nav.user.panel"
              >
                👤 {loggedInUser}
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors duration-200"
                style={{
                  borderColor: "#1E2A3B",
                  color: "#9AA6B2",
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "#E35D6A";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "#E35D6A";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "#1E2A3B";
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "#9AA6B2";
                }}
                data-ocid="nav.logout.button"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onOpenSignIn}
                className="hidden sm:block px-4 py-2 text-sm font-medium rounded-lg border transition-colors duration-200"
                style={{
                  borderColor: "#1E2A3B",
                  color: "#F2F5FF",
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "#2ED47A";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    "#1E2A3B";
                }}
                data-ocid="nav.login.button"
              >
                Log In
              </button>
              <button
                type="button"
                onClick={onOpenRegister}
                className="px-4 py-2 text-sm font-semibold rounded-full transition-all duration-200"
                style={{ background: "#2ED47A", color: "#060B14" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "#3DE088";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "#2ED47A";
                }}
                data-ocid="nav.register.button"
              >
                Register
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ label }: { label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href="/"
      className="text-sm font-medium transition-colors duration-200"
      style={{ color: hovered ? "#F2F5FF" : "#9AA6B2" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-ocid={`nav.${label.toLowerCase()}.link`}
    >
      {label}
    </a>
  );
}

// ── Mini price card ───────────────────────────────────────────────────────────
interface PriceCardProps {
  coin: (typeof FALLBACK_FEATURED)[0];
  index: number;
  priceDir?: "up" | "down" | null;
  onCoinClick?: (symbol: string) => void;
}
function MiniPriceCard({ coin, index, priceDir, onCoinClick }: PriceCardProps) {
  const isPositive = coin.change24h >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.1 }}
      className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer"
      style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
      onClick={() => onCoinClick?.(coin.symbol)}
      data-ocid={`hero.price_card.${index + 1}`}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{ background: "#1E2A3B", color: "#2ED47A" }}
      >
        {coinIcon(coin.symbol)}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium" style={{ color: "#9AA6B2" }}>
          {coin.symbol}
        </div>
        <div
          className="text-sm font-bold truncate transition-colors duration-300"
          style={{
            color:
              priceDir === "up"
                ? "#2ED47A"
                : priceDir === "down"
                  ? "#FF4D4F"
                  : "#F2F5FF",
          }}
        >
          ${coin.price >= 1000 ? fmt(coin.price, 0) : fmt(coin.price, 2)}
        </div>
      </div>
      <div
        className="ml-auto text-xs font-semibold flex-shrink-0"
        style={{ color: isPositive ? "#2ED47A" : "#E35D6A" }}
      >
        {isPositive ? "+" : ""}
        {fmt(coin.change24h, 2)}%
      </div>
    </motion.div>
  );
}

// ── Trading widget ────────────────────────────────────────────────────────────
function TradingWidget({
  coins,
  actor,
  onOrderPlaced,
  defaultCoin,
}: {
  coins: typeof FALLBACK_FEATURED;
  actor?: ReturnType<typeof useActor>["actor"];
  onOrderPlaced?: () => void;
  defaultCoin?: string;
}) {
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [selectedCoin, setSelectedCoin] = useState(
    defaultCoin ?? coins[0]?.symbol ?? "BTC",
  );
  const [isPending, setIsPending] = useState(false);

  const coin = coins.find((c) => c.symbol === selectedCoin) ?? coins[0];
  const usdCost = coin ? Number.parseFloat(amount || "0") * coin.price : 0;

  async function handleSubmit() {
    if (!amount || Number.parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    setIsPending(true);
    try {
      if (actor) {
        const confirmation = await (actor as any).placeOrder({
          coinSymbol: selectedCoin,
          amount: Number.parseFloat(amount),
          orderType: orderType === "buy" ? { buy: null } : { sell: null },
          orderKind: { market: null },
        });
        toast.success(
          `Order placed! ${orderType === "buy" ? "Bought" : "Sold"} ${amount} ${selectedCoin} @ $${confirmation.price.toFixed(2)}`,
        );
        onOrderPlaced?.();
      } else {
        await new Promise((r) => setTimeout(r, 800));
        toast.success(
          `Order placed! ${orderType === "buy" ? "Bought" : "Sold"} ${amount} ${selectedCoin}`,
        );
      }
      setAmount("");
    } catch {
      toast.error("Failed to place order. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-3xl p-6 w-full max-w-sm mx-auto"
      style={{
        background: "#111B2A",
        border: "1px solid #1E2A3B",
        boxShadow:
          "0 4px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
      data-ocid="trading.widget.card"
    >
      <Tabs defaultValue="market" className="mb-5">
        <TabsList className="w-full" style={{ background: "#0B1626" }}>
          <TabsTrigger
            value="market"
            className="flex-1 text-sm"
            data-ocid="trading.market.tab"
          >
            Market
          </TabsTrigger>
          <TabsTrigger
            value="limit"
            className="flex-1 text-sm"
            data-ocid="trading.limit.tab"
          >
            Limit
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div
        className="flex rounded-xl overflow-hidden mb-5"
        style={{ background: "#0B1626" }}
      >
        {(["buy", "sell"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setOrderType(t)}
            className="flex-1 py-2.5 text-sm font-semibold capitalize transition-all duration-200"
            style={{
              background:
                orderType === t
                  ? t === "buy"
                    ? "#2ED47A"
                    : "#E35D6A"
                  : "transparent",
              color: orderType === t ? "#060B14" : "#9AA6B2",
              borderRadius: t === "buy" ? "10px 0 0 10px" : "0 10px 10px 0",
            }}
            data-ocid={`trading.${t}.toggle`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="mb-4">
        <label
          htmlFor="amount-input"
          className="block text-xs font-medium mb-2"
          style={{ color: "#9AA6B2" }}
        >
          I want to {orderType}
        </label>
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 text-sm"
            style={{
              background: "#0B1626",
              border: "1px solid #1E2A3B",
              color: "#F2F5FF",
            }}
            id="amount-input"
            data-ocid="trading.amount.input"
          />
          <Select value={selectedCoin} onValueChange={setSelectedCoin}>
            <SelectTrigger
              className="w-28 text-sm"
              style={{
                background: "#0B1626",
                border: "1px solid #1E2A3B",
                color: "#F2F5FF",
              }}
              data-ocid="trading.coin.select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
            >
              {coins.map((c) => (
                <SelectItem
                  key={c.symbol}
                  value={c.symbol}
                  style={{ color: "#F2F5FF" }}
                >
                  {c.symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div
        className="mb-5 px-3 py-2 rounded-xl"
        style={{ background: "#0B1626", border: "1px solid #1E2A3B" }}
      >
        <div className="flex justify-between items-center">
          <span className="text-xs" style={{ color: "#9AA6B2" }}>
            You will pay
          </span>
          <span className="text-sm font-semibold" style={{ color: "#F2F5FF" }}>
            ${fmt(usdCost, 2)} USD
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-200"
        style={{
          background: orderType === "buy" ? "#2ED47A" : "#E35D6A",
          color: "#060B14",
          opacity: isPending ? 0.7 : 1,
        }}
        data-ocid="trading.submit.button"
      >
        {isPending
          ? "Processing..."
          : `${orderType === "buy" ? "Buy" : "Sell"} ${selectedCoin}`}
      </button>
    </motion.div>
  );
}

// ── Hero section ──────────────────────────────────────────────────────────────
function HeroSection({
  featuredCoins: initialFeaturedCoins,
  loggedInUser,
  onDeposit,
  onWithdraw,
  onConvert,
  onCoinClick,
  actor: _actor,
  balance: balanceProp,
  onBalanceRefresh: _onBalanceRefresh,
}: {
  featuredCoins: typeof FALLBACK_FEATURED;
  loggedInUser?: string | null;
  onDeposit?: () => void;
  onWithdraw?: () => void;
  onConvert?: () => void;
  onCoinClick?: (symbol: string) => void;
  actor?: ReturnType<typeof useActor>["actor"];
  balance?: number;
  onBalanceRefresh?: () => void;
}) {
  const { coins: featuredCoins, priceDir } =
    useLiveFeaturedData(initialFeaturedCoins);
  const balance = balanceProp ?? 0;
  return (
    <section className="relative pt-20 pb-24 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6"
                style={{
                  background: "rgba(46,212,122,0.1)",
                  border: "1px solid rgba(46,212,122,0.2)",
                  color: "#2ED47A",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: "#2ED47A" }}
                />
                Live Trading Available
              </div>
              <h1
                className="text-5xl lg:text-6xl font-extrabold leading-tight mb-5"
                style={{ color: "#F2F5FF", letterSpacing: "-0.02em" }}
              >
                The Future of
                <br />
                <span style={{ color: "#2ED47A" }}>Digital Asset</span>
                <br />
                Trading
              </h1>
              <p
                className="text-lg mb-10 leading-relaxed"
                style={{ color: "#9AA6B2" }}
              >
                Access 500+ cryptocurrencies with institutional-grade security,
                real-time data, and lightning-fast execution on CRYPT0V.
              </p>
            </motion.div>
            {loggedInUser && balance !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl mb-6"
                style={{
                  background: "rgba(46,212,122,0.08)",
                  border: "1px solid rgba(46,212,122,0.2)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(46,212,122,0.15)" }}
                >
                  <Wallet size={16} style={{ color: "#2ED47A" }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: "#9AA6B2" }}>
                    Total Balance
                  </p>
                  <p
                    className="text-lg font-extrabold"
                    style={{ color: "#2ED47A" }}
                  >
                    $
                    {balance.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </motion.div>
            )}
            {loggedInUser ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="flex flex-wrap gap-3 mb-8"
              >
                <button
                  type="button"
                  onClick={onDeposit}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-200 hover:scale-105"
                  style={{
                    background: "rgba(46,212,122,0.15)",
                    border: "1px solid rgba(46,212,122,0.35)",
                    color: "#2ED47A",
                  }}
                  data-ocid="hero.deposit.button"
                >
                  <Wallet size={16} /> Deposit
                </button>
                <button
                  type="button"
                  onClick={onWithdraw}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-200 hover:scale-105"
                  style={{
                    background: "rgba(74,144,226,0.15)",
                    border: "1px solid rgba(74,144,226,0.35)",
                    color: "#4A90E2",
                  }}
                  data-ocid="hero.withdraw.button"
                >
                  <ArrowDownRight size={16} /> Withdraw
                </button>
                <button
                  type="button"
                  onClick={onConvert}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-200 hover:scale-105"
                  style={{
                    background: "rgba(147,112,219,0.15)",
                    border: "1px solid rgba(147,112,219,0.35)",
                    color: "#9370DB",
                  }}
                  data-ocid="hero.convert.button"
                >
                  <ArrowLeftRight size={16} /> Convert
                </button>
              </motion.div>
            ) : null}
            <div className="grid grid-cols-3 gap-3">
              {featuredCoins.slice(0, 3).map((coin, i) => (
                <MiniPriceCard
                  key={coin.symbol}
                  coin={coin}
                  index={i}
                  priceDir={priceDir[coin.symbol]}
                  onCoinClick={onCoinClick}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <TradingWidget coins={featuredCoins} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Market table ──────────────────────────────────────────────────────────────
function MarketRow({
  coin,
  index,
  priceDir,
  onCoinClick,
}: {
  coin: (typeof FALLBACK_MARKET)[0];
  index: number;
  priceDir?: "up" | "down" | null;
  onCoinClick?: (symbol: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isPos = coin.change24h >= 0;
  return (
    <tr
      className="transition-colors duration-150 cursor-pointer"
      style={{
        borderBottom: index < 9 ? "1px solid #1E2A3B" : "none",
        background: hovered ? "rgba(46,212,122,0.03)" : "transparent",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onCoinClick?.(coin.symbol)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onCoinClick?.(coin.symbol);
      }}
      tabIndex={0}
      data-ocid={`market.row.${index + 1}`}
    >
      <td className="px-6 py-4 text-sm" style={{ color: "#9AA6B2" }}>
        {index + 1}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: "#1E2A3B", color: "#2ED47A" }}
          >
            {coinIcon(coin.symbol)}
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: "#F2F5FF" }}>
              {coin.name}
            </div>
            <div className="text-xs" style={{ color: "#9AA6B2" }}>
              {coin.symbol}
            </div>
          </div>
        </div>
      </td>
      <td
        className="px-6 py-4 text-sm font-semibold transition-colors duration-300"
        style={{
          color:
            priceDir === "up"
              ? "#2ED47A"
              : priceDir === "down"
                ? "#FF4D4F"
                : "#F2F5FF",
        }}
      >
        ${coin.price >= 1 ? fmt(coin.price, 2) : fmt(coin.price, 4)}
      </td>
      <td className="px-6 py-4">
        <div
          className="flex items-center gap-1 text-sm font-semibold"
          style={{ color: isPos ? "#2ED47A" : "#E35D6A" }}
        >
          {isPos ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {isPos ? "+" : ""}
          {fmt(coin.change24h, 2)}%
        </div>
      </td>
      <td className="px-6 py-4 text-sm" style={{ color: "#9AA6B2" }}>
        {fmtCompact(coin.volume24h)}
      </td>
      <td className="px-6 py-4 text-sm" style={{ color: "#9AA6B2" }}>
        {fmtCompact(coin.marketCap)}
      </td>
    </tr>
  );
}

function MarketSection({
  coins: initialCoins,
  onCoinClick,
}: { coins: typeof FALLBACK_MARKET; onCoinClick?: (symbol: string) => void }) {
  const { coins, priceDir } = useLiveMarketData(initialCoins);
  return (
    <section className="py-20 px-6" id="markets">
      <div className="max-w-[1200px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div
            className="inline-block text-xs font-semibold uppercase tracking-widest mb-3 px-3 py-1 rounded-full"
            style={{
              color: "#2ED47A",
              background: "rgba(46,212,122,0.08)",
              border: "1px solid rgba(46,212,122,0.15)",
            }}
          >
            Market Overview
          </div>
          <h2
            className="text-3xl lg:text-4xl font-bold"
            style={{ color: "#F2F5FF" }}
          >
            Top Cryptocurrencies Today
          </h2>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
          data-ocid="market.table"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid #1E2A3B" }}>
                  {[
                    "#",
                    "Asset",
                    "Price",
                    "Change (24h)",
                    "Volume (24h)",
                    "Market Cap",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#9AA6B2" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coins.slice(0, 10).map((coin, i) => (
                  <MarketRow
                    key={coin.symbol}
                    coin={coin}
                    index={i}
                    priceDir={priceDir[coin.symbol]}
                    onCoinClick={onCoinClick}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ── Feature highlights ────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: BarChart2,
    title: "Advanced Trading Tools",
    desc: "Professional-grade charts, real-time order books, and advanced technical indicators for serious traders.",
  },
  {
    icon: Shield,
    title: "Secure & Compliant",
    desc: "Bank-grade encryption, multi-sig cold storage, and full regulatory compliance keep your assets safe.",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    desc: "Our dedicated support team is available around the clock to help with any questions or issues.",
  },
];

function FeatureCard({
  feature,
  index,
}: { feature: (typeof FEATURES)[0]; index: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="p-7 rounded-2xl transition-all duration-300"
      style={{
        background: "linear-gradient(135deg, #111B2A 0%, #0F1A28 100%)",
        border: hovered
          ? "1px solid rgba(46,212,122,0.3)"
          : "1px solid #1E2A3B",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-ocid={`features.card.${index + 1}`}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
        style={{
          background: "rgba(46,212,122,0.1)",
          border: "1px solid rgba(46,212,122,0.2)",
        }}
      >
        <feature.icon size={22} style={{ color: "#2ED47A" }} />
      </div>
      <h3 className="text-lg font-bold mb-3" style={{ color: "#F2F5FF" }}>
        {feature.title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: "#9AA6B2" }}>
        {feature.desc}
      </p>
    </motion.div>
  );
}

function FeaturesSection() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <div
            className="inline-block text-xs font-semibold uppercase tracking-widest mb-3 px-3 py-1 rounded-full"
            style={{
              color: "#2ED47A",
              background: "rgba(46,212,122,0.08)",
              border: "1px solid rgba(46,212,122,0.15)",
            }}
          >
            Feature Highlights
          </div>
          <h2
            className="text-3xl lg:text-4xl font-bold"
            style={{ color: "#F2F5FF" }}
          >
            Trade Smarter with <span style={{ color: "#2ED47A" }}>CRYPT0V</span>
          </h2>
        </motion.div>
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
const FOOTER_LINKS = {
  Company: ["About Us", "Careers", "Blog", "Press"],
  Products: ["Spot Trading", "Futures", "Earn", "NFT Marketplace"],
  Support: ["Help Center", "API Docs", "Status", "Contact"],
  Legal: ["Terms of Service", "Privacy Policy", "Cookie Policy", "Compliance"],
};

function FooterLink({ label }: { label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href="/"
      className="text-sm transition-colors duration-200"
      style={{ color: hovered ? "#2ED47A" : "#9AA6B2" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </a>
  );
}

function SocialIcon({
  Icon,
  label,
}: { Icon: React.ComponentType<{ size: number }>; label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href="/"
      aria-label={label}
      className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-200"
      style={{
        background: hovered ? "rgba(46,212,122,0.1)" : "#1E2A3B",
        color: hovered ? "#2ED47A" : "#9AA6B2",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Icon size={16} />
    </a>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer
      className="pt-16 pb-8 px-6"
      style={{ borderTop: "1px solid #1E2A3B" }}
    >
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black"
                style={{ background: "#2ED47A", color: "#060B14" }}
              >
                C
              </div>
              <span className="text-lg font-bold" style={{ color: "#F2F5FF" }}>
                CRYPT<span style={{ color: "#2ED47A" }}>0</span>V
              </span>
            </div>
            <p
              className="text-sm leading-relaxed mb-6"
              style={{ color: "#9AA6B2" }}
            >
              The next generation crypto exchange. Trade with confidence on the
              most secure platform.
            </p>
            <div className="flex gap-4">
              <SocialIcon Icon={SiX} label="Twitter" />
              <SocialIcon Icon={SiTelegram} label="Telegram" />
              <SocialIcon Icon={SiDiscord} label="Discord" />
              <SocialIcon Icon={SiLinkedin} label="LinkedIn" />
            </div>
          </div>
          {Object.entries(FOOTER_LINKS).map(([col, links]) => (
            <div key={col}>
              <h4
                className="text-sm font-semibold mb-4"
                style={{ color: "#F2F5FF" }}
              >
                {col}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <FooterLink label={link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8"
          style={{ borderTop: "1px solid #1E2A3B" }}
        >
          <p className="text-sm" style={{ color: "#9AA6B2" }}>
            &copy; {year} CRYPT0V. All rights reserved.
          </p>
          <p className="text-sm" style={{ color: "#9AA6B2" }}>
            Built with <span style={{ color: "#E35D6A" }}>❤️</span> using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors duration-200"
              style={{ color: "#2ED47A" }}
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardMarketTable({
  coins: initialCoins,
  onCoinClick,
}: { coins: typeof FALLBACK_MARKET; onCoinClick?: (symbol: string) => void }) {
  const { coins, priceDir } = useLiveMarketData(initialCoins);
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
      data-ocid="dashboard.market.table"
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid #1E2A3B" }}>
              {[
                "#",
                "Asset",
                "Price",
                "24h Change",
                "Volume",
                "Market Cap",
              ].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "#9AA6B2" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {coins.slice(0, 10).map((coin, i) => (
              <MarketRow
                key={coin.symbol}
                coin={coin}
                index={i}
                priceDir={priceDir[coin.symbol]}
                onCoinClick={onCoinClick}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DashboardView({
  username,
  coins,
  featuredCoins,
  onLogout,
  onUsernameChange,
  onCoinClick,
  balance: externalBalance,
}: {
  username: string;
  coins: typeof FALLBACK_MARKET;
  featuredCoins: typeof FALLBACK_FEATURED;
  onLogout: () => void;
  onUsernameChange?: (name: string) => void;
  onCoinClick?: (symbol: string) => void;
  balance?: number;
}) {
  const { actor } = useActor();
  const [orders, setOrders] = useState<OrderConfirmation[]>([]);
  const [binaryTrades, setBinaryTrades] = useState<BinaryTradeLocal[]>([]);

  const loadOrders = useCallback(async () => {
    if (!actor) return;
    try {
      const [result, binResult] = await Promise.all([
        (actor as any).getMyOrders() as Promise<OrderConfirmation[]>,
        (actor as any).getMyBinaryTrades() as Promise<BinaryTradeLocal[]>,
      ]);
      setOrders(result);
      setBinaryTrades(
        binResult.map((t: any) => ({
          ...t,
          direction:
            "long" in t.direction || t.direction === "long" ? "long" : "short",
          result: "win" in t.result || t.result === "win" ? "win" : "lose",
        })),
      );
    } catch {
      // silently ignore
    }
  }, [actor]);

  // Load orders when actor becomes available
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const totalBalance =
    externalBalance ?? HOLDINGS.reduce((sum, h) => sum + h.amount * h.price, 0);
  const totalPnl = HOLDINGS.reduce(
    (sum, h) => sum + (h.amount * h.price * h.change24h) / 100,
    0,
  );
  const isPnlPos = totalPnl >= 0;

  return (
    <AnimatePresence>
      <motion.div
        key="dashboard"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="min-h-screen px-4 lg:px-8 py-6"
        data-ocid="dashboard.page"
      >
        <div className="max-w-[1400px] mx-auto">
          {/* Dashboard header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1
                className="text-2xl font-extrabold"
                style={{ color: "#F2F5FF" }}
              >
                Welcome back,{" "}
                <span style={{ color: "#2ED47A" }}>{username}</span> 👋
              </h1>
              <p className="text-sm mt-1" style={{ color: "#9AA6B2" }}>
                Your portfolio at a glance —{" "}
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="sm:hidden px-4 py-2 text-sm font-medium rounded-lg border transition-colors duration-200"
              style={{
                borderColor: "#E35D6A",
                color: "#E35D6A",
                background: "transparent",
              }}
              data-ocid="dashboard.logout.button"
            >
              Log Out
            </button>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                label: "Total Balance",
                value: `$${fmt(totalBalance, 2)}`,
                sub: "USD",
                icon: Wallet,
                color: "#2ED47A",
              },
              {
                label: "24h P&L",
                value: `${isPnlPos ? "+" : ""}$${fmt(Math.abs(totalPnl), 2)}`,
                sub: `${isPnlPos ? "+" : ""}${fmt((totalPnl / totalBalance) * 100, 2)}%`,
                icon: isPnlPos ? ArrowUpRight : ArrowDownRight,
                color: isPnlPos ? "#2ED47A" : "#E35D6A",
              },
              {
                label: "Open Orders",
                value: "1",
                sub: "Pending",
                icon: History,
                color: "#4A90E2",
              },
              {
                label: "Assets",
                value: `${HOLDINGS.length}`,
                sub: "Holdings",
                icon: BarChart,
                color: "#9370DB",
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="rounded-2xl p-5"
                style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
                data-ocid={`dashboard.stat.card.${i + 1}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-xs font-medium uppercase tracking-wider"
                    style={{ color: "#9AA6B2" }}
                  >
                    {stat.label}
                  </span>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      background: `${stat.color}18`,
                      border: `1px solid ${stat.color}30`,
                    }}
                  >
                    <stat.icon size={15} style={{ color: stat.color }} />
                  </div>
                </div>
                <div
                  className="text-xl font-bold"
                  style={{
                    color:
                      stat.color === "#2ED47A" || stat.color === "#E35D6A"
                        ? stat.color
                        : "#F2F5FF",
                  }}
                >
                  {stat.value}
                </div>
                <div className="text-xs mt-1" style={{ color: "#9AA6B2" }}>
                  {stat.sub}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Main content: tabs + quick trade */}
          <div className="flex flex-col xl:flex-row gap-6">
            {/* Tabs panel */}
            <div className="flex-1 min-w-0">
              <Tabs defaultValue="portfolio">
                <TabsList
                  className="mb-6 h-11"
                  style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
                >
                  <TabsTrigger
                    value="portfolio"
                    className="gap-2 text-sm"
                    data-ocid="dashboard.portfolio.tab"
                  >
                    <Wallet size={14} />
                    Portfolio
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="gap-2 text-sm"
                    data-ocid="dashboard.history.tab"
                  >
                    <History size={14} />
                    History
                  </TabsTrigger>
                  <TabsTrigger
                    value="market"
                    className="gap-2 text-sm"
                    data-ocid="dashboard.market.tab"
                  >
                    <BarChart size={14} />
                    Market
                  </TabsTrigger>
                  <TabsTrigger
                    value="settings"
                    className="gap-2 text-sm"
                    data-ocid="dashboard.settings.tab"
                  >
                    <Settings size={14} />
                    Settings
                  </TabsTrigger>
                </TabsList>

                {/* Portfolio tab */}
                <TabsContent value="portfolio">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Balance card */}
                    <div
                      className="rounded-2xl p-6 mb-6"
                      style={{
                        background:
                          "linear-gradient(135deg, #111B2A 0%, #0F1A28 100%)",
                        border: "1px solid #1E2A3B",
                      }}
                      data-ocid="dashboard.portfolio.card"
                    >
                      <p
                        className="text-xs font-semibold uppercase tracking-widest mb-1"
                        style={{ color: "#9AA6B2" }}
                      >
                        Total Portfolio Value
                      </p>
                      <div className="flex items-end gap-4 flex-wrap">
                        <span
                          className="text-4xl font-extrabold"
                          style={{ color: "#F2F5FF" }}
                        >
                          ${fmt(totalBalance, 2)}
                        </span>
                        <span
                          className="text-sm font-medium mb-1"
                          style={{ color: "#9AA6B2" }}
                        >
                          USD
                        </span>
                        <span
                          className="text-sm font-semibold mb-1 px-2 py-0.5 rounded-lg"
                          style={{
                            background: isPnlPos
                              ? "rgba(46,212,122,0.12)"
                              : "rgba(227,93,106,0.12)",
                            color: isPnlPos ? "#2ED47A" : "#E35D6A",
                          }}
                        >
                          {isPnlPos ? "▲" : "▼"} {isPnlPos ? "+" : ""}
                          {fmt((totalPnl / totalBalance) * 100, 2)}% today
                        </span>
                      </div>
                    </div>

                    {/* Holdings table */}
                    <div
                      className="rounded-2xl overflow-hidden"
                      style={{
                        background: "#111B2A",
                        border: "1px solid #1E2A3B",
                      }}
                      data-ocid="dashboard.holdings.table"
                    >
                      <div
                        className="px-6 py-4"
                        style={{ borderBottom: "1px solid #1E2A3B" }}
                      >
                        <h3
                          className="text-sm font-semibold"
                          style={{ color: "#F2F5FF" }}
                        >
                          Your Holdings
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr style={{ borderBottom: "1px solid #1E2A3B" }}>
                              {[
                                "Asset",
                                "Amount",
                                "Current Price",
                                "Value",
                                "24h Change",
                              ].map((h) => (
                                <th
                                  key={h}
                                  className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                                  style={{ color: "#9AA6B2" }}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {HOLDINGS.map((h, i) => {
                              const value = h.amount * h.price;
                              const isPos = h.change24h >= 0;
                              return (
                                <tr
                                  key={h.symbol}
                                  style={{
                                    borderBottom:
                                      i < HOLDINGS.length - 1
                                        ? "1px solid #1E2A3B"
                                        : "none",
                                  }}
                                  data-ocid={`dashboard.holding.row.${i + 1}`}
                                >
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                                        style={{
                                          background: "#1E2A3B",
                                          color: "#2ED47A",
                                        }}
                                      >
                                        {coinIcon(h.symbol)}
                                      </div>
                                      <div>
                                        <div
                                          className="text-sm font-semibold"
                                          style={{ color: "#F2F5FF" }}
                                        >
                                          {h.name}
                                        </div>
                                        <div
                                          className="text-xs"
                                          style={{ color: "#9AA6B2" }}
                                        >
                                          {h.symbol}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td
                                    className="px-6 py-4 text-sm font-medium"
                                    style={{ color: "#F2F5FF" }}
                                  >
                                    {h.amount} {h.symbol}
                                  </td>
                                  <td
                                    className="px-6 py-4 text-sm"
                                    style={{ color: "#F2F5FF" }}
                                  >
                                    ${fmt(h.price, 2)}
                                  </td>
                                  <td
                                    className="px-6 py-4 text-sm font-semibold"
                                    style={{ color: "#F2F5FF" }}
                                  >
                                    ${fmt(value, 2)}
                                  </td>
                                  <td className="px-6 py-4">
                                    <div
                                      className="flex items-center gap-1 text-sm font-semibold"
                                      style={{
                                        color: isPos ? "#2ED47A" : "#E35D6A",
                                      }}
                                    >
                                      {isPos ? (
                                        <ArrowUpRight size={14} />
                                      ) : (
                                        <ArrowDownRight size={14} />
                                      )}
                                      {isPos ? "+" : ""}
                                      {fmt(h.change24h, 2)}%
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                </TabsContent>

                {/* History tab */}
                <TabsContent value="history">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div
                      className="rounded-2xl overflow-hidden"
                      style={{
                        background: "#111B2A",
                        border: "1px solid #1E2A3B",
                      }}
                      data-ocid="dashboard.history.table"
                    >
                      <div
                        className="px-6 py-4"
                        style={{ borderBottom: "1px solid #1E2A3B" }}
                      >
                        <h3
                          className="text-sm font-semibold"
                          style={{ color: "#F2F5FF" }}
                        >
                          Trade History
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr style={{ borderBottom: "1px solid #1E2A3B" }}>
                              {[
                                "Date",
                                "Pair",
                                "Type",
                                "Amount",
                                "Price",
                                "Total",
                                "Status",
                              ].map((h) => (
                                <th
                                  key={h}
                                  className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                                  style={{ color: "#9AA6B2" }}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {orders.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={7}
                                  className="px-5 py-10 text-center text-sm"
                                  style={{ color: "#9AA6B2" }}
                                  data-ocid="dashboard.history.empty_state"
                                >
                                  No trades yet. Place your first order above.
                                </td>
                              </tr>
                            ) : (
                              orders.map((t, i) => {
                                const isBuy = "buy" in t.orderType;
                                const dateStr = new Date(
                                  Number(t.timestamp / 1_000_000n),
                                ).toLocaleString();
                                return (
                                  <tr
                                    key={`${t.timestamp}-${t.coinSymbol}`}
                                    style={{
                                      borderBottom:
                                        i < orders.length - 1
                                          ? "1px solid #1E2A3B"
                                          : "none",
                                    }}
                                    data-ocid={`dashboard.history.row.${i + 1}`}
                                  >
                                    <td
                                      className="px-5 py-3.5 text-xs"
                                      style={{ color: "#9AA6B2" }}
                                    >
                                      {dateStr}
                                    </td>
                                    <td
                                      className="px-5 py-3.5 text-sm font-semibold"
                                      style={{ color: "#F2F5FF" }}
                                    >
                                      {t.coinSymbol}/USD
                                    </td>
                                    <td className="px-5 py-3.5">
                                      <Badge
                                        className="text-xs font-semibold"
                                        style={{
                                          background: isBuy
                                            ? "rgba(46,212,122,0.15)"
                                            : "rgba(227,93,106,0.15)",
                                          color: isBuy ? "#2ED47A" : "#E35D6A",
                                          border: `1px solid ${isBuy ? "rgba(46,212,122,0.3)" : "rgba(227,93,106,0.3)"}`,
                                        }}
                                      >
                                        {isBuy ? "BUY" : "SELL"}
                                      </Badge>
                                    </td>
                                    <td
                                      className="px-5 py-3.5 text-sm"
                                      style={{ color: "#F2F5FF" }}
                                    >
                                      {t.amount} {t.coinSymbol}
                                    </td>
                                    <td
                                      className="px-5 py-3.5 text-sm"
                                      style={{ color: "#F2F5FF" }}
                                    >
                                      ${fmt(t.price, 2)}
                                    </td>
                                    <td
                                      className="px-5 py-3.5 text-sm font-semibold"
                                      style={{ color: "#F2F5FF" }}
                                    >
                                      ${fmt(t.totalCost, 2)}
                                    </td>
                                    <td className="px-5 py-3.5">
                                      <Badge
                                        className="text-xs"
                                        style={{
                                          background: "rgba(46,212,122,0.1)",
                                          color: "#2ED47A",
                                          border:
                                            "1px solid rgba(46,212,122,0.25)",
                                        }}
                                      >
                                        Completed
                                      </Badge>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Binary Trades History */}
                    <div
                      className="rounded-2xl overflow-hidden mt-4"
                      style={{
                        background: "#111B2A",
                        border: "1px solid #1E2A3B",
                      }}
                      data-ocid="dashboard.binary.history.table"
                    >
                      <div
                        className="px-6 py-4 flex items-center gap-2"
                        style={{ borderBottom: "1px solid #1E2A3B" }}
                      >
                        <TrendingUp size={14} style={{ color: "#2ED47A" }} />
                        <h3
                          className="text-sm font-semibold"
                          style={{ color: "#F2F5FF" }}
                        >
                          Binary Options History
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr style={{ borderBottom: "1px solid #1E2A3B" }}>
                              {[
                                "Date",
                                "Pair",
                                "Direction",
                                "Duration",
                                "Amount",
                                "Profit %",
                                "P&L",
                                "Result",
                                "Tx ID",
                              ].map((h) => (
                                <th
                                  key={h}
                                  className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                                  style={{ color: "#9AA6B2" }}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {binaryTrades.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={9}
                                  className="px-5 py-10 text-center text-sm"
                                  style={{ color: "#9AA6B2" }}
                                  data-ocid="dashboard.binary.history.empty_state"
                                >
                                  No binary trades yet. Try the Binary Options
                                  panel in the Trade tab.
                                </td>
                              </tr>
                            ) : (
                              binaryTrades.map((t, i) => {
                                const isWin = t.result === "win";
                                const isLong = t.direction === "long";
                                const dateStr = new Date(
                                  Number(t.timestamp / 1_000_000n),
                                ).toLocaleString();
                                const durationLabel =
                                  t.durationSeconds <= 60n
                                    ? `${t.durationSeconds}s`
                                    : `${Number(t.durationSeconds) / 60}min`;
                                return (
                                  <tr
                                    key={String(t.id)}
                                    style={{
                                      borderBottom:
                                        i < binaryTrades.length - 1
                                          ? "1px solid #1E2A3B"
                                          : "none",
                                    }}
                                    data-ocid={`dashboard.binary.history.row.${i + 1}`}
                                  >
                                    <td
                                      className="px-5 py-3.5 text-xs"
                                      style={{ color: "#9AA6B2" }}
                                    >
                                      {dateStr}
                                    </td>
                                    <td
                                      className="px-5 py-3.5 text-sm font-semibold"
                                      style={{ color: "#F2F5FF" }}
                                    >
                                      {t.coinSymbol}/USD
                                    </td>
                                    <td className="px-5 py-3.5">
                                      <Badge
                                        className="text-xs font-semibold"
                                        style={{
                                          background: isLong
                                            ? "rgba(46,212,122,0.15)"
                                            : "rgba(227,93,106,0.15)",
                                          color: isLong ? "#2ED47A" : "#E35D6A",
                                          border: `1px solid ${isLong ? "rgba(46,212,122,0.3)" : "rgba(227,93,106,0.3)"}`,
                                        }}
                                      >
                                        {isLong ? "↑ LONG" : "↓ SHORT"}
                                      </Badge>
                                    </td>
                                    <td
                                      className="px-5 py-3.5 text-sm"
                                      style={{ color: "#F2F5FF" }}
                                    >
                                      {durationLabel}
                                    </td>
                                    <td
                                      className="px-5 py-3.5 text-sm"
                                      style={{ color: "#F2F5FF" }}
                                    >
                                      ${fmt(t.amount, 2)}
                                    </td>
                                    <td
                                      className="px-5 py-3.5 text-sm"
                                      style={{ color: "#4A90E2" }}
                                    >
                                      +{t.profitPercent}%
                                    </td>
                                    <td
                                      className="px-5 py-3.5 text-sm font-semibold"
                                      style={{
                                        color: isWin ? "#2ED47A" : "#E35D6A",
                                      }}
                                    >
                                      {isWin ? "+" : "-"}$
                                      {fmt(Math.abs(t.profitLoss), 2)}
                                    </td>
                                    <td className="px-5 py-3.5">
                                      <Badge
                                        className="text-xs font-semibold"
                                        style={{
                                          background: isWin
                                            ? "rgba(46,212,122,0.15)"
                                            : "rgba(227,93,106,0.15)",
                                          color: isWin ? "#2ED47A" : "#E35D6A",
                                          border: `1px solid ${isWin ? "rgba(46,212,122,0.3)" : "rgba(227,93,106,0.3)"}`,
                                        }}
                                      >
                                        {isWin ? "WIN" : "LOSS"}
                                      </Badge>
                                    </td>
                                    <td
                                      className="px-5 py-3.5 text-xs font-mono"
                                      style={{ color: "#9AA6B2" }}
                                    >
                                      {`TXN-${Math.abs(Number(t.id ?? 0))
                                        .toString(16)
                                        .toUpperCase()
                                        .padStart(8, "0")}-${String(t.id ?? 0)
                                        .slice(-5)
                                        .padStart(5, "0")}`}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                </TabsContent>

                {/* Market tab */}
                <TabsContent value="market">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <DashboardMarketTable
                      coins={coins}
                      onCoinClick={onCoinClick}
                    />
                  </motion.div>
                </TabsContent>

                {/* Settings tab */}
                <TabsContent value="settings">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <SettingsPanel
                      actor={actor}
                      onUsernameChange={onUsernameChange}
                    />
                  </motion.div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Quick Trade sidebar */}
            <div className="xl:w-80 flex-shrink-0">
              <div className="sticky top-24">
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-3"
                  style={{ color: "#9AA6B2" }}
                >
                  Quick Trade
                </p>
                <TradingWidget
                  coins={featuredCoins}
                  actor={actor}
                  onOrderPlaced={loadOrders}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Bottom Navigation ─────────────────────────────────────────────────────────
type BottomTab = "home" | "trade" | "assets" | "mining" | "profiles";

const BOTTOM_TABS: {
  key: BottomTab;
  label: string;
  icon: React.ElementType;
}[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "trade", label: "Trade", icon: BarChart2 },
  { key: "assets", label: "Assets", icon: Wallet },
  { key: "mining", label: "Mining", icon: Cpu },
  { key: "profiles", label: "Profiles", icon: User },
];

function BottomNav({
  activeTab,
  onTabChange,
}: {
  activeTab: BottomTab;
  onTabChange: (tab: BottomTab) => void;
}) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex items-stretch"
      style={{
        background: "#0D1521",
        borderTop: "1px solid #1E2A3B",
        zIndex: 100,
        height: 64,
      }}
      data-ocid="bottom_nav.panel"
    >
      {BOTTOM_TABS.map(({ key, label, icon: Icon }) => {
        const isActive = activeTab === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onTabChange(key)}
            className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors duration-200"
            style={{
              color: isActive ? "#2ED47A" : "#9AA6B2",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
            data-ocid={`bottom_nav.${key}.tab`}
          >
            <Icon
              size={20}
              style={{
                color: isActive ? "#2ED47A" : "#9AA6B2",
                transition: "color 0.2s",
              }}
            />
            <span
              className="text-xs font-medium"
              style={{
                color: isActive ? "#2ED47A" : "#9AA6B2",
                transition: "color 0.2s",
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function AssetsTab({
  coins: _coins,
  onCoinClick,
  actor: _actor2,
  loggedInUser: _loggedInUser,
  balance: realBalance = 0,
}: {
  coins: typeof FALLBACK_MARKET;
  onCoinClick?: (symbol: string) => void;
  actor?: ReturnType<typeof useActor>["actor"];
  loggedInUser?: string | null;
  balance?: number;
}) {
  return (
    <div className="min-h-screen px-4 lg:px-8 py-6" data-ocid="assets.page">
      <div className="max-w-4xl mx-auto">
        <h2
          className="text-2xl font-extrabold mb-6"
          style={{ color: "#F2F5FF" }}
        >
          My <span style={{ color: "#2ED47A" }}>Assets</span>
        </h2>
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Balance",
              value: `$${fmt(realBalance, 2)}`,
              sub: "USD",
              icon: Wallet,
              color: "#2ED47A",
            },
            {
              label: "24h P&L",
              value: "$0.00",
              sub: "+0.00%",
              icon: ArrowUpRight,
              color: "#2ED47A",
            },
            {
              label: "Open Orders",
              value: "1",
              sub: "Pending",
              icon: History,
              color: "#4A90E2",
            },
            {
              label: "Holdings",
              value: realBalance > 0 ? "1" : "0",
              sub: "Assets",
              icon: BarChart,
              color: "#9370DB",
            },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="rounded-2xl p-5"
              style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
              data-ocid={`assets.stat.card.${i + 1}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: "#9AA6B2" }}
                >
                  {stat.label}
                </span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: `${stat.color}18`,
                    border: `1px solid ${stat.color}30`,
                  }}
                >
                  <stat.icon size={15} style={{ color: stat.color }} />
                </div>
              </div>
              <div
                className="text-xl font-bold"
                style={{
                  color:
                    stat.color === "#4A90E2" || stat.color === "#9370DB"
                      ? "#F2F5FF"
                      : stat.color,
                }}
              >
                {stat.value}
              </div>
              <div className="text-xs mt-1" style={{ color: "#9AA6B2" }}>
                {stat.sub}
              </div>
            </div>
          ))}
        </div>
        {/* Holdings table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
        >
          <div
            className="px-5 py-4 border-b"
            style={{ borderColor: "#1E2A3B" }}
          >
            <h3 className="font-semibold text-sm" style={{ color: "#F2F5FF" }}>
              Holdings
            </h3>
          </div>
          <div className="divide-y" style={{ borderColor: "#1E2A3B" }}>
            {realBalance === 0 ? (
              <div
                className="px-5 py-10 text-center"
                style={{ color: "#9AA6B2" }}
                data-ocid="assets.empty_state"
              >
                No holdings yet. Deposit to get started.
              </div>
            ) : (
              <button
                type="button"
                className="flex w-full items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors bg-transparent border-0 text-left"
                onClick={() => onCoinClick?.("USDT")}
                data-ocid="assets.holding.item.1"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: "#0B1626",
                      border: "1px solid #1E2A3B",
                      color: "#2ED47A",
                    }}
                  >
                    💵
                  </div>
                  <div>
                    <div
                      className="text-sm font-semibold"
                      style={{ color: "#F2F5FF" }}
                    >
                      USDT
                    </div>
                    <div className="text-xs" style={{ color: "#9AA6B2" }}>
                      Tether USD
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="text-sm font-semibold"
                    style={{ color: "#F2F5FF" }}
                  >
                    ${fmt(realBalance, 2)}
                  </div>
                  <div className="text-xs" style={{ color: "#2ED47A" }}>
                    +0.00%
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const MINING_POOLS = [
  { name: "Antpool", hashrateShare: "28.4%", fee: "0%", workers: 142 },
  { name: "F2Pool", hashrateShare: "19.7%", fee: "2.5%", workers: 98 },
  { name: "ViaBTC", hashrateShare: "14.2%", fee: "2%", workers: 74 },
  { name: "Slush Pool", hashrateShare: "9.8%", fee: "2%", workers: 51 },
];

const REWARD_HISTORY = [
  {
    date: "Mar 24, 2026",
    amount: "0.00042",
    usd: "$28.31",
    status: "Confirmed",
  },
  {
    date: "Mar 23, 2026",
    amount: "0.00039",
    usd: "$26.29",
    status: "Confirmed",
  },
  {
    date: "Mar 22, 2026",
    amount: "0.00045",
    usd: "$30.34",
    status: "Confirmed",
  },
  {
    date: "Mar 21, 2026",
    amount: "0.00041",
    usd: "$27.64",
    status: "Confirmed",
  },
  {
    date: "Mar 20, 2026",
    amount: "0.00038",
    usd: "$25.62",
    status: "Confirmed",
  },
  {
    date: "Mar 19, 2026",
    amount: "0.00044",
    usd: "$29.66",
    status: "Confirmed",
  },
  {
    date: "Mar 18, 2026",
    amount: "0.00047",
    usd: "$31.69",
    status: "Confirmed",
  },
  { date: "Mar 17, 2026", amount: "0.00035", usd: "$23.60", status: "Pending" },
];

function MiningTab() {
  const [isMining, setIsMining] = useState(false);
  const [hashrate, setHashrate] = useState(142.3);
  const [uptime, setUptime] = useState("0h 0m");
  const [_uptimeSeconds, setUptimeSeconds] = useState(0);
  const [selectedPool, setSelectedPool] = useState("Antpool");

  // Simulate hashrate fluctuation when mining
  useEffect(() => {
    if (!isMining) return;
    const id = setInterval(() => {
      setHashrate((prev) =>
        Number.parseFloat((prev + (Math.random() - 0.5) * 2).toFixed(1)),
      );
      setUptimeSeconds((prev) => {
        const s = prev + 3;
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        setUptime(`${h}h ${m}m`);
        return s;
      });
    }, 3000);
    return () => clearInterval(id);
  }, [isMining]);

  const activePool =
    MINING_POOLS.find((p) => p.name === selectedPool) ?? MINING_POOLS[0];

  return (
    <div
      className="min-h-screen px-4 py-8 pb-24 overflow-y-auto"
      data-ocid="mining.page"
      style={{ background: "#0D1520" }}
    >
      <div className="max-w-[960px] mx-auto space-y-5">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3 mb-2"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(46,212,122,0.12)",
              border: "1px solid rgba(46,212,122,0.25)",
            }}
          >
            <Cpu size={20} style={{ color: "#2ED47A" }} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold" style={{ color: "#F2F5FF" }}>
              Mining Dashboard
            </h1>
            <p className="text-xs" style={{ color: "#9AA6B2" }}>
              Monitor your mining performance & rewards
            </p>
          </div>
        </motion.div>

        {/* Status + Hashrate row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center relative"
              style={{
                background: isMining
                  ? "rgba(46,212,122,0.12)"
                  : "rgba(255,77,79,0.1)",
                border: isMining
                  ? "1px solid rgba(46,212,122,0.3)"
                  : "1px solid rgba(255,77,79,0.3)",
              }}
            >
              <Cpu
                size={26}
                style={{ color: isMining ? "#2ED47A" : "#FF4D4F" }}
              />
              {isMining && (
                <span
                  className="absolute top-1 right-1 w-2 h-2 rounded-full animate-pulse"
                  style={{ background: "#2ED47A" }}
                />
              )}
            </div>
            <div>
              <div
                className="text-xs font-semibold uppercase tracking-widest mb-1"
                style={{ color: "#9AA6B2" }}
              >
                Status
              </div>
              <div
                className="text-lg font-extrabold"
                style={{ color: isMining ? "#2ED47A" : "#FF4D4F" }}
              >
                {isMining ? "Mining Active" : "Stopped"}
              </div>
              {isMining && (
                <div className="text-xs mt-0.5" style={{ color: "#9AA6B2" }}>
                  Uptime: {uptime}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div
                className="text-xs font-semibold uppercase tracking-widest mb-1"
                style={{ color: "#9AA6B2" }}
              >
                Hashrate
              </div>
              <div
                className="text-2xl font-extrabold"
                style={{ color: "#F2F5FF" }}
              >
                {isMining ? hashrate.toFixed(1) : "0.0"}
                <span
                  className="text-sm font-semibold ml-1"
                  style={{ color: "#9AA6B2" }}
                >
                  MH/s
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMining((v) => !v)}
              data-ocid="mining.toggle"
              className="px-6 py-3 rounded-xl text-sm font-bold transition-all duration-200"
              style={{
                background: isMining ? "rgba(255,77,79,0.12)" : "#2ED47A",
                border: isMining ? "1px solid rgba(255,77,79,0.4)" : "none",
                color: isMining ? "#FF4D4F" : "#0D1520",
              }}
            >
              {isMining ? "Stop Mining" : "Start Mining"}
            </button>
          </div>
        </motion.div>

        {/* Earnings row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-3 gap-4"
        >
          {[
            { label: "Today", amount: "0.00042 BTC", usd: "≈ $28.31" },
            { label: "This Week", amount: "0.00294 BTC", usd: "≈ $198.17" },
            { label: "This Month", amount: "0.01260 BTC", usd: "≈ $849.29" },
          ].map((item, i) => (
            <div
              key={item.label}
              className="rounded-2xl p-4"
              style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
              data-ocid={`mining.earnings.card.${i + 1}`}
            >
              <div
                className="text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: "#9AA6B2" }}
              >
                {item.label}
              </div>
              <div
                className="text-base font-extrabold"
                style={{ color: "#2ED47A" }}
              >
                {item.amount}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "#9AA6B2" }}>
                {item.usd}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Active pool + Pool picker */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="grid sm:grid-cols-2 gap-4"
        >
          {/* Active pool info */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
          >
            <div
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "#9AA6B2" }}
            >
              Active Pool
            </div>
            <div
              className="text-lg font-extrabold mb-3"
              style={{ color: "#F2F5FF" }}
            >
              {activePool.name}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Workers", value: String(activePool.workers) },
                { label: "Efficiency", value: "98.7%" },
                { label: "Fee", value: activePool.fee },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl p-2"
                  style={{ background: "#0D1520" }}
                >
                  <div
                    className="text-sm font-bold"
                    style={{ color: "#2ED47A" }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "#9AA6B2" }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pool selection */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
          >
            <div
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "#9AA6B2" }}
            >
              Select Pool
            </div>
            <div className="space-y-2">
              {MINING_POOLS.map((pool) => (
                <button
                  key={pool.name}
                  type="button"
                  onClick={() => setSelectedPool(pool.name)}
                  data-ocid="mining.pool.button"
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150"
                  style={{
                    background:
                      selectedPool === pool.name
                        ? "rgba(46,212,122,0.1)"
                        : "#0D1520",
                    border:
                      selectedPool === pool.name
                        ? "1px solid rgba(46,212,122,0.3)"
                        : "1px solid transparent",
                  }}
                >
                  <div className="flex items-center gap-2">
                    {selectedPool === pool.name && (
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: "#2ED47A" }}
                      />
                    )}
                    <span
                      className="text-sm font-semibold"
                      style={{
                        color:
                          selectedPool === pool.name ? "#2ED47A" : "#F2F5FF",
                      }}
                    >
                      {pool.name}
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-3 text-xs"
                    style={{ color: "#9AA6B2" }}
                  >
                    <span>{pool.hashrateShare}</span>
                    <span>Fee: {pool.fee}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Reward history table */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
          data-ocid="mining.rewards.table"
        >
          <div
            className="px-5 py-4 border-b"
            style={{ borderColor: "#1E2A3B" }}
          >
            <h3 className="text-sm font-bold" style={{ color: "#F2F5FF" }}>
              Reward History
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid #1E2A3B" }}>
                  {["Date", "Amount (BTC)", "USD Value", "Status"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#9AA6B2" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {REWARD_HISTORY.map((row, i) => (
                  <tr
                    key={row.date}
                    style={{
                      borderBottom:
                        i < REWARD_HISTORY.length - 1
                          ? "1px solid #1E2A3B"
                          : "none",
                    }}
                    data-ocid={`mining.rewards.item.${i + 1}`}
                  >
                    <td
                      className="px-5 py-3.5 text-sm"
                      style={{ color: "#9AA6B2" }}
                    >
                      {row.date}
                    </td>
                    <td
                      className="px-5 py-3.5 text-sm font-semibold"
                      style={{ color: "#2ED47A" }}
                    >
                      {row.amount}
                    </td>
                    <td
                      className="px-5 py-3.5 text-sm"
                      style={{ color: "#F2F5FF" }}
                    >
                      {row.usd}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          background:
                            row.status === "Confirmed"
                              ? "rgba(46,212,122,0.12)"
                              : "rgba(255,193,7,0.12)",
                          color:
                            row.status === "Confirmed" ? "#2ED47A" : "#FFC107",
                          border:
                            row.status === "Confirmed"
                              ? "1px solid rgba(46,212,122,0.25)"
                              : "1px solid rgba(255,193,7,0.25)",
                        }}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── Price Chart (TradingView) ─────────────────────────────────────────────────
const TIME_FRAMES: { label: string; vol: number }[] = [
  { label: "1H", vol: 0.002 },
  { label: "4H", vol: 0.004 },
  { label: "1D", vol: 0.008 },
  { label: "1W", vol: 0.016 },
];

const TV_SYMBOL_MAP: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
  BNB: "BNBUSDT",
  XRP: "XRPUSDT",
};

function PriceChart({
  symbol,
  price,
  change24h,
}: { symbol: string; price: number; change24h: number }) {
  const [tfIdx, setTfIdx] = useState(0);
  const isUp = change24h >= 0;
  const chartColor = isUp ? "#2ED47A" : "#E35D6A";
  const tvSymbol = TV_SYMBOL_MAP[symbol] ?? `${symbol}USDT`;

  return (
    <div className="flex flex-col gap-3" data-ocid="trade.chart.panel">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold" style={{ color: "#F2F5FF" }}>
              ${fmt(price, 2)}
            </span>
            <span
              className="text-sm font-semibold px-2 py-0.5 rounded-lg"
              style={{
                background: isUp
                  ? "rgba(46,212,122,0.12)"
                  : "rgba(227,93,106,0.12)",
                color: chartColor,
              }}
            >
              {isUp ? "+" : ""}
              {fmt(change24h, 2)}%
            </span>
          </div>
          <div className="text-xs mt-0.5" style={{ color: "#9AA6B2" }}>
            {symbol}/USDT · Live Chart
          </div>
        </div>
        <div className="flex gap-1">
          {TIME_FRAMES.map((tf, i) => (
            <button
              key={tf.label}
              type="button"
              onClick={() => setTfIdx(i)}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-200"
              style={{
                background: tfIdx === i ? chartColor : "rgba(255,255,255,0.04)",
                color: tfIdx === i ? "#060B14" : "#9AA6B2",
                border: "1px solid",
                borderColor: tfIdx === i ? chartColor : "#1E2A3B",
              }}
              data-ocid={`trade.chart.${tf.label.toLowerCase()}.tab`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* TradingView iframe */}
      <div
        style={{
          height: 500,
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #1E2A3B",
        }}
      >
        <iframe
          key={tvSymbol}
          src={`https://www.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=BINANCE:${tvSymbol}&interval=60&hidesidetoolbar=0&symboledit=1&saveimage=0&toolbarbg=111B2A&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&showpopupbutton=0&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=crypt0v&utm_medium=widget`}
          title={`${symbol} TradingView Chart`}
          width="100%"
          height="100%"
          style={{ border: "none", display: "block" }}
          allowFullScreen
        />
      </div>
    </div>
  );
}

// ── Order Book ────────────────────────────────────────────────────────────────
function generateOrderRows(price: number, side: "ask" | "bid", count = 8) {
  return Array.from({ length: count }, (_, i) => {
    const spread = side === "ask" ? (i + 1) * 0.0003 : -(i + 1) * 0.0003;
    const rowPrice = price * (1 + spread + (Math.random() - 0.5) * 0.0001);
    const amount = +(Math.random() * 4 + 0.05).toFixed(4);
    return { price: rowPrice, amount, total: rowPrice * amount };
  });
}

function OrderBook({ price }: { price: number }) {
  const [asks, setAsks] = useState(() => generateOrderRows(price, "ask"));
  const [bids, setBids] = useState(() => generateOrderRows(price, "bid"));

  useEffect(() => {
    const id = setInterval(() => {
      setAsks(generateOrderRows(price, "ask"));
      setBids(generateOrderRows(price, "bid"));
    }, 1500);
    return () => clearInterval(id);
  }, [price]);

  const Row = ({
    row,
    side,
  }: {
    row: { price: number; amount: number; total: number };
    side: "ask" | "bid";
  }) => (
    <div
      className="grid grid-cols-3 gap-1 py-1 px-2 text-xs font-mono rounded transition-colors duration-200"
      style={{ color: side === "ask" ? "#E35D6A" : "#2ED47A" }}
    >
      <span>${fmt(row.price, 2)}</span>
      <span className="text-right" style={{ color: "#9AA6B2" }}>
        {row.amount.toFixed(4)}
      </span>
      <span className="text-right" style={{ color: "#9AA6B2" }}>
        ${fmt(row.total, 2)}
      </span>
    </div>
  );

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2 h-full"
      style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
      data-ocid="trade.orderbook.panel"
    >
      {/* Title */}
      <div className="flex items-center gap-2 mb-1">
        <span className="relative flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: "#2ED47A" }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ background: "#2ED47A" }}
          />
        </span>
        <span className="text-sm font-semibold" style={{ color: "#F2F5FF" }}>
          Order Book
        </span>
      </div>
      {/* Column header */}
      <div
        className="grid grid-cols-3 gap-1 px-2 text-xs font-semibold"
        style={{ color: "#9AA6B2" }}
      >
        <span>Price</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Total</span>
      </div>
      {/* Asks */}
      <div className="flex flex-col-reverse gap-0.5">
        {asks.map((r) => (
          <Row key={r.price.toFixed(8)} row={r} side="ask" />
        ))}
      </div>
      {/* Mid price */}
      <div
        className="text-center text-sm font-bold py-1 rounded-xl"
        style={{ background: "rgba(46,212,122,0.08)", color: "#2ED47A" }}
      >
        ${fmt(price, 2)}
      </div>
      {/* Bids */}
      <div className="flex flex-col gap-0.5">
        {bids.map((r) => (
          <Row key={r.price.toFixed(8)} row={r} side="bid" />
        ))}
      </div>
    </div>
  );
}

// ── Trading Terminal ──────────────────────────────────────────────────────────
function TradingTerminal({
  coins,
  actor,
  onOrderPlaced,
  balance,
  onBalanceRefresh,
}: {
  coins: typeof FALLBACK_FEATURED;
  actor?: ReturnType<typeof useActor>["actor"];
  onOrderPlaced?: () => void;
  balance?: number;
  onBalanceRefresh?: () => void;
}) {
  const [selectedSymbol, setSelectedSymbol] = useState(
    coins[0]?.symbol ?? "BTC",
  );
  const coin = coins.find((c) => c.symbol === selectedSymbol) ?? coins[0];

  const [localBinaryTrades, setLocalBinaryTrades] = useState<
    BinaryTradeLocal[]
  >([]);

  useEffect(() => {
    if (!actor) return;
    (actor as any)
      .getMyBinaryTrades()
      .then((result: any[]) => {
        setLocalBinaryTrades(
          result.map((t: any) => ({
            ...t,
            direction:
              "long" in (t.direction ?? {}) || t.direction === "long"
                ? "long"
                : "short",
            result:
              "win" in (t.result ?? {}) || t.result === "win" ? "win" : "lose",
          })),
        );
      })
      .catch(() => {});
  }, [actor]);

  const handleTradeComplete = useCallback((trade: BinaryTradeLocal) => {
    setLocalBinaryTrades((prev) => [...prev, trade]);
  }, []);

  if (!coin) return null;

  return (
    <div
      className="flex flex-col gap-4 px-2 py-4 w-full"
      data-ocid="trade.page"
    >
      {/* Coin selector tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {coins.map((c) => (
          <button
            key={c.symbol}
            type="button"
            onClick={() => setSelectedSymbol(c.symbol)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0"
            style={{
              background:
                selectedSymbol === c.symbol
                  ? "rgba(46,212,122,0.12)"
                  : "#111B2A",
              border: "1px solid",
              borderColor: selectedSymbol === c.symbol ? "#2ED47A" : "#1E2A3B",
              color: selectedSymbol === c.symbol ? "#2ED47A" : "#9AA6B2",
            }}
            data-ocid={"trade.coin.tab"}
          >
            <span>{c.symbol}</span>
            <span
              className="text-xs"
              style={{ color: c.change24h >= 0 ? "#2ED47A" : "#E35D6A" }}
            >
              {c.change24h >= 0 ? "+" : ""}
              {fmt(c.change24h, 2)}%
            </span>
          </button>
        ))}
      </div>

      {/* Chart */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
      >
        <PriceChart
          symbol={coin.symbol}
          price={coin.price}
          change24h={coin.change24h}
        />
      </div>

      {/* Order Book + Trade Widget */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Order Book */}
        <div className="lg:w-[40%]">
          <OrderBook price={coin.price} />
        </div>
        {/* Trading Widget */}
        <div className="lg:w-[60%] flex items-start">
          <TradingWidget
            coins={coins}
            actor={actor}
            onOrderPlaced={onOrderPlaced}
          />
        </div>
      </div>

      {/* Binary Options Panel */}
      <BinaryOptionsPanel
        coinSymbol={coin.symbol}
        actor={actor}
        onTradeComplete={handleTradeComplete}
        balance={balance}
        onBalanceRefresh={onBalanceRefresh}
      />
      <RecentBinaryTradesLog trades={localBinaryTrades} />
    </div>
  );
}

// ── Binary Options Panel ─────────────────────────────────────────────────────
const DURATION_OPTIONS = [
  { label: "60s", seconds: 60, profit: 30 },
  { label: "120s", seconds: 120, profit: 50 },
  { label: "3min", seconds: 180, profit: 65 },
  { label: "6min", seconds: 360, profit: 80 },
  { label: "10min", seconds: 600, profit: 100 },
];

type ActiveBinaryTrade = {
  trade: BinaryTradeLocal;
  expiresAt: number; // Date.now() + durationSeconds*1000
};

function BinaryOptionsPanel({
  coinSymbol,
  actor,
  onTradeComplete,
  balance: balanceProp,
  onBalanceRefresh,
}: {
  coinSymbol: string;
  actor?: ReturnType<typeof useActor>["actor"];
  onTradeComplete?: (trade: BinaryTradeLocal) => void;
  balance?: number;
  onBalanceRefresh?: () => void;
}) {
  const [selectedDuration, setSelectedDuration] = useState(DURATION_OPTIONS[1]);
  const [amount, setAmount] = useState("");
  const balance = balanceProp ?? null;
  const [activeTrade, setActiveTrade] = useState<ActiveBinaryTrade | null>(
    null,
  );
  const [tradeResult, setTradeResult] = useState<BinaryTradeLocal | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!activeTrade) return;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((activeTrade.expiresAt - Date.now()) / 1000),
      );
      setCountdown(remaining);
      if (remaining === 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setTradeResult(activeTrade.trade);
        onTradeComplete?.(activeTrade.trade);
        setActiveTrade(null);
        onBalanceRefresh?.();
      }
    };
    tick();
    timerRef.current = setInterval(tick, 500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTrade, onBalanceRefresh, onTradeComplete]);

  const placeTrade = async (direction: "long" | "short") => {
    const amt = Number.parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!actor) {
      toast.error("Please log in first");
      return;
    }
    setIsLoading(true);
    try {
      const result = (await (actor as any).placeBinaryTrade(
        coinSymbol,
        direction === "long" ? { long: null } : { short: null },
        BigInt(selectedDuration.seconds),
        amt,
      )) as any;
      const tradeObj: BinaryTradeLocal = {
        id: result.id,
        coinSymbol: result.coinSymbol,
        amount: result.amount,
        profitPercent: result.profitPercent,
        durationSeconds: result.durationSeconds,
        timestamp: result.timestamp,
        direction,
        result: "win",
        profitLoss: result.profitLoss,
      };
      setActiveTrade({
        trade: tradeObj,
        expiresAt: Date.now() + selectedDuration.seconds * 1000,
      });
      setTradeResult(null);
      toast.success(`${direction === "long" ? "Long" : "Short"} trade placed!`);
      setAmount("");
      onBalanceRefresh?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Trade failed");
    } finally {
      setIsLoading(false);
    }
  };

  const potentialProfit =
    Number.parseFloat(amount) > 0
      ? (Number.parseFloat(amount) * selectedDuration.profit) / 100
      : 0;

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-4"
      style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
      data-ocid="binary.panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(46,212,122,0.15)",
              border: "1px solid rgba(46,212,122,0.25)",
            }}
          >
            <TrendingUp size={15} style={{ color: "#2ED47A" }} />
          </div>
          <span className="text-sm font-bold" style={{ color: "#F2F5FF" }}>
            Binary Options
          </span>
        </div>
        {balance !== null && (
          <span className="text-xs font-semibold" style={{ color: "#9AA6B2" }}>
            Balance:{" "}
            <span style={{ color: "#2ED47A" }}>${fmt(balance, 2)}</span>
          </span>
        )}
      </div>

      {/* Duration selector */}
      <div>
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: "#9AA6B2" }}
        >
          Duration &amp; Profit
        </p>
        <div className="grid grid-cols-5 gap-1.5">
          {DURATION_OPTIONS.map((opt) => {
            const isActive = selectedDuration.seconds === opt.seconds;
            return (
              <button
                key={opt.seconds}
                type="button"
                onClick={() => setSelectedDuration(opt)}
                className="flex flex-col items-center justify-center py-2 rounded-xl text-xs font-bold transition-all duration-150"
                style={{
                  background: isActive
                    ? "rgba(46,212,122,0.15)"
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isActive ? "#2ED47A" : "#1E2A3B"}`,
                  color: isActive ? "#2ED47A" : "#9AA6B2",
                }}
                data-ocid="binary.duration.tab"
              >
                <span>{opt.label}</span>
                <span
                  className="mt-0.5"
                  style={{
                    color: isActive ? "#2ED47A" : "#4A90E2",
                    fontSize: 10,
                  }}
                >
                  +{opt.profit}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Amount input */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "#9AA6B2" }}
          >
            Amount (USD)
          </p>
          {potentialProfit > 0 && (
            <span className="text-xs" style={{ color: "#4A90E2" }}>
              Profit: +${fmt(potentialProfit, 2)}
            </span>
          )}
        </div>
        <Input
          type="number"
          min="1"
          placeholder="Enter amount..."
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="text-sm"
          style={{
            background: "#060B14",
            border: "1px solid #1E2A3B",
            color: "#F2F5FF",
          }}
          data-ocid="binary.amount.input"
        />
      </div>

      {/* Long / Short buttons */}
      {!activeTrade && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => placeTrade("long")}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-extrabold transition-all duration-200 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg,#2ED47A,#1aad62)",
              color: "#060B14",
            }}
            data-ocid="binary.long.button"
          >
            <TrendingUp size={16} />
            LONG
          </button>
          <button
            type="button"
            onClick={() => placeTrade("short")}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-extrabold transition-all duration-200 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg,#E35D6A,#b8334e)",
              color: "#F2F5FF",
            }}
            data-ocid="binary.short.button"
          >
            <TrendingDown size={16} />
            SHORT
          </button>
        </div>
      )}

      {/* Active trade countdown — circular timer */}
      {activeTrade &&
        (() => {
          const totalSecs = Number(activeTrade.trade.durationSeconds);
          const progress = Math.max(0, countdown / totalSecs);
          const isLong = activeTrade.trade.direction === "long";
          const tradeColor = isLong ? "#2ED47A" : "#E35D6A";
          const r = 44;
          const circ = 2 * Math.PI * r;
          const dash = circ * progress;
          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl p-4 flex flex-col items-center gap-3"
              style={{
                background: "rgba(74,144,226,0.06)",
                border: "1px solid rgba(74,144,226,0.2)",
              }}
              data-ocid="binary.active.card"
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: tradeColor }}
                >
                  {isLong ? "↑ LONG" : "↓ SHORT"}
                </span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: "#F2F5FF" }}
                >
                  {activeTrade.trade.coinSymbol}/USD
                </span>
              </div>
              {/* SVG circular timer */}
              <div
                className="relative flex items-center justify-center"
                style={{ width: 110, height: 110 }}
              >
                <svg
                  width="110"
                  height="110"
                  role="img"
                  aria-label="Trade countdown timer"
                  style={{ transform: "rotate(-90deg)", position: "absolute" }}
                >
                  <circle
                    cx="55"
                    cy="55"
                    r={r}
                    fill="none"
                    stroke="#1E2A3B"
                    strokeWidth="7"
                  />
                  <circle
                    cx="55"
                    cy="55"
                    r={r}
                    fill="none"
                    stroke={tradeColor}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${circ}`}
                    style={{
                      transition: "stroke-dasharray 0.5s linear",
                      filter: `drop-shadow(0 0 6px ${tradeColor}88)`,
                    }}
                  />
                </svg>
                <div
                  className="flex flex-col items-center"
                  style={{ zIndex: 1 }}
                >
                  <span
                    className="text-3xl font-extrabold tabular-nums leading-none"
                    style={{ color: countdown <= 10 ? "#E35D6A" : "#F2F5FF" }}
                  >
                    {countdown}
                  </span>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: "#9AA6B2" }}
                  >
                    sec
                  </span>
                </div>
              </div>
              <div className="flex gap-4 text-xs w-full justify-center">
                <div>
                  <span style={{ color: "#9AA6B2" }}>Amount: </span>
                  <span className="font-semibold" style={{ color: "#F2F5FF" }}>
                    ${fmt(activeTrade.trade.amount, 2)}
                  </span>
                </div>
                <div>
                  <span style={{ color: "#9AA6B2" }}>Potential: </span>
                  <span className="font-semibold" style={{ color: "#2ED47A" }}>
                    +$
                    {fmt(
                      (activeTrade.trade.amount *
                        activeTrade.trade.profitPercent) /
                        100,
                      2,
                    )}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })()}

      {/* Trade result */}
      <AnimatePresence>
        {tradeResult &&
          (() => {
            const isWin = tradeResult.result === "win";
            const color = isWin ? "#2ED47A" : "#E35D6A";
            const txId = `TXN-${Math.abs(Number(tradeResult.id ?? 0))
              .toString(16)
              .toUpperCase()
              .padStart(
                8,
                "0",
              )}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
            const facts = isWin
              ? [
                  "Markets reward patience and precision.",
                  "Every winning trade is data for your edge.",
                  "Compound gains create exponential growth.",
                  "The best traders stay disciplined under pressure.",
                  "Smart risk management is the key to longevity.",
                ]
              : [
                  "Every loss is a lesson — review your strategy.",
                  "Risk management separates traders from gamblers.",
                  "The market gives and takes — stay level-headed.",
                  "Even the best traders lose. What matters is your system.",
                  "Cut losses short and let winners run.",
                ];
            const fact = facts[Math.floor(Math.random() * facts.length)];
            const now = new Date();
            const dateStr = now.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const timeStr = now.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
            return (
              <motion.div
                key={String(tradeResult.id)}
                initial={{ opacity: 0, scale: 0.93 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.93 }}
                transition={{ duration: 0.35 }}
                className="rounded-xl p-4"
                style={{
                  background: isWin
                    ? "rgba(46,212,122,0.08)"
                    : "rgba(227,93,106,0.08)",
                  border: `1px solid ${isWin ? "rgba(46,212,122,0.3)" : "rgba(227,93,106,0.3)"}`,
                }}
                data-ocid="binary.result.card"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl font-extrabold" style={{ color }}>
                    {isWin ? "🎉 WIN" : "❌ LOSS"}
                  </span>
                  <span className="text-lg font-extrabold" style={{ color }}>
                    {isWin ? "+" : "-"}$
                    {fmt(Math.abs(tradeResult.profitLoss), 2)}
                  </span>
                </div>
                {/* Details grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-3">
                  <div>
                    <span style={{ color: "#9AA6B2" }}>Direction </span>
                    <span
                      className="font-bold"
                      style={{
                        color:
                          tradeResult.direction === "long"
                            ? "#2ED47A"
                            : "#E35D6A",
                      }}
                    >
                      {tradeResult.direction === "long" ? "↑ LONG" : "↓ SHORT"}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#9AA6B2" }}>Coin </span>
                    <span
                      className="font-semibold"
                      style={{ color: "#F2F5FF" }}
                    >
                      {tradeResult.coinSymbol}/USD
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#9AA6B2" }}>Staked </span>
                    <span
                      className="font-semibold"
                      style={{ color: "#F2F5FF" }}
                    >
                      ${fmt(tradeResult.amount, 2)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "#9AA6B2" }}>Payout </span>
                    <span
                      className="font-semibold"
                      style={{ color: isWin ? "#2ED47A" : "#E35D6A" }}
                    >
                      {isWin ? `+${tradeResult.profitPercent}%` : "0%"}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span style={{ color: "#9AA6B2" }}>Date </span>
                    <span
                      className="font-semibold"
                      style={{ color: "#F2F5FF" }}
                    >
                      {dateStr} · {timeStr}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1">
                    <span style={{ color: "#9AA6B2" }}>TX </span>
                    <span
                      className="font-mono text-xs"
                      style={{ color: "#4A90E2" }}
                    >
                      {txId}
                    </span>
                  </div>
                </div>
                {/* Fact */}
                <div
                  className="rounded-lg px-3 py-2 mb-3 text-xs italic"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    color: "#9AA6B2",
                  }}
                >
                  "{fact}"
                </div>
                <button
                  type="button"
                  onClick={() => setTradeResult(null)}
                  className="w-full text-xs py-1.5 rounded-lg transition-opacity hover:opacity-70"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "#9AA6B2",
                  }}
                >
                  Dismiss
                </button>
              </motion.div>
            );
          })()}
      </AnimatePresence>
    </div>
  );
}

// ── Recent Binary Trades Log ─────────────────────────────────────────────────
function RecentBinaryTradesLog({ trades }: { trades: BinaryTradeLocal[] }) {
  if (trades.length === 0) return null;
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
      data-ocid="trade.binary.history"
    >
      <div
        className="px-5 py-3 flex items-center gap-2"
        style={{ borderBottom: "1px solid #1E2A3B" }}
      >
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: "#9AA6B2" }}
        >
          Binary Trade History
        </span>
        <span
          className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold"
          style={{
            background: "rgba(46,212,122,0.12)",
            color: "#2ED47A",
            border: "1px solid rgba(46,212,122,0.25)",
          }}
        >
          {trades.length} trade{trades.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid #1E2A3B" }}>
              {[
                "Date",
                "Pair",
                "Direction",
                "Duration",
                "Amount",
                "Payout",
                "P&L",
                "Result",
                "Tx ID",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "#9AA6B2" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...trades].reverse().map((t, i) => {
              const isWin = t.result === "win";
              const isLong = t.direction === "long";
              const dateStr = new Date(
                Number(t.timestamp / 1_000_000n),
              ).toLocaleString();
              const durationLabel =
                Number(t.durationSeconds) <= 60
                  ? `${t.durationSeconds}s`
                  : `${Number(t.durationSeconds) / 60}min`;
              const txId = `TXN-${Math.abs(Number(t.id ?? 0))
                .toString(16)
                .toUpperCase()
                .padStart(8, "0")}`;
              return (
                <tr
                  key={`${String(t.id)}-${t.timestamp}-${i}`}
                  data-ocid={`trade.binary.history.item.${i + 1}`}
                  style={{
                    borderBottom:
                      i < trades.length - 1 ? "1px solid #1E2A3B" : "none",
                  }}
                >
                  <td
                    className="px-4 py-3 text-xs"
                    style={{ color: "#9AA6B2" }}
                  >
                    {dateStr}
                  </td>
                  <td
                    className="px-4 py-3 text-sm font-semibold"
                    style={{ color: "#F2F5FF" }}
                  >
                    {t.coinSymbol}/USD
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{
                        background: isLong
                          ? "rgba(46,212,122,0.15)"
                          : "rgba(227,93,106,0.15)",
                        color: isLong ? "#2ED47A" : "#E35D6A",
                        border: `1px solid ${isLong ? "rgba(46,212,122,0.3)" : "rgba(227,93,106,0.3)"}`,
                      }}
                    >
                      {isLong ? "↑ LONG" : "↓ SHORT"}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 text-sm"
                    style={{ color: "#F2F5FF" }}
                  >
                    {durationLabel}
                  </td>
                  <td
                    className="px-4 py-3 text-sm"
                    style={{ color: "#F2F5FF" }}
                  >
                    ${fmt(t.amount, 2)}
                  </td>
                  <td
                    className="px-4 py-3 text-sm"
                    style={{ color: "#4A90E2" }}
                  >
                    +{t.profitPercent}%
                  </td>
                  <td
                    className="px-4 py-3 text-sm font-bold"
                    style={{ color: isWin ? "#2ED47A" : "#E35D6A" }}
                  >
                    {isWin
                      ? `+$${fmt(t.profitLoss, 2)}`
                      : `-$${fmt(Math.abs(t.profitLoss), 2)}`}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{
                        background: isWin
                          ? "rgba(46,212,122,0.15)"
                          : "rgba(227,93,106,0.15)",
                        color: isWin ? "#2ED47A" : "#E35D6A",
                        border: `1px solid ${isWin ? "rgba(46,212,122,0.3)" : "rgba(227,93,106,0.3)"}`,
                      }}
                    >
                      {isWin ? "WIN" : "LOSS"}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 text-xs font-mono"
                    style={{ color: "#9AA6B2" }}
                  >
                    {txId}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Settings Panel ───────────────────────────────────────────────────────────
const LANGUAGES = ["English", "Spanish", "French", "Chinese", "Arabic"];

function SettingsPanel({
  actor,
  onUsernameChange,
}: {
  actor: any;
  onUsernameChange?: (name: string) => void;
}) {
  const [language, setLanguage] = useState(
    () => localStorage.getItem("crypt0v_language") ?? "English",
  );
  const [newUsername, setNewUsername] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);

  const handleLanguageChange = (val: string) => {
    setLanguage(val);
    localStorage.setItem("crypt0v_language", val);
    toast.success("Language updated");
  };

  const handleSaveUsername = async () => {
    if (newUsername.trim().length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }
    setUsernameLoading(true);
    try {
      await (actor as any).updateUsername(newUsername.trim());
      toast.success("Username updated successfully");
      onUsernameChange?.(newUsername.trim());
      setNewUsername("");
    } catch {
      toast.error("Failed to update username");
    } finally {
      setUsernameLoading(false);
    }
  };

  const cardStyle = {
    background: "#111B2A",
    border: "1px solid #1E2A3B",
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  };

  return (
    <div className="max-w-xl" data-ocid="settings.panel">
      {/* Language */}
      <div style={cardStyle}>
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(74,144,226,0.12)",
              border: "1px solid rgba(74,144,226,0.2)",
            }}
          >
            <ChevronDown size={16} style={{ color: "#4A90E2" }} />
          </div>
          <h3 className="font-semibold" style={{ color: "#F2F5FF" }}>
            Language
          </h3>
        </div>
        <Select value={language} onValueChange={handleLanguageChange}>
          <SelectTrigger
            className="w-full"
            style={{
              background: "#060B14",
              border: "1px solid #1E2A3B",
              color: "#F2F5FF",
            }}
            data-ocid="settings.language.select"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
          >
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang} value={lang} style={{ color: "#F2F5FF" }}>
                {lang}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Change Username */}
      <div style={cardStyle}>
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(46,212,122,0.12)",
              border: "1px solid rgba(46,212,122,0.2)",
            }}
          >
            <User size={16} style={{ color: "#2ED47A" }} />
          </div>
          <h3 className="font-semibold" style={{ color: "#F2F5FF" }}>
            Change Username
          </h3>
        </div>
        <div className="flex gap-2">
          <Input
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder="New username (min 3 chars)"
            style={{
              background: "#060B14",
              border: "1px solid #1E2A3B",
              color: "#F2F5FF",
            }}
            data-ocid="settings.username.input"
          />
          <button
            type="button"
            onClick={handleSaveUsername}
            disabled={usernameLoading}
            className="px-5 py-2 rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-50"
            style={{ background: "#2ED47A", color: "#060B14" }}
            data-ocid="settings.username.save_button"
          >
            {usernameLoading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Password & Security */}
      <div style={cardStyle}>
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(227,93,106,0.12)",
              border: "1px solid rgba(227,93,106,0.2)",
            }}
          >
            <Lock size={16} style={{ color: "#E35D6A" }} />
          </div>
          <h3 className="font-semibold" style={{ color: "#F2F5FF" }}>
            Password & Security
          </h3>
        </div>
        <div
          className="rounded-xl p-4 mb-4"
          style={{
            background: "rgba(46,212,122,0.05)",
            border: "1px solid rgba(46,212,122,0.1)",
          }}
        >
          <div className="flex gap-2 mb-2">
            <CheckCircle
              size={16}
              style={{ color: "#2ED47A", flexShrink: 0, marginTop: 2 }}
            />
            <p className="text-sm" style={{ color: "#9AA6B2" }}>
              <span style={{ color: "#F2F5FF", fontWeight: 600 }}>
                CRYPT0V uses Internet Identity for authentication.
              </span>{" "}
              Your account is protected by public-key cryptography — no password
              required. To manage your Internet Identity security keys, visit
              identity.ic0.app
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.open("https://identity.ic0.app", "_blank")}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-200 hover:opacity-80"
          style={{
            background: "rgba(46,212,122,0.1)",
            border: "1px solid rgba(46,212,122,0.2)",
            color: "#2ED47A",
          }}
          data-ocid="settings.manage_ii.button"
        >
          <Shield size={16} /> Manage Internet Identity
        </button>
      </div>
    </div>
  );
}

// ── Spot Trading Section ──────────────────────────────────────────────────────
function SpotTradingSection({
  coins,
  onCoinClick,
}: {
  coins: typeof FALLBACK_FEATURED;
  onCoinClick?: (symbol: string) => void;
}) {
  const { coins: liveCoin, priceDir } = useLiveFeaturedData(coins);

  return (
    <section className="px-6 py-12">
      <div className="max-w-[1200px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h2
            className="text-3xl font-extrabold mb-1"
            style={{ color: "#F2F5FF" }}
          >
            Spot Trading
          </h2>
          <p className="text-sm" style={{ color: "#9AA6B2" }}>
            Instant buy & sell at market price
          </p>
        </motion.div>
        <div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
          data-ocid="spot.list"
        >
          {liveCoin.slice(0, 5).map((coin, i) => {
            const isUp = coin.change24h >= 0;
            const dir = priceDir[coin.symbol];
            return (
              <motion.div
                key={coin.symbol}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="rounded-2xl p-4 flex flex-col gap-3 cursor-pointer"
                style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
                data-ocid={`spot.item.${i + 1}`}
                onClick={() => onCoinClick?.(coin.symbol)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div
                      className="text-sm font-bold"
                      style={{ color: "#F2F5FF" }}
                    >
                      {coin.symbol}
                    </div>
                    <div className="text-xs" style={{ color: "#9AA6B2" }}>
                      {coin.name}
                    </div>
                  </div>
                  <div
                    className="text-xs font-semibold px-2 py-0.5 rounded-lg transition-colors duration-300"
                    style={{
                      background: isUp
                        ? "rgba(46,212,122,0.12)"
                        : "rgba(227,93,106,0.12)",
                      color: isUp ? "#2ED47A" : "#E35D6A",
                    }}
                  >
                    {isUp ? "+" : ""}
                    {fmt(coin.change24h, 2)}%
                  </div>
                </div>
                <div
                  className="text-lg font-extrabold transition-colors duration-500"
                  style={{
                    color:
                      dir === "up"
                        ? "#2ED47A"
                        : dir === "down"
                          ? "#E35D6A"
                          : "#F2F5FF",
                  }}
                >
                  ${fmt(coin.price, 2)}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      toast.success(`Buy order for ${coin.symbol} submitted!`)
                    }
                    className="py-2 rounded-lg text-xs font-bold transition-all duration-200 hover:opacity-80"
                    style={{
                      background: "rgba(46,212,122,0.15)",
                      color: "#2ED47A",
                      border: "1px solid rgba(46,212,122,0.25)",
                    }}
                    data-ocid={`spot.buy.button.${i + 1}`}
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      toast.success(`Sell order for ${coin.symbol} submitted!`)
                    }
                    className="py-2 rounded-lg text-xs font-bold transition-all duration-200 hover:opacity-80"
                    style={{
                      background: "rgba(227,93,106,0.15)",
                      color: "#E35D6A",
                      border: "1px solid rgba(227,93,106,0.25)",
                    }}
                    data-ocid={`spot.sell.button.${i + 1}`}
                  >
                    Sell
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Wallet Addresses ──────────────────────────────────────────────────────────
const WALLET_ADDRESSES: Record<string, string> = {
  BTC: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  ETH: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  SOL: "7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV1",
  BNB: "bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lx8xu7hx",
  XRP: "rN7n3473SaZBCG4dFL83w7PB5AMbq8HQkj",
  USDT: "0x47f2A4557BFE3f18bB91Ca04DE5Df0Cc71CE0F4D",
};

const FAKE_BALANCES: Record<string, number> = {
  BTC: 0.85,
  ETH: 4.2,
  SOL: 120.5,
  BNB: 15.3,
  XRP: 2800,
  USDT: 5420,
};

const COIN_OPTIONS = ["BTC", "ETH", "SOL", "BNB", "XRP", "USDT"];

// ── Deposit Modal ─────────────────────────────────────────────────────────────
function DepositModal({
  open,
  onOpenChange,
  actor,
  onBalanceChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  actor?: ReturnType<typeof useActor>["actor"];
  onBalanceChange?: () => void;
}) {
  const [coin, setCoin] = useState("BTC");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const address = WALLET_ADDRESSES[coin] ?? "";

  const copyAddress = () => {
    navigator.clipboard
      .writeText(address)
      .then(() => toast.success("Address copied!"));
  };

  const handleDeposit = async () => {
    const amt = Number.parseFloat(amount);
    if (!amount || Number.isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!actor) {
      toast.error("Please sign in to deposit");
      return;
    }
    setLoading(true);
    try {
      await (actor as any).addBalance(amt);
      toast.success(`$${amt.toFixed(2)} deposited to your account!`);
      setAmount("");
      onOpenChange(false);
      onBalanceChange?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Deposit failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{
          background: "#111B2A",
          border: "1px solid #1E2A3B",
          color: "#F2F5FF",
        }}
        data-ocid="deposit.modal"
      >
        <DialogHeader>
          <DialogTitle style={{ color: "#F2F5FF" }}>Deposit Crypto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label style={{ color: "#9AA6B2" }} className="text-xs mb-2 block">
              Select Coin
            </Label>
            <Select value={coin} onValueChange={setCoin}>
              <SelectTrigger
                style={{
                  background: "#060B14",
                  border: "1px solid #1E2A3B",
                  color: "#F2F5FF",
                }}
                data-ocid="deposit.coin.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
              >
                {COIN_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c} style={{ color: "#F2F5FF" }}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Fake QR */}
          <div className="flex justify-center">
            <div
              className="w-36 h-36 rounded-xl grid grid-cols-5 gap-1 p-3"
              style={{ background: "#fff" }}
            >
              <div
                key="qr0"
                className="rounded-sm"
                style={{ background: "#060B14" }}
              />
              <div
                key="qr1"
                className="rounded-sm"
                style={{ background: "#060B14" }}
              />
              <div
                key="qr2"
                className="rounded-sm"
                style={{ background: "#060B14" }}
              />
              <div
                key="qr3"
                className="rounded-sm"
                style={{ background: "#fff" }}
              />
              <div
                key="qr4"
                className="rounded-sm"
                style={{ background: "#fff" }}
              />
              <div
                key="qr5"
                className="rounded-sm"
                style={{ background: "#060B14" }}
              />
              <div
                key="qr6"
                className="rounded-sm"
                style={{ background: "#060B14" }}
              />
              <div
                key="qr7"
                className="rounded-sm"
                style={{ background: "#060B14" }}
              />
              <div
                key="qr8"
                className="rounded-sm"
                style={{ background: "#fff" }}
              />
              <div
                key="qr9"
                className="rounded-sm"
                style={{ background: "#fff" }}
              />
              <div
                key="qr10"
                className="rounded-sm"
                style={{ background: "#060B14" }}
              />
              <div
                key="qr11"
                className="rounded-sm"
                style={{ background: "#fff" }}
              />
              <div
                key="qr12"
                className="rounded-sm"
                style={{ background: "#060B14" }}
              />
              <div
                key="qr13"
                className="rounded-sm"
                style={{ background: "#fff" }}
              />
              <div
                key="qr14"
                className="rounded-sm"
                style={{ background: "#060B14" }}
              />
              <div
                key="qr15"
                className="rounded-sm"
                style={{ background: "#fff" }}
              />
              <div
                key="qr16"
                className="rounded-sm"
                style={{ background: "#fff" }}
              />
              <div
                key="qr17"
                className="rounded-sm"
                style={{ background: "#060B14" }}
              />
              <div
                key="qr18"
                className="rounded-sm"
                style={{ background: "#060B14" }}
              />
              <div
                key="qr19"
                className="rounded-sm"
                style={{ background: "#060B14" }}
              />
              <div
                key="qr20"
                className="rounded-sm"
                style={{ background: "#060B14" }}
              />
              <div
                key="qr21"
                className="rounded-sm"
                style={{ background: "#fff" }}
              />
              <div
                key="qr22"
                className="rounded-sm"
                style={{ background: "#060B14" }}
              />
              <div
                key="qr23"
                className="rounded-sm"
                style={{ background: "#fff" }}
              />
              <div
                key="qr24"
                className="rounded-sm"
                style={{ background: "#060B14" }}
              />
            </div>
          </div>
          <div>
            <Label style={{ color: "#9AA6B2" }} className="text-xs mb-2 block">
              Wallet Address
            </Label>
            <div className="flex gap-2">
              <div
                className="flex-1 px-3 py-2 rounded-xl text-xs font-mono overflow-hidden text-ellipsis"
                style={{
                  background: "#060B14",
                  border: "1px solid #1E2A3B",
                  color: "#F2F5FF",
                }}
              >
                {address}
              </div>
              <button
                type="button"
                onClick={copyAddress}
                className="px-3 py-2 rounded-xl transition-all duration-200 hover:opacity-80"
                style={{
                  background: "rgba(46,212,122,0.15)",
                  border: "1px solid rgba(46,212,122,0.3)",
                  color: "#2ED47A",
                }}
                data-ocid="deposit.copy.button"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
          <div>
            <Label style={{ color: "#9AA6B2" }} className="text-xs mb-2 block">
              Amount (USD)
            </Label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              type="number"
              min="0"
              style={{
                background: "#060B14",
                border: "1px solid #1E2A3B",
                color: "#F2F5FF",
              }}
              data-ocid="deposit.amount.input"
            />
          </div>
          <div
            className="rounded-xl p-3 text-xs"
            style={{
              background: "rgba(46,212,122,0.05)",
              border: "1px solid rgba(46,212,122,0.1)",
              color: "#9AA6B2",
            }}
          >
            ⚠️ Send only <span style={{ color: "#2ED47A" }}>{coin}</span> to this
            address. Minimum deposit: 0.001
          </div>
          <button
            type="button"
            onClick={handleDeposit}
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 hover:opacity-80 disabled:opacity-50"
            style={{ background: "#2ED47A", color: "#060B14" }}
            data-ocid="deposit.submit.button"
          >
            {loading ? "Processing..." : "Confirm Deposit"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Withdraw Modal ────────────────────────────────────────────────────────────
function WithdrawModal({
  open,
  onOpenChange,
  actor,
  onBalanceChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  actor?: ReturnType<typeof useActor>["actor"];
  onBalanceChange?: () => void;
}) {
  const [coin, setCoin] = useState("BTC");
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleWithdraw = async () => {
    const amt = Number.parseFloat(amount);
    if (!address.trim() || !amount || Number.isNaN(amt) || amt <= 0) {
      toast.error("Please fill in all fields");
      return;
    }
    if (!actor) {
      toast.error("Please sign in to withdraw");
      return;
    }
    setLoading(true);
    try {
      await (actor as any).deductBalance(amt);
      toast.success(
        `$${amt.toFixed(2)} withdrawal submitted. Amount will be deducted shortly.`,
      );
      setAddress("");
      setAmount("");
      onOpenChange(false);
      onBalanceChange?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Withdrawal failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{
          background: "#111B2A",
          border: "1px solid #1E2A3B",
          color: "#F2F5FF",
        }}
        data-ocid="withdraw.modal"
      >
        <DialogHeader>
          <DialogTitle style={{ color: "#F2F5FF" }}>
            Withdraw Crypto
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label style={{ color: "#9AA6B2" }} className="text-xs mb-2 block">
              Select Coin
            </Label>
            <Select value={coin} onValueChange={setCoin}>
              <SelectTrigger
                style={{
                  background: "#060B14",
                  border: "1px solid #1E2A3B",
                  color: "#F2F5FF",
                }}
                data-ocid="withdraw.coin.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
              >
                {COIN_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c} style={{ color: "#F2F5FF" }}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div
            className="text-xs rounded-xl p-2"
            style={{
              background: "rgba(74,144,226,0.08)",
              border: "1px solid rgba(74,144,226,0.15)",
              color: "#4A90E2",
            }}
          >
            Available: {FAKE_BALANCES[coin]} {coin}
          </div>
          <div>
            <Label style={{ color: "#9AA6B2" }} className="text-xs mb-2 block">
              Recipient Address
            </Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter wallet address"
              style={{
                background: "#060B14",
                border: "1px solid #1E2A3B",
                color: "#F2F5FF",
              }}
              data-ocid="withdraw.address.input"
            />
          </div>
          <div>
            <Label style={{ color: "#9AA6B2" }} className="text-xs mb-2 block">
              Amount
            </Label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              type="number"
              style={{
                background: "#060B14",
                border: "1px solid #1E2A3B",
                color: "#F2F5FF",
              }}
              data-ocid="withdraw.amount.input"
            />
          </div>
          <button
            type="button"
            onClick={handleWithdraw}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 hover:opacity-80"
            style={{ background: "#4A90E2", color: "#fff" }}
            data-ocid="withdraw.submit.button"
            disabled={loading}
          >
            {loading ? "Processing..." : "Withdraw"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Convert Modal ─────────────────────────────────────────────────────────────
const COIN_PRICES: Record<string, number> = {
  BTC: 67420,
  ETH: 3580,
  SOL: 172,
  BNB: 580,
  XRP: 0.62,
  USDT: 1,
};

function ConvertModal({
  open,
  onOpenChange,
  coins,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  coins: typeof FALLBACK_FEATURED;
}) {
  const [fromCoin, setFromCoin] = useState("BTC");
  const [toCoin, setToCoin] = useState("ETH");
  const [fromAmount, setFromAmount] = useState("");

  const fromPrice =
    coins.find((c) => c.symbol === fromCoin)?.price ??
    COIN_PRICES[fromCoin] ??
    1;
  const toPrice =
    coins.find((c) => c.symbol === toCoin)?.price ?? COIN_PRICES[toCoin] ?? 1;
  const estimated =
    fromAmount && !Number.isNaN(Number(fromAmount))
      ? (Number(fromAmount) * fromPrice) / toPrice
      : 0;

  const handleConvert = () => {
    if (
      !fromAmount ||
      Number.isNaN(Number(fromAmount)) ||
      Number(fromAmount) <= 0
    ) {
      toast.error("Enter a valid amount");
      return;
    }
    toast.success("Conversion submitted");
    setFromAmount("");
    onOpenChange(false);
  };

  const swap = () => {
    setFromCoin(toCoin);
    setToCoin(fromCoin);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{
          background: "#111B2A",
          border: "1px solid #1E2A3B",
          color: "#F2F5FF",
        }}
        data-ocid="convert.modal"
      >
        <DialogHeader>
          <DialogTitle style={{ color: "#F2F5FF" }}>Convert</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label style={{ color: "#9AA6B2" }} className="text-xs mb-2 block">
              From
            </Label>
            <div className="flex gap-2">
              <Select value={fromCoin} onValueChange={setFromCoin}>
                <SelectTrigger
                  className="w-28"
                  style={{
                    background: "#060B14",
                    border: "1px solid #1E2A3B",
                    color: "#F2F5FF",
                  }}
                  data-ocid="convert.from.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
                >
                  {COIN_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c} style={{ color: "#F2F5FF" }}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.00"
                type="number"
                style={{
                  background: "#060B14",
                  border: "1px solid #1E2A3B",
                  color: "#F2F5FF",
                }}
                data-ocid="convert.amount.input"
              />
            </div>
          </div>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={swap}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:rotate-180"
              style={{
                background: "rgba(147,112,219,0.15)",
                border: "1px solid rgba(147,112,219,0.3)",
                color: "#9370DB",
              }}
              data-ocid="convert.swap.button"
            >
              <ArrowLeftRight size={14} />
            </button>
          </div>
          <div>
            <Label style={{ color: "#9AA6B2" }} className="text-xs mb-2 block">
              To
            </Label>
            <Select value={toCoin} onValueChange={setToCoin}>
              <SelectTrigger
                style={{
                  background: "#060B14",
                  border: "1px solid #1E2A3B",
                  color: "#F2F5FF",
                }}
                data-ocid="convert.to.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
              >
                {COIN_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c} style={{ color: "#F2F5FF" }}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {estimated > 0 ? (
            <div
              className="rounded-xl p-3 text-sm"
              style={{
                background: "rgba(147,112,219,0.08)",
                border: "1px solid rgba(147,112,219,0.15)",
                color: "#9370DB",
              }}
            >
              ≈ {fmt(estimated, 6)} {toCoin}
            </div>
          ) : null}
          <button
            type="button"
            onClick={handleConvert}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 hover:opacity-80"
            style={{ background: "#9370DB", color: "#fff" }}
            data-ocid="convert.submit.button"
          >
            Convert
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Coin Detail Modal ─────────────────────────────────────────────────────────
function CoinDetailModal({
  coin,
  coins,
  actor,
  onClose,
  onOrderPlaced,
}: {
  coin: CoinData;
  coins: CoinData[];
  actor?: ReturnType<typeof useActor>["actor"];
  onClose: () => void;
  onOrderPlaced?: () => void;
}) {
  const { coins: liveCoins } = useLiveMarketData([coin]);
  const liveCoin = liveCoins[0] ?? coin;
  const isPos = liveCoin.change24h >= 0;
  // Map CoinData to featured format for TradingWidget
  const widgetCoins = coins.map((c) => ({
    symbol: c.symbol,
    name: c.name,
    price: c.price,
    change24h: c.change24h,
    volume24h: c.volume24h,
    marketCap: c.marketCap,
  }));

  return (
    <AnimatePresence>
      <motion.div
        key="coin-detail-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex flex-col"
        style={{ background: "#060B14" }}
        data-ocid="coin_detail.modal"
      >
        {/* Sticky Header */}
        <div
          className="flex items-center gap-4 px-4 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid #1E2A3B", background: "#0D1521" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors duration-200 hover:opacity-80 flex-shrink-0"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid #1E2A3B",
              color: "#9AA6B2",
            }}
            data-ocid="coin_detail.close_button"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0"
              style={{ background: "#1E2A3B", color: "#2ED47A" }}
            >
              {coinIcon(liveCoin.symbol)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-base font-extrabold"
                  style={{ color: "#F2F5FF" }}
                >
                  {liveCoin.name}
                </span>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-lg"
                  style={{ background: "#1E2A3B", color: "#9AA6B2" }}
                >
                  {liveCoin.symbol}/USDT
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                <span
                  className="text-lg font-extrabold"
                  style={{ color: "#F2F5FF" }}
                >
                  $
                  {liveCoin.price >= 1
                    ? fmt(liveCoin.price, 2)
                    : fmt(liveCoin.price, 4)}
                </span>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-lg"
                  style={{
                    background: isPos
                      ? "rgba(46,212,122,0.12)"
                      : "rgba(227,93,106,0.12)",
                    color: isPos ? "#2ED47A" : "#E35D6A",
                  }}
                >
                  {isPos ? "+" : ""}
                  {fmt(liveCoin.change24h, 2)}%
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hidden md:flex w-9 h-9 rounded-xl items-center justify-center transition-colors duration-200 hover:opacity-80 flex-shrink-0"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid #1E2A3B",
              color: "#9AA6B2",
            }}
            data-ocid="coin_detail.close_button"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: "24h High",
                  value: `$${fmt(liveCoin.price * 1.025, liveCoin.price >= 1 ? 2 : 4)}`,
                },
                {
                  label: "24h Low",
                  value: `$${fmt(liveCoin.price * 0.975, liveCoin.price >= 1 ? 2 : 4)}`,
                },
                {
                  label: "Volume (24h)",
                  value: fmtCompact(liveCoin.volume24h),
                },
                { label: "Market Cap", value: fmtCompact(liveCoin.marketCap) },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl p-3"
                  style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
                >
                  <div className="text-xs mb-1" style={{ color: "#9AA6B2" }}>
                    {stat.label}
                  </div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: "#F2F5FF" }}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
            >
              <PriceChart
                symbol={liveCoin.symbol}
                price={liveCoin.price}
                change24h={liveCoin.change24h}
              />
            </div>

            {/* Order Book + Trade Widget */}
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="lg:w-[45%]">
                <OrderBook price={liveCoin.price} />
              </div>
              <div className="lg:w-[55%]">
                <TradingWidget
                  coins={widgetCoins}
                  actor={actor}
                  onOrderPlaced={onOrderPlaced}
                  defaultCoin={liveCoin.symbol}
                />
              </div>
            </div>
          </div>
          {/* Bottom padding for mobile */}
          <div className="h-20" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const { data: allCoins = [] } = useAllCoins();
  const { data: featured = [] } = useFeaturedCoins();
  const [authModal, setAuthModal] = useState<AuthModal>("none");
  const [loggedInUser, setLoggedInUser] = useState<string | null>(
    () => localStorage.getItem("crypt0v_user") ?? null,
  );
  const [activeTab, setActiveTab] = useState<BottomTab>("home");
  const [selectedDetailCoin, setSelectedDetailCoin] = useState<string | null>(
    null,
  );
  const [homeModal, setHomeModal] = useState<
    "none" | "deposit" | "withdraw" | "convert"
  >("none");
  const { clear, identity } = useInternetIdentity();
  const { actor } = useActor();

  const [balance, setBalance] = useState<number>(0);
  const fetchBalance = useCallback(async () => {
    if (!actor || !loggedInUser) return;
    try {
      const bal = (await (actor as any).getMyBalance()) as number;
      setBalance(bal);
    } catch {
      /* ignore */
    }
  }, [actor, loggedInUser]);
  useEffect(() => {
    fetchBalance();
    if (!loggedInUser) return;
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, [fetchBalance, loggedInUser]);

  // Restore session: if identity is present on load, try to fetch profile
  useEffect(() => {
    if (!identity || !actor || loggedInUser) return;
    void (async () => {
      try {
        const profile = await actor.getCallerUserProfile();
        if (profile) {
          setLoggedInUser(profile.name);
          localStorage.setItem("crypt0v_user", profile.name);
        }
      } catch {
        // no profile, stay logged out
      }
    })();
  }, [identity, actor, loggedInUser]);

  const handleLogout = useCallback(() => {
    clear();
    setLoggedInUser(null);
    localStorage.removeItem("crypt0v_user");
    toast.success("You've been logged out.");
  }, [clear]);

  const featuredCoins = featured.length > 0 ? featured : FALLBACK_FEATURED;
  const marketCoins = allCoins.length > 0 ? allCoins : FALLBACK_MARKET;

  function renderContent() {
    switch (activeTab) {
      case "trade":
        return (
          <TradingTerminal
            coins={featuredCoins}
            actor={actor}
            balance={balance}
            onBalanceRefresh={fetchBalance}
          />
        );
      case "assets":
        return (
          <AssetsTab
            coins={marketCoins}
            onCoinClick={setSelectedDetailCoin}
            actor={actor}
            loggedInUser={loggedInUser}
            balance={balance}
          />
        );
      case "mining":
        return <MiningTab />;
      case "profiles":
        return loggedInUser ? (
          <DashboardView
            username={loggedInUser}
            coins={marketCoins}
            featuredCoins={featuredCoins}
            onLogout={handleLogout}
            onUsernameChange={(name) => {
              setLoggedInUser(name);
              localStorage.setItem("crypt0v_user", name);
            }}
            onCoinClick={setSelectedDetailCoin}
            balance={balance}
          />
        ) : (
          <div
            className="min-h-screen flex flex-col items-center justify-center gap-6 px-4"
            data-ocid="profiles.page"
          >
            <div
              className="rounded-3xl p-10 flex flex-col items-center gap-6 max-w-md w-full"
              style={{ background: "#111B2A", border: "1px solid #1E2A3B" }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: "rgba(46,212,122,0.1)",
                  border: "1px solid rgba(46,212,122,0.2)",
                }}
              >
                <User size={32} style={{ color: "#2ED47A" }} />
              </div>
              <h2 className="text-xl font-bold" style={{ color: "#F2F5FF" }}>
                Sign In to View Profile
              </h2>
              <p className="text-sm text-center" style={{ color: "#9AA6B2" }}>
                Connect your account to access your profile, portfolio, and
                trade history.
              </p>
              <button
                type="button"
                onClick={() => setAuthModal("signin")}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-200"
                style={{ background: "#2ED47A", color: "#060B14" }}
                data-ocid="profiles.signin.button"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthModal("register")}
                className="w-full py-3 rounded-xl text-sm font-semibold border transition-all duration-200"
                style={{
                  borderColor: "#1E2A3B",
                  color: "#9AA6B2",
                  background: "transparent",
                }}
                data-ocid="profiles.register.button"
              >
                Create Account
              </button>
            </div>
          </div>
        );
      default: // home
        return (
          <>
            <HeroSection
              featuredCoins={featuredCoins}
              loggedInUser={loggedInUser}
              onDeposit={() => setHomeModal("deposit")}
              onWithdraw={() => setHomeModal("withdraw")}
              onConvert={() => setHomeModal("convert")}
              onCoinClick={setSelectedDetailCoin}
              actor={actor}
              balance={balance}
              onBalanceRefresh={fetchBalance}
            />
            <SpotTradingSection
              coins={featuredCoins}
              onCoinClick={setSelectedDetailCoin}
            />
            <MarketSection
              coins={marketCoins}
              onCoinClick={setSelectedDetailCoin}
            />
            <FeaturesSection />
            <Footer />
          </>
        );
    }
  }

  return (
    <div style={{ background: "#060B14", minHeight: "100vh" }}>
      <SpaceBackground />
      <div className="relative z-10" style={{ paddingBottom: 80 }}>
        <Navbar
          onOpenRegister={() => setAuthModal("register")}
          onOpenSignIn={() => setAuthModal("signin")}
          loggedInUser={loggedInUser}
          onLogout={handleLogout}
        />
        <main>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      <Toaster theme="dark" />
      {selectedDetailCoin &&
        (() => {
          const detailCoin =
            marketCoins.find((c) => c.symbol === selectedDetailCoin) ??
            featuredCoins.find((c) => c.symbol === selectedDetailCoin);
          return detailCoin ? (
            <CoinDetailModal
              coin={detailCoin}
              coins={marketCoins}
              actor={actor}
              onClose={() => setSelectedDetailCoin(null)}
            />
          ) : null;
        })()}

      <RegisterModal
        open={authModal === "register"}
        onOpenChange={(v) => setAuthModal(v ? "register" : "none")}
        onSwitchToSignIn={() => setAuthModal("signin")}
        onRegistered={(name) => {
          setLoggedInUser(name);
          localStorage.setItem("crypt0v_user", name);
        }}
      />
      <SignInModal
        open={authModal === "signin"}
        onOpenChange={(v) => setAuthModal(v ? "signin" : "none")}
        onSwitchToRegister={() => setAuthModal("register")}
        onSignedIn={(name) => {
          setLoggedInUser(name);
          localStorage.setItem("crypt0v_user", name);
        }}
      />
      <DepositModal
        open={homeModal === "deposit"}
        onOpenChange={(v) => setHomeModal(v ? "deposit" : "none")}
        actor={actor}
        onBalanceChange={fetchBalance}
      />
      <WithdrawModal
        open={homeModal === "withdraw"}
        onOpenChange={(v) => setHomeModal(v ? "withdraw" : "none")}
        actor={actor}
        onBalanceChange={fetchBalance}
      />
      <ConvertModal
        open={homeModal === "convert"}
        onOpenChange={(v) => setHomeModal(v ? "convert" : "none")}
        coins={featuredCoins}
      />
    </div>
  );
}
