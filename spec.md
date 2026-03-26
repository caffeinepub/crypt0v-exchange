# Crypt0v Exchange

## Current State
Balance fetched independently in HeroSection, AssetsTab, BinaryOptionsPanel, and DashboardView uses static HOLDINGS. No sync between tabs.

## Requested Changes (Diff)

### Add
- balance state + 5s poll in root App component
- onBalanceChange callbacks to DepositModal and WithdrawModal

### Modify
- HeroSection, AssetsTab, BinaryOptionsPanel: remove local balance state, accept balance/onBalanceRefresh props
- DashboardView: accept real balance prop

### Remove
- Duplicate balance fetching in child components

## Implementation Plan
1. Add balance state in App, poll every 5s when logged in
2. Pass balance/onBalanceRefresh down to all children
3. Deposit/Withdraw modals call onBalanceChange after success
4. Remove duplicated balance logic in children
