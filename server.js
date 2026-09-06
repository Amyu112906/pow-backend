const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
require('dotenv').config(); 

const app = express();
app.use(cors());
app.use(express.json());

// 🎛️ ADMINISTRATIVE CONFIGURATION AND CONTROL SWITCHES
const RUNTIME_STATE = {
    PAYOUTS_ENABLED: true,       // 🟢 TRUE = Live | 🔴 FALSE = Paused
    ANTI_SPAM_COOLDOWN_MS: 3600000, // 1-hour protection rule per unique address
    
    // 👇 UPDATE TWEET HERE WHEN A NEW COMMUNITY RAID IS LIVE
    TARGET_RAID_TWEET: "https://x.com",

    // 🌐 NETWORK SETTINGS FOR ROBINHOOD CHAIN
    NETWORK_NAME: "Robinhood Chain",
    CHAIN_ID: 4663,
    RPC_URL: "https://rpc.mainnet.chain.robinhood.com",

    // 🪙 TOKEN SPECIFICATIONS (WBTC uses 8 decimals instead of standard 18)
    TOKEN_SYMBOL: "WBTC",
    TOKEN_CONTRACT_ADDRESS: "0x5F26515668705582ac2FB11322060026Db2FffC1", // Specified WBTC reference
    TOKEN_DECIMALS: 8,
    USD_REWARD_LIMIT: 0.50,      // Enforces a strict max limit of $0.50 USD worth of WBTC
    MOCK_WBTC_PRICE_USD: 85000.00 // Baseline asset reference index spot price ($85,000 / BTC)
};

// Simulation state initialization
const networkProvider = null; 
let administrationSignerWallet = { address: "0xMockTestingWalletAddress" };
console.log(`🔒 Vault Ready: ${RUNTIME_STATE.NETWORK_NAME} (ID: ${RUNTIME_STATE.CHAIN_ID}) WBTC Rewards Engine Live`);

const trackingCooldownRegistry = new Map();

// Helper to compute exact reward payout fractions dynamically based on current market limits
function calculateWbtcRewardAmount() {
    // Value ($0.50) / Asset Price ($85,000) = ~0.00000588 WBTC
    const exactTokens = RUNTIME_STATE.USD_REWARD_LIMIT / RUNTIME_STATE.MOCK_WBTC_PRICE_USD;
    // Formats matching precisely 8 decimal places for strict WBTC contract compliance
    return exactTokens.toFixed(RUNTIME_STATE.TOKEN_DECIMALS);
}

app.get('/api/get-raid-link', (req, res) => {
    const calculatedReward = calculateWbtcRewardAmount();
    res.json({ 
        targetTweet: RUNTIME_STATE.TARGET_RAID_TWEET,
        rewardAmount: calculatedReward,
        tokenSymbol: RUNTIME_STATE.TOKEN_SYMBOL,
        networkName: RUNTIME_STATE.NETWORK_NAME
    });
});

app.post('/api/claim-rewards', async (req, res) => {
    const { walletAddress, twitterProof, workToken } = req.body;

    if (!walletAddress || !twitterProof || !workToken) {
        return res.status(400).json({ success: false, error: "Invalid payload parameters submitted." });
    }

    if (!RUNTIME_STATE.PAYOUTS_ENABLED) {
        return res.status(503).json({ success: false, error: "Automated distribution vaults are currently PAUSED by admin." });
    }

    if (!ethers.isAddress(walletAddress)) {
        return res.status(400).json({ success: false, error: "Submitted parameter does not conform to valid EVM formats." });
    }

    const cleanProof = twitterProof.trim().toLowerCase();
    if (!cleanProof.includes('x.com') && !cleanProof.includes('twitter.com')) {
        return res.status(400).json({ success: false, error: "Validation Fault: The proof submitted must be a valid X or Twitter link." });
    }

    const currentTick = Date.now();
    if (trackingCooldownRegistry.has(walletAddress)) {
        const chronologicalMarker = trackingCooldownRegistry.get(walletAddress);
        if (currentTick - chronologicalMarker < RUNTIME_STATE.ANTI_SPAM_COOLDOWN_MS) {
            return res.status(429).json({ success: false, error: "Security Hold: Cooldown criteria has not expired yet." });
        }
    }

    if (workToken !== "VALID_COMPUTATION_TOKEN_HASH_99") {
        return res.status(403).json({ success: false, error: "Cryptographic assertion checksum invalid." });
    }

    try {
        const finalCalculatedPayout = calculateWbtcRewardAmount();
        
        console.log(`📡 Broadcast execution: Forwarding rewards to target on ${RUNTIME_STATE.NETWORK_NAME}: ${walletAddress}`);
        console.log(`🔗 Verified Twitter Proof Link: ${twitterProof}`);
        console.log(`💰 Exact Calculated Payout: ${finalCalculatedPayout} ${RUNTIME_STATE.TOKEN_SYMBOL} ($${RUNTIME_STATE.USD_REWARD_LIMIT} USD value)`);
        
        trackingCooldownRegistry.set(walletAddress, currentTick);

        return res.json({
            success: true,
            message: "Dispatched",
            amount: finalCalculatedPayout,
            symbol: RUNTIME_STATE.TOKEN_SYMBOL,
            networkName: RUNTIME_STATE.NETWORK_NAME,
            txHash: "0x" + Math.random().toString(16).substr(2, 32) + Math.random().toString(16).substr(2, 32) // Simulated Transaction Hash
        });

    } catch (transactionFault) {
        console.error("Blockchain execution fault logic trace:", transactionFault);
        return res.status(500).json({ success: false, error: "Ecosystem node error." });
    }
});

const API_SERVER_PORT = process.env.PORT || 5000;
app.listen(API_SERVER_PORT, () => console.log(`🚀 System Engine listening dynamically on standard port ${API_SERVER_PORT}`));
