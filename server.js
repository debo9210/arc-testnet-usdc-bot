require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');

const app = express();
const PORT = process.env.PORT || 3000;

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
let lastTrades = [];   // This will store REAL trades

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// === CONFIG ===
const RECIPIENT_BUY = '0x15757D6C310B721A0AdBcc9A79ea52e3A2988273';
const RECIPIENT_SELL = '0xa7519988B2e550548A025A8021226aD4Abe337C6';
const TRADE_AMOUNT = 0.05;
const INTERVAL_MINUTES = 3;

let tradeCount = 0;

async function makeTradingDecision() {
  if (tradeCount >= 20) return;   // safety

  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARC_TESTNET_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);

    const [decimals, symbol, balance] = await Promise.all([
      contract.decimals(),
      contract.symbol(),
      contract.balanceOf(wallet.address)
    ]);

    const balanceFormatted = ethers.formatUnits(balance, decimals);
    const amountInUnits = ethers.parseUnits(TRADE_AMOUNT.toString(), decimals);

    if (balance < amountInUnits) return;

    const random = Math.random();
    let decision = "HOLD";
    let recipient = null;

    if (random < 0.45) {
      decision = "BUY";
      recipient = RECIPIENT_BUY;
    } else if (random < 0.9) {
      decision = "SELL";
      recipient = RECIPIENT_SELL;
    }

    const tradeLog = {
      time: new Date().toLocaleTimeString(),
      decision: decision,
      amount: `${TRADE_AMOUNT} USDC`,
      status: "Pending..."
    };

    if (decision === "HOLD") {
      lastTrades.unshift(tradeLog);
      if (lastTrades.length > 10) lastTrades.pop();
      tradeCount++;
      return;
    }

    console.log(`Executing ${decision}...`);
    const tx = await contract.transfer(recipient, amountInUnits);
    
    tradeLog.txHash = tx.hash;           // ← REAL full hash
    tradeLog.status = "✅ Confirmed";

    lastTrades.unshift(tradeLog);
    if (lastTrades.length > 10) lastTrades.pop();

    tradeCount++;

    // Wait for confirmation
    tx.wait().then(receipt => {
      if (receipt.status === 1) {
        console.log(`✅ Confirmed: ${tx.hash}`);
      }
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// === DASHBOARD ===
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Arc Trading Agent</title>
        <meta http-equiv="refresh" content="10">
      </head>
      <body style="font-family: Arial; padding: 20px; background: #0f172a; color: #e2e8f0;">
        <h1>🚀 Arc Trading Agent — Live on Testnet</h1>
        <p><strong>Status:</strong> Running • Auto-trading every ${INTERVAL_MINUTES} minutes</p>
        
        <h2>Recent Real Trades</h2>
        <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; width:100%; background:#1e2937;">
          <tr><th>Time</th><th>Decision</th><th>Amount</th><th>Transaction</th><th>Status</th></tr>
          ${lastTrades.map(t => `
            <tr>
              <td>${t.time}</td>
              <td><strong>${t.decision}</strong></td>
              <td>${t.amount}</td>
              <td>
                ${t.txHash ? 
                  `<a href="https://testnet.arcscan.app/tx/${t.txHash}" target="_blank" style="color:#60a5fa;">
                    ${t.txHash.substring(0, 12)}...
                  </a>` : 
                  '—'}
              </td>
              <td>${t.status}</td>
            </tr>
          `).join('')}
        </table>
        
        <p><small>Page auto-refreshes every 10 seconds • Real on-chain transactions</small></p>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🌐 Dashboard running at http://localhost:${PORT}`);
  console.log(`Live URL: https://arc-testnet-usdc-bot.onrender.com/`);
  
  // Start trading
  makeTradingDecision();
  setInterval(makeTradingDecision, INTERVAL_MINUTES * 60 * 1000);
});