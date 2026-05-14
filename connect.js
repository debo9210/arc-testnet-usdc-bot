require('dotenv').config();
const { ethers } = require('ethers');

const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

async function checkConnection() {
  try {
    console.log('Connecting to Arc testnet...\n');

    const provider = new ethers.JsonRpcProvider(process.env.ARC_TESTNET_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    console.log('Wallet Address:', wallet.address);

    const network = await provider.getNetwork();
    console.log('Connected to Network:', network.name || 'Arc Testnet');
    console.log('Chain ID:', network.chainId.toString());

    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);

    const [symbol, decimals] = await Promise.all([
      usdcContract.symbol(),
      usdcContract.decimals()
    ]);

    const balance = await usdcContract.balanceOf(wallet.address);
    const formatted = ethers.formatUnits(balance, decimals);

    console.log('\n✅ USDC Balance:', formatted, symbol);
    console.log('\nConnection successful! Ready to send transactions.');

  } catch (error) {
    console.error('\n❌ Connection failed:', error.message);
    process.exit(1);
  }
}

checkConnection();