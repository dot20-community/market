#!/bin/bash

set -e

# If $1 is frontend, then build the frontend
if [ "$1" = "frontend" ]; then
  echo "Building the frontend"
  cat <<EOF >.env
VITE_APP_URL="https://api.dot-20.xyz/trpc"
VITE_MARKET_ACCOUNT="12TXMUbBPt2N7SR6phqxUY6cRv8rJrGdwXpAotfELuR1UUDi"
VITE_POLKADOT_SCAN="https://polkadot.subscan.io"
VITE_POLKADOT_ENDPOINT="wss://rpc.polkadot.io"
VITE_POLKADOT_DECIMALS=10
VITE_MIN_SELL_TOTAL_PRICE=2
VITE_SERVER_FEE_RATE=0.02
EOF
  npm run build:frontend
fi
