import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface BinaryTrade {
    id: bigint;
    result: TradeResult;
    direction: TradeDirection;
    coinSymbol: string;
    profitLoss: number;
    durationSeconds: bigint;
    timestamp: bigint;
    amount: number;
    profitPercent: number;
}
export interface Coin {
    change24h: number;
    marketCap: number;
    name: string;
    volume24h: number;
    price: number;
    symbol: string;
}
export type OrderKind = {
    __kind__: "limit";
    limit: number;
} | {
    __kind__: "market";
    market: null;
};
export interface OrderConfirmation {
    coinSymbol: string;
    totalCost: number;
    orderKind: OrderKind;
    orderType: OrderType;
    timestamp: bigint;
    price: number;
    amount: number;
}
export interface UserProfile {
    name: string;
}
export interface OrderRequest {
    coinSymbol: string;
    orderKind: OrderKind;
    orderType: OrderType;
    amount: number;
}
export enum OrderType {
    buy = "buy",
    sell = "sell"
}
export enum TradeDirection {
    long_ = "long",
    short_ = "short"
}
export enum TradeResult {
    win = "win",
    lose = "lose"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addBalance(amount: number): Promise<void>;
    deductBalance(amount: number): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    getAllCoins(): Promise<Array<Coin>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCoin(symbol: string): Promise<Coin>;
    getMyBalance(): Promise<number>;
    getMyBinaryTrades(): Promise<Array<BinaryTrade>>;
    getMyOrders(): Promise<Array<OrderConfirmation>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    placeBinaryTrade(coinSymbol: string, direction: TradeDirection, durationSeconds: bigint, amount: number): Promise<BinaryTrade>;
    placeOrder(req: OrderRequest): Promise<OrderConfirmation>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchCoins(searchTerm: string): Promise<Array<Coin>>;
    updateUsername(newName: string): Promise<void>;
}
