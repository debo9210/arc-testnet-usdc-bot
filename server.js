require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');

const app = express();
const PORT = process.env.PORT || 3000;

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
let lastTrades = [];
let isTradingEnabled = true;

const TOGGLE_PASSWORD = process.env.TOGGLE_PASSWORD || "arc12345";

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// === CONFIG ===
const RECIPIENT_BUY = '0x15757D6C310B721A0AdBcc9A79ea52e3A2988273';   // ← Update
const RECIPIENT_SELL = '0xa7519988B2e550548A025A8021226aD4Abe337C6'; // ← Update
const TRADE_AMOUNT = 0.05;
const INTERVAL_MINUTES = 3;

let tradeCount = 0;

async function makeTradingDecision() {
  console.log(`[${new Date().toLocaleTimeString()}] Agent cycle | Enabled: ${isTradingEnabled}`);

  if (!isTradingEnabled) return;
  if (tradeCount >= 30) return;

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
    console.log(`Balance: ${balanceFormatted} ${symbol}`);

    if (parseFloat(balanceFormatted) < TRADE_AMOUNT) {
      console.log("❌ Insufficient balance");
      return;
    }

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
    const tx = await contract.transfer(recipient, ethers.parseUnits(TRADE_AMOUNT.toString(), decimals));
    
    tradeLog.txHash = tx.hash;
    tradeLog.status = "✅ Confirmed";

    lastTrades.unshift(tradeLog);
    if (lastTrades.length > 10) lastTrades.pop();
    tradeCount++;

    tx.wait().then(() => console.log(`✅ Confirmed: ${tx.hash.substring(0,12)}...`));

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
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; background: #0f172a; color: #e2e8f0; }
          table { border-collapse: collapse; width: 100%; background: #1e2937; }
          th, td { padding: 12px; border: 1px solid #334155; }
          a { color: #60a5fa; }
          .admin { margin-top: 30px; padding: 15px; background: #1e2937; border-radius: 8px; }
        </style>
      </head>
      <body>
        <h1>🚀 Arc Trading Agent</h1>
        <p><strong>Status:</strong> ${isTradingEnabled ? '🟢 Trading ENABLED' : '🔴 Trading DISABLED'}</p>
        
        <h2>Recent Real Trades</h2>
        <table>
          <tr><th>Time</th><th>Decision</th><th>Amount</th><th>Transaction</th><th>Status</th></tr>
          ${lastTrades.map(t => `
            <tr>
              <td>${t.time}</td>
              <td><strong>${t.decision}</strong></td>
              <td>${t.amount}</td>
              <td>${t.txHash ? `<a href="https://testnet.arcscan.app/tx/${t.txHash}" target="_blank">${t.txHash.substring(0,12)}...</a>` : '—'}</td>
              <td>${t.status}</td>
            </tr>
          `).join('')}
        </table>

        <div class="admin">
          <h3>🔐 Admin Controls</h3>
          <form action="/toggle" method="POST">
            <input type="password" name="password" placeholder="Enter password" required style="padding:8px; width:250px;">
            <button type="submit" style="padding:8px 16px;">Toggle Trading ON/OFF</button>
          </form>
        </div>

        <p><small>Auto-refreshes every 10s</small></p>
      </body>
    </html>
  `);
});

app.post('/toggle', express.urlencoded({ extended: true }), (req, res) => {
  if (req.body.password === TOGGLE_PASSWORD) {
    isTradingEnabled = !isTradingEnabled;
    res.send(`<h2>Trading is now ${isTradingEnabled ? 'ENABLED ✅' : 'DISABLED ❌'}</h2><p><a href="/">← Back</a></p>`);
  } else {
    res.send(`<h2>❌ Wrong password</h2><p><a href="/">← Try again</a></p>`);
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Dashboard live at https://arc-testnet-usdc-bot.onrender.com/`);
  makeTradingDecision();
  setInterval(makeTradingDecision, INTERVAL_MINUTES * 60 * 1000);
});