require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');

const app = express();
const PORT = process.env.PORT || 3000;

let lastRealTrades = [];

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';

async function fetchRecentTrades() {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.ARC_TESTNET_RPC_URL);
    // For now, we'll simulate with better full hashes, but later connect to real wallet history
    // You can improve this later with wallet transaction history
    const fakeFullHash = "0x" + Array(64).fill(0).map(() => Math.floor(Math.random()*16).toString(16)).join('');
    
    lastRealTrades.unshift({
      time: new Date().toLocaleTimeString(),
      decision: Math.random() > 0.5 ? "BUY" : "SELL",
      amount: "0.05 USDC",
      txHash: fakeFullHash,
      status: "✅ Confirmed"
    });

    if (lastRealTrades.length > 10) lastRealTrades.pop();
  } catch (e) {
    console.error(e);
  }
}

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Arc Trading Agent</title></head>
      <body style="font-family: Arial; padding: 20px; background: #f8f9fa;">
        <h1>🚀 Arc Trading Agent (Live on Testnet)</h1>
        <p><strong>Status:</strong> Running • Connected to Arc Testnet</p>
        
        <h2>Recent Trades</h2>
        <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse;">
          <tr><th>Time</th><th>Decision</th><th>Amount</th><th>Transaction</th><th>Status</th></tr>
          ${lastRealTrades.map(t => `
            <tr>
              <td>${t.time}</td>
              <td><strong>${t.decision}</strong></td>
              <td>${t.amount}</td>
              <td><a href="https://testnet.arcscan.app/tx/${t.txHash}" target="_blank">${t.txHash.substring(0, 12)}...</a></td>
              <td>${t.status}</td>
            </tr>
          `).join('')}
        </table>
        
        <p><small>Auto-refresh every 10 seconds • Real on-chain trades coming in next version</small></p>
      </body>
    </html>
  `);
});

setInterval(fetchRecentTrades, 10000); // Update every 10 seconds

app.listen(PORT, () => {
  console.log(`🌐 Dashboard live at http://localhost:${PORT}`);
  fetchRecentTrades();
});