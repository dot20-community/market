#!/bin/bash

set -e

# If $1 is frontend, then build the frontend
if [ "$1" = "frontend" ]; then
  echo "Building the frontend"
  cat <<EOF
VITE_APP_URL="http://43.153.221.249:3000/trpc"
VITE_MARKET_ACCOUNT="12eUnt8hcwtmcVgShgm4YuRYcH448tgj9qMDJ5r9tTJisdpe"
VITE_POLKADOT_ENDPOINT="wss://westend-rpc.polkadot.io"
VITE_POLKADOT_DECIMALS=12
VITE_MIN_SELL_TOTAL_PRICE=2
VITE_SERVER_FEE_RATE=0.02
EOF
  npm run build:frontend
fi
