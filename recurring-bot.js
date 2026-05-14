require('dotenv').config();
const { ethers } = require('ethers');

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

const RECIPIENT = '0xa7519988B2e550548A025A8021226aD4Abe337C6'; // ← Change this!
const AMOUNT_TO_SEND = 0.01;           // Small amount in USDC (0.01 = 1 cent)
const INTERVAL_MINUTES = 5;            // Send every 5 minutes
const MAX_TRANSFERS = 20;              // Safety limit - stops after 20 sends

let transferCount = 0;

async function sendRecurringUSDC() {
  try {
    if (transferCount >= MAX_TRANSFERS) {
      console.log('✅ Reached max transfers. Stopping bot.');
      process.exit(0);
    }

    const provider = new ethers.JsonRpcProvider(process.env.ARC_TESTNET_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const contract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);

    const [decimals, symbol] = await Promise.all([
      contract.decimals(),
      contract.symbol()
    ]);

    const amountInUnits = ethers.parseUnits(AMOUNT_TO_SEND.toString(), decimals);
    const balance = await contract.balanceOf(wallet.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);

    console.log(`\n[${new Date().toLocaleTimeString()}] Transfer #${transferCount + 1}`);
    console.log(`From: ${wallet.address}`);
    console.log(`To: ${RECIPIENT}`);
    console.log(`Balance: ${balanceFormatted} ${symbol}`);

    if (balance < amountInUnits) {
      console.log('❌ Insufficient balance. Stopping.');
      process.exit(1);
    }

    const tx = await contract.transfer(RECIPIENT, amountInUnits);
    console.log('⏳ Transaction sent:', tx.hash);

    const receipt = await tx.wait();
    if (receipt.status === 1) {
      transferCount++;
      console.log(`✅ Success! Tx confirmed. Total transfers: ${transferCount}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Start the recurring bot
console.log(`🚀 Starting Arc Recurring Micropayment Bot`);
console.log(`Sending ${AMOUNT_TO_SEND} USDC every ${INTERVAL_MINUTES} minutes...`);
console.log(`Max transfers: ${MAX_TRANSFERS}\n`);

sendRecurringUSDC(); // First send immediately

// Then repeat every X minutes
setInterval(sendRecurringUSDC, INTERVAL_MINUTES * 60 * 1000);