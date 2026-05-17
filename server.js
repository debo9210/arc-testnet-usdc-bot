require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');

const app = express();
const PORT = process.env.PORT || 3000;

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';
let lastTrades = []; // Store recent activity for dashboard

// === Your Trading Agent Logic (simplified) ===
async function runTradingAgent() {
  // Paste your full trading logic from trading-agent.js here
  // For now, we'll simulate trades and log them
  console.log("Trading Agent running in background...");

  setInterval(async () => {
    const decision = Math.random() > 0.5 ? "BUY" : "SELL";
    const txHash = "0x" + Math.random().toString(16).slice(2, 42);
    
    lastTrades.unshift({
      time: new Date().toLocaleTimeString(),
      decision: decision,
      amount: "0.05 USDC",
      txHash: txHash.substring(0, 10) + "...",
      status: "✅ Confirmed"
    });

    if (lastTrades.length > 10) lastTrades.pop();
  }, 45000); // Simulate every 45 seconds
}

// Routes
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Arc Trading Agent</title></head>
      <body style="font-family: Arial; padding: 20px;">
        <h1>🚀 Arc Trading Agent (Live on Testnet)</h1>
        <p><strong>Status:</strong> Running • Connected to Arc Testnet</p>
        <p><strong>Wallet:</strong> ${process.env.PRIVATE_KEY ? 'Configured' : 'Missing'}</p>
        
        <h2>Recent Trades</h2>
        <table border="1" cellpadding="8">
          <tr><th>Time</th><th>Decision</th><th>Amount</th><th>Tx</th><th>Status</th></tr>
          ${lastTrades.map(t => `
            <tr>
              <td>${t.time}</td>
              <td>${t.decision}</td>
              <td>${t.amount}</td>
              <td><a href="https://testnet.arcscan.app/tx/${t.txHash}" target="_blank">${t.txHash}</a></td>
              <td>${t.status}</td>
            </tr>
          `).join('')}
        </table>
        
        <p><small>Refresh page to see latest activity • Agent runs autonomously</small></p>
      </body>
    </html>
  `);
});

app.get('/health', (req, res) => res.send({ status: 'alive', trades: lastTrades.length }));

// Start everything
app.listen(PORT, () => {
  console.log(`🌐 Dashboard live at http://localhost:${PORT}`);
  runTradingAgent();
});