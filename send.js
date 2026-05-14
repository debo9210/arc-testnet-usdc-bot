require('dotenv').config();
const { ethers } = require('ethers');

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

async function sendUSDC(recipientAddress, amount) {
  try {
    console.log('Initiating USDC transfer...\n');

    if (!recipientAddress || !amount) {
      throw new Error('Usage: node send.js <address> <amount>');
    }

    if (!ethers.isAddress(recipientAddress)) {
      throw new Error(`Invalid address: ${recipientAddress}`);
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error(`Invalid amount: ${amount}`);
    }

    const provider = new ethers.JsonRpcProvider(process.env.ARC_TESTNET_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    console.log('From:', wallet.address);
    console.log('To:', recipientAddress);

    const contract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);

    const [decimals, symbol] = await Promise.all([
      contract.decimals(),
      contract.symbol()
    ]);

    const amountInUnits = ethers.parseUnits(amount.toString(), decimals);

    const balance = await contract.balanceOf(wallet.address);
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log('Your balance:', balanceFormatted, symbol);

    if (balance < amountInUnits) {
      throw new Error(`Insufficient balance. You have ${balanceFormatted} ${symbol}`);
    }

    console.log('\nSending transaction...');
    const tx = await contract.transfer(recipientAddress, amountInUnits);

    console.log('Transaction hash:', tx.hash);

    console.log('\nWaiting for confirmation...');
    const receipt = await tx.wait();

    if (receipt.status === 1) {
      console.log('✅ Transaction confirmed!');
      console.log('Gas used:', receipt.gasUsed.toString());
      console.log('Block number:', receipt.blockNumber);

      const newBalance = await contract.balanceOf(wallet.address);
      const newBalanceFormatted = ethers.formatUnits(newBalance, decimals);
      console.log('\nNew balance:', newBalanceFormatted, symbol);
    }

  } catch (error) {
    console.error('\n❌ Transfer failed:', error.message);
    process.exit(1);
  }
}

const recipientAddress = process.argv[2];
const amount = process.argv[3];
sendUSDC(recipientAddress, amount);