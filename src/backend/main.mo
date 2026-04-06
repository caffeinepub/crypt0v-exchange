import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Float "mo:core/Float";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinBlobStorage "blob-storage/Mixin";

actor {

  // ─── Access Control ───────────────────────────────────────────────────────
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinBlobStorage();

  // ─── Types ────────────────────────────────────────────────────────────────

  type AdminConfig = {
    phone : Text;
    kbzPay : Text;
  };

  type PdfEntry = {
    id : Text;
    name : Text;
    burmeseName : Text;
    price : Text;
    blobHash : Text;
    fileName : Text;
  };

  type Screenshot = {
    id : Text;
    name : Text;
    blobHash : Text;
    uploadedAt : Text;
    fulfilled : Bool;
  };

  type Coin = {
    symbol : Text;
    name : Text;
    price : Float;
    change24h : Float;
    volume24h : Float;
    marketCap : Float;
  };

  type UserProfile = {
    name : Text;
  };

  type OrderType = { #buy; #sell };
  type OrderKind = { #market; #limit : Float };

  type OrderRequest = {
    coinSymbol : Text;
    amount : Float;
    orderType : OrderType;
    orderKind : OrderKind;
  };

  type OrderConfirmation = {
    coinSymbol : Text;
    amount : Float;
    orderType : OrderType;
    orderKind : OrderKind;
    price : Float;
    totalCost : Float;
    timestamp : Int;
  };

  type TradeDirection = { #long; #short };
  type TradeResult = { #win; #lose };

  type BinaryTrade = {
    id : Nat;
    coinSymbol : Text;
    direction : TradeDirection;
    durationSeconds : Nat;
    profitPercent : Float;
    amount : Float;
    result : TradeResult;
    profitLoss : Float;
    timestamp : Int;
  };

  // ─── State ────────────────────────────────────────────────────────────────

  var adminConfig : AdminConfig = {
    phone = "09768125265";
    kbzPay = "Ye Yint Htun";
  };

  let pdfEntries = Map.empty<Text, PdfEntry>();
  let screenshots = Map.empty<Text, Screenshot>();

  // Crypto app state (kept for backward compatibility)
  let userProfiles = Map.empty<Principal, UserProfile>();
  let orderHistory = Map.empty<Principal, [OrderConfirmation]>();
  let userBalances = Map.empty<Principal, Float>();
  let binaryTradeHistory = Map.empty<Principal, [BinaryTrade]>();
  var nextTradeId : Nat = 0;

  let coins = Map.fromIter<Text, Coin>(
    [
      ("BTC", { symbol = "BTC"; name = "Bitcoin"; price = 70000.0; change24h = 2.5; volume24h = 35000000000.0; marketCap = 1100000000000.0 }),
      ("ETH", { symbol = "ETH"; name = "Ethereum"; price = 3500.0; change24h = 1.8; volume24h = 17000000000.0; marketCap = 420000000000.0 }),
      ("SOL", { symbol = "SOL"; name = "Solana"; price = 170.0; change24h = 3.1; volume24h = 2500000000.0; marketCap = 74000000000.0 }),
      ("BNB", { symbol = "BNB"; name = "Binance Coin"; price = 600.0; change24h = -0.9; volume24h = 1200000000.0; marketCap = 90000000000.0 }),
      ("XRP", { symbol = "XRP"; name = "Ripple"; price = 0.6; change24h = -1.2; volume24h = 900000000.0; marketCap = 32000000000.0 }),
      ("ADA", { symbol = "ADA"; name = "Cardano"; price = 0.4; change24h = 0.7; volume24h = 550000000.0; marketCap = 14000000000.0 }),
      ("DOGE", { symbol = "DOGE"; name = "Dogecoin"; price = 0.15; change24h = 4.2; volume24h = 800000000.0; marketCap = 20000000000.0 }),
      ("AVAX", { symbol = "AVAX"; name = "Avalanche"; price = 35.0; change24h = 2.3; volume24h = 450000000.0; marketCap = 13000000000.0 }),
      ("DOT", { symbol = "DOT"; name = "Polkadot"; price = 7.0; change24h = 1.6; volume24h = 300000000.0; marketCap = 9200000000.0 }),
      ("MATIC", { symbol = "MATIC"; name = "Polygon"; price = 0.8; change24h = -0.4; volume24h = 400000000.0; marketCap = 7400000000.0 }),
    ].values(),
  );

  // ─── Admin Config ────────────────────────────────────────────────────────

  public query func getAdminConfig() : async AdminConfig {
    adminConfig
  };

  public shared func saveAdminConfig(config : AdminConfig) : async () {
    adminConfig := config;
  };

  // ─── PDF Entries ─────────────────────────────────────────────────────────

  public query func getPdfEntries() : async [PdfEntry] {
    pdfEntries.values().toArray()
  };

  public shared func savePdfEntry(entry : PdfEntry) : async () {
    pdfEntries.add(entry.id, entry);
  };

  public shared func deletePdfEntry(id : Text) : async () {
    ignore pdfEntries.remove(id);
  };

  // ─── Screenshots ─────────────────────────────────────────────────────────

  public query func getScreenshots() : async [Screenshot] {
    screenshots.values().toArray()
  };

  public shared func saveScreenshot(screenshot : Screenshot) : async () {
    screenshots.add(screenshot.id, screenshot);
  };

  public shared func deleteScreenshot(id : Text) : async () {
    ignore screenshots.remove(id);
  };

  public shared func markScreenshotFulfilled(id : Text) : async () {
    switch (screenshots.get(id)) {
      case (?s) {
        screenshots.add(id, { s with fulfilled = true });
      };
      case null {};
    };
  };

  // ─── Crypto App Methods (backward compat) ────────────────────────────────

  func updateOrderHistory(caller : Principal, newOrder : OrderConfirmation) {
    let existing = switch (orderHistory.get(caller)) {
      case (?orders) { orders };
      case null { [] };
    };
    orderHistory.add(caller, existing.concat([newOrder]));
  };

  func getBalance(caller : Principal) : Float {
    switch (userBalances.get(caller)) {
      case (?balance) { balance };
      case null { 0.0 };
    };
  };

  func setBalance(caller : Principal, newBalance : Float) {
    userBalances.add(caller, newBalance);
  };

  func addBinaryTrade(caller : Principal, trade : BinaryTrade) {
    let existing = switch (binaryTradeHistory.get(caller)) {
      case (?trades) { trades };
      case null { [] };
    };
    binaryTradeHistory.add(caller, existing.concat([trade]));
  };

  func getProfitPercent(durationSeconds : Nat) : Float {
    switch (durationSeconds) {
      case 60 { 30.0 };
      case 120 { 50.0 };
      case 180 { 65.0 };
      case 360 { 80.0 };
      case 600 { 100.0 };
      case _ { Runtime.trap("Invalid duration") };
    };
  };

  public query ({ caller }) func getAllCoins() : async [Coin] {
    coins.values().toArray()
  };

  public query ({ caller }) func getCoin(symbol : Text) : async Coin {
    switch (coins.get(symbol)) {
      case (?coin) { coin };
      case null { Runtime.trap("Unknown coin: " # symbol) };
    };
  };

  public query ({ caller }) func searchCoins(searchTerm : Text) : async [Coin] {
    let lowercaseSearch = searchTerm.toLower();
    coins.values().filter(
      func(coin) {
        coin.name.toLower().contains(#text lowercaseSearch) or coin.symbol.toLower().contains(#text lowercaseSearch)
      }
    ).toArray()
  };

  public shared ({ caller }) func addBalance(amount : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add balance");
    };
    setBalance(caller, getBalance(caller) + amount);
  };

  public shared ({ caller }) func deductBalance(amount : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can deduct balance");
    };
    let currentBalance = getBalance(caller);
    if (currentBalance < amount) { Runtime.trap("Insufficient balance") };
    setBalance(caller, currentBalance - amount);
  };

  public query ({ caller }) func getMyBalance() : async Float {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    getBalance(caller)
  };

  public shared ({ caller }) func placeBinaryTrade(
    coinSymbol : Text,
    direction : TradeDirection,
    durationSeconds : Nat,
    amount : Float
  ) : async BinaryTrade {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (coins.get(coinSymbol)) {
      case null { Runtime.trap("Unknown coin: " # coinSymbol) };
      case (?_) {};
    };
    let profitPercent = getProfitPercent(durationSeconds);
    let currentBalance = getBalance(caller);
    let result : TradeResult = #win;
    let profitLoss : Float = amount + (amount * profitPercent / 100.0);
    setBalance(caller, currentBalance + profitLoss);
    let tradeId = nextTradeId;
    nextTradeId += 1;
    let trade : BinaryTrade = {
      id = tradeId;
      coinSymbol = coinSymbol;
      direction = direction;
      durationSeconds = durationSeconds;
      profitPercent = profitPercent;
      amount = amount;
      result = result;
      profitLoss = profitLoss;
      timestamp = Time.now();
    };
    addBinaryTrade(caller, trade);
    trade
  };

  public query ({ caller }) func getMyBinaryTrades() : async [BinaryTrade] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (binaryTradeHistory.get(caller)) {
      case (?trades) { trades };
      case null { [] };
    }
  };

  public shared ({ caller }) func updateUsername(newName : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let existing = switch (userProfiles.get(caller)) {
      case (?profile) { profile };
      case (null) { Runtime.trap("Profile not found") };
    };
    userProfiles.add(caller, { existing with name = newName });
  };

  public shared ({ caller }) func placeOrder(req : OrderRequest) : async OrderConfirmation {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let price = switch (coins.get(req.coinSymbol)) {
      case (?coin) { coin.price };
      case null { Runtime.trap("Unknown coin: " # req.coinSymbol) };
    };
    let executionPrice = switch (req.orderKind) {
      case (#market) { price };
      case (#limit(p)) { p };
    };
    let confirmation : OrderConfirmation = {
      coinSymbol = req.coinSymbol;
      amount = req.amount;
      orderType = req.orderType;
      orderKind = req.orderKind;
      price = executionPrice;
      totalCost = req.amount * executionPrice;
      timestamp = Time.now();
    };
    updateOrderHistory(caller, confirmation);
    confirmation
  };

  public query ({ caller }) func getMyOrders() : async [OrderConfirmation] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return [];
    };
    switch (orderHistory.get(caller)) {
      case (?orders) { orders };
      case null { [] };
    }
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.get(caller)
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.get(user)
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.add(caller, profile);
  };
};
