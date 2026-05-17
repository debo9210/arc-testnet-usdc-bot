require('dotenv').config();
const { ethers } = require('ethers');

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// === CONFIGURATION ===
const RECIPIENT_BUY = '0x15757D6C310B721A0AdBcc9A79ea52e3A2988273';   // Simulate "buy" → send to this address
const RECIPIENT_SELL = '0xa7519988B2e550548A025A8021226aD4Abe337C6'; // Simulate "sell" → send here
const TRADE_AMOUNT = 0.05;           // USDC per trade (small for testnet)
const INTERVAL_MINUTES = 3;          // Trade decision every 3 minutes
const MAX_TRADES = 15;               // Safety stop

let tradeCount = 0;

async function makeTradingDecision() {
  if (tradeCount >= MAX_TRADES) {
    console.log('🏁 Max trades reached. Stopping Trading Agent.');
    process.exit(0);
  }

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

    if (balance < amountInUnits) {
      console.log('⚠️  Low balance. Stopping.');
      process.exit(1);
    }

    // === Simple Trading Logic ===
    const random = Math.random();
    let decision = "HOLD";
    let recipient = null;
    let action = "";

    if (random < 0.4) {
      decision = "BUY";
      recipient = RECIPIENT_BUY;
      action = "Executing BUY order";
    } else if (random < 0.8) {
      decision = "SELL";
      recipient = RECIPIENT_SELL;
      action = "Executing SELL order";
    } else {
      decision = "HOLD";
      action = "Market conditions not favorable";
    }

    console.log(`\n[${new Date().toLocaleTimeString()}] Trade #${tradeCount + 1}`);
    console.log(`Balance: ${balanceFormatted} ${symbol}`);
    console.log(`Agent Decision: ${decision}`);
    console.log(`Reason: ${action}`);

    if (decision === "HOLD") {
      console.log('⏸️  No transaction this cycle.');
      tradeCount++; // Count as processed
      return;
    }

    console.log(`📤 Sending ${TRADE_AMOUNT} USDC to ${recipient}`);
    const tx = await contract.transfer(recipient, amountInUnits);
    console.log('⏳ Tx Hash:', tx.hash);

    const receipt = await tx.wait();
    if (receipt.status === 1) {
      tradeCount++;
      console.log(`✅ Trade executed successfully! Total trades: ${tradeCount}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// === START THE AGENT ===
console.log('🚀 Arc Trading Agent Started');
console.log(`Trading ${TRADE_AMOUNT} USDC every ${INTERVAL_MINUTES} minutes`);
console.log(`Max trades: ${MAX_TRADES}\n`);

makeTradingDecision(); // First decision immediately

setInterval(makeTradingDecision, INTERVAL_MINUTES * 60 * 1000);