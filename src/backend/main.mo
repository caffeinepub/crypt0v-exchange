import Map "mo:core/Map";

import Principal "mo:core/Principal";
import Float "mo:core/Float";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Array "mo:core/Array";
import AccessControl "authorization/access-control";

import MixinAuthorization "authorization/MixinAuthorization";

// Use data migration to add new persistent fields to avoid data loss.
// Instead of merging the new code with persistent state directly, always upgrade first then do a regular deployment.

actor {
  // Types and Enums

  type Coin = {
    symbol : Text;
    name : Text;
    price : Float;
    change24h : Float;
    volume24h : Float;
    marketCap : Float;
  };

  module Coin {
    public func compareByPrice(coin1 : Coin, coin2 : Coin) : Order.Order {
      if (coin1.price < coin2.price) { #less } else if (coin1.price > coin2.price) { #greater } else { #equal };
    };
  };

  type UserProfile = {
    name : Text;
  };

  type OrderType = {
    #buy;
    #sell;
  };

  type OrderKind = {
    #market;
    #limit : Float;
  };

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

  type TradeDirection = {
    #long;
    #short;
  };

  type TradeResult = {
    #win;
    #lose;
  };

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

  type LoginConfirmation = {
    status : { #success };
  };

  // Actor State
  let accessControlState = AccessControl.initState();

  include MixinAuthorization(accessControlState);

  let userProfiles = Map.empty<Principal, UserProfile>();

  let orderHistory = Map.empty<Principal, [OrderConfirmation]>();

  let userBalances = Map.empty<Principal, Float>();

  let binaryTradeHistory = Map.empty<Principal, [BinaryTrade]>();

  var nextTradeId : Nat = 0;

  // Crypto market data (dummy data)
  let coins = Map.fromIter<Text, Coin>(
    [
      (
        "BTC",
        {
          symbol = "BTC";
          name = "Bitcoin";
          price = 70000.0;
          change24h = 2.5;
          volume24h = 35000000000.0;
          marketCap = 1100000000000.0;
        },
      ),
      (
        "ETH",
        {
          symbol = "ETH";
          name = "Ethereum";
          price = 3500.0;
          change24h = 1.8;
          volume24h = 17000000000.0;
          marketCap = 420000000000.0;
        },
      ),
      (
        "SOL",
        {
          symbol = "SOL";
          name = "Solana";
          price = 170.0;
          change24h = 3.1;
          volume24h = 2500000000.0;
          marketCap = 74000000000.0;
        },
      ),
      (
        "BNB",
        {
          symbol = "BNB";
          name = "Binance Coin";
          price = 600.0;
          change24h = -0.9;
          volume24h = 1200000000.0;
          marketCap = 90000000000.0;
        },
      ),
      (
        "XRP",
        {
          symbol = "XRP";
          name = "Ripple";
          price = 0.6;
          change24h = -1.2;
          volume24h = 900000000.0;
          marketCap = 32000000000.0;
        },
      ),
      (
        "ADA",
        {
          symbol = "ADA";
          name = "Cardano";
          price = 0.4;
          change24h = 0.7;
          volume24h = 550000000.0;
          marketCap = 14000000000.0;
        },
      ),
      (
        "DOGE",
        {
          symbol = "DOGE";
          name = "Dogecoin";
          price = 0.15;
          change24h = 4.2;
          volume24h = 800000000.0;
          marketCap = 20000000000.0;
        },
      ),
      (
        "AVAX",
        {
          symbol = "AVAX";
          name = "Avalanche";
          price = 35.0;
          change24h = 2.3;
          volume24h = 450000000.0;
          marketCap = 13000000000.0;
        },
      ),
      (
        "DOT",
        {
          symbol = "DOT";
          name = "Polkadot";
          price = 7.0;
          change24h = 1.6;
          volume24h = 300000000.0;
          marketCap = 9200000000.0;
        },
      ),
      (
        "MATIC",
        {
          symbol = "MATIC";
          name = "Polygon";
          price = 0.8;
          change24h = -0.4;
          volume24h = 400000000.0;
          marketCap = 7400000000.0;
        },
      ),
    ].values(),
  );

  // Helper Functions

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
      case _ { Runtime.trap("Invalid duration. Must be 60, 120, 180, 360, or 600 seconds") };
    };
  };

  // Public Query Methods

  public query ({ caller }) func getAllCoins() : async [Coin] {
    coins.values().toArray();
  };

  public query ({ caller }) func getCoin(symbol : Text) : async Coin {
    switch (coins.get(symbol)) {
      case (?coin) { coin };
      case null { Runtime.trap("Unknown coin: " # symbol) };
    };
  };

  public query ({ caller }) func searchCoins(searchTerm : Text) : async [Coin] {
    let lowercaseSearch = searchTerm.toLower();
    let filtered = coins.values().filter(
      func(coin) {
        coin.name.toLower().contains(#text lowercaseSearch) or coin.symbol.toLower().contains(#text lowercaseSearch);
      }
    );
    filtered.toArray();
  };

  // Balance Methods

  public shared ({ caller }) func addBalance(amount : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add balance");
    };
    let currentBalance = getBalance(caller);
    setBalance(caller, currentBalance + amount);
  };


  public shared ({ caller }) func deductBalance(amount : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can deduct balance");
    };
    let currentBalance = getBalance(caller);
    if (currentBalance < amount) {
      Runtime.trap("Insufficient balance");
    };
    setBalance(caller, currentBalance - amount);
  };

  public query ({ caller }) func getMyBalance() : async Float {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view balance");
    };
    getBalance(caller);
  };

  // Binary Trading Methods

  public shared ({ caller }) func placeBinaryTrade(
    coinSymbol : Text,
    direction : TradeDirection,
    durationSeconds : Nat,
    amount : Float
  ) : async BinaryTrade {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can place trades");
    };

    // Verify coin exists
    switch (coins.get(coinSymbol)) {
      case null { Runtime.trap("Unknown coin: " # coinSymbol) };
      case (?_) {};
    };

    let profitPercent = getProfitPercent(durationSeconds);
    let currentBalance = getBalance(caller);

    let result : TradeResult = switch (direction) {
      case (#long) { #win };
      case (#short) { #win };
    };

    let profitLoss : Float = switch (result) {
      case (#win) { amount + (amount * profitPercent / 100.0) };
      case (#lose) { -amount };
    };

    let newBalance = currentBalance + profitLoss;


    setBalance(caller, newBalance);

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
    trade;
  };

  public query ({ caller }) func getMyBinaryTrades() : async [BinaryTrade] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view trade history");
    };
    switch (binaryTradeHistory.get(caller)) {
      case (?trades) { trades };
      case null { [] };
    };
  };

  // User methods

  public shared ({ caller }) func updateUsername(newName : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let existing = switch (userProfiles.get(caller)) {
      case (?profile) { profile };
      case (null) { Runtime.trap("Profile not found") };
    };
    let updated : UserProfile = { existing with name = newName };
    userProfiles.add(caller, updated);
  };

  public shared ({ caller }) func placeOrder(req : OrderRequest) : async OrderConfirmation {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can place orders");
    };
    let price = switch (coins.get(req.coinSymbol)) {
      case (?coin) { coin.price };
      case null { Runtime.trap("Unknown coin: " # req.coinSymbol) };
    };
    let executionPrice = switch (req.orderKind) {
      case (#market) { price };
      case (#limit(p)) { p };
    };
    let totalCost = req.amount * executionPrice;
    let confirmation : OrderConfirmation = {
      coinSymbol = req.coinSymbol;
      amount = req.amount;
      orderType = req.orderType;
      orderKind = req.orderKind;
      price = executionPrice;
      totalCost = totalCost;
      timestamp = Time.now();
    };
    updateOrderHistory(caller, confirmation);
    confirmation;
  };

  public query ({ caller }) func getMyOrders() : async [OrderConfirmation] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return [];
    };
    switch (orderHistory.get(caller)) {
      case (?orders) { orders };
      case null { [] };
    };
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };
};
