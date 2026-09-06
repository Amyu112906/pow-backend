const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); 

const app = express();
app.use(cors());
app.use(express.json());

// 🎛️ ADMINISTRATIVE CONFIGURATION AND CONTROL SWITCHES
const RUNTIME_STATE = {
    PAYOUTS_ENABLED: true,       
    ANTI_SPAM_COOLDOWN_MS: 3600000, 
    TARGET_RAID_TWEET: "https://x.com",

    // 🌐 NETWORK SETTINGS FOR ROBINHOOD CHAIN
    NETWORK_NAME: "Robinhood Chain",
    CHAIN_ID: 4663,
    RPC_URL: "https://robinhood.com",

    // 🪙 TOKEN SPECIFICATIONS
    TOKEN_SYMBOL: "WBTC",
    TOKEN_CONTRACT_ADDRESS: "0x5F26515668705582ac2FB11322060026Db2FffC1", 
    TOKEN_DECIMALS: 8,
    USD_REWARD_LIMIT: 0.50,      
    
    // 📊 GLOBAL MARKET SIMULATION TRACKERS
    GLOBAL_MARKET: {
        BTC: { price: 94250.00, change: "+3.45%" },
        ETH: { price: 3120.50, change: "+1.88%" },
        SOL: { price: 184.75, change: "-0.92%" },
        RHD: { price: 0.85, change: "+12.40%" } // Robinhood Chain Native Asset
    }
};

const LEDGER_FILE_PATH = path.join(__dirname, 'payout_ledger.txt');
const trackingCooldownRegistry = new Map();
const userPayoutDatabase = new Map(); 

function calculateWbtcRewardAmount() {
    const exactTokens = RUNTIME_STATE.USD_REWARD_LIMIT / RUNTIME_STATE.GLOBAL_MARKET.BTC.price;
    return exactTokens.toFixed(RUNTIME_STATE.TOKEN_DECIMALS);
}

// 🆕 UPDATED ENDPOINT: Returns generalized crypto market metrics
app.get('/api/market-prices', (req, res) => {
    res.json({
        success: true,
        marketData: RUNTIME_STATE.GLOBAL_MARKET,
        rewardAllocation: {
            rewardLimitUsd: RUNTIME_STATE.USD_REWARD_LIMIT,
            calculatedReward: calculateWbtcRewardAmount(),
            tokenSymbol: RUNTIME_STATE.TOKEN_SYMBOL
        }
    });
});

app.post('/api/check-balance', (req, res) => {
    const { walletAddress } = req.body;
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
        return res.status(400).json({ success: false, error: "Invalid EVM wallet address." });
    }

    const currentTick = Date.now();
    let cooldownRemaining = 0;
    
    if (trackingCooldownRegistry.has(walletAddress)) {
        const marker = trackingCooldownRegistry.get(walletAddress);
        const elapsed = currentTick - marker;
        if (elapsed < RUNTIME_STATE.ANTI_SPAM_COOLDOWN_MS) {
            cooldownRemaining = Math.ceil((RUNTIME_STATE.ANTI_SPAM_COOLDOWN_MS - elapsed) / 60000);
        }
    }

    const totalClaimed = userPayoutDatabase.get(walletAddress) || 0;
    res.json({
        success: true,
        lifetimeRewards: totalClaimed.toFixed(RUNTIME_STATE.TOKEN_DECIMALS),
        tokenSymbol: RUNTIME_STATE.TOKEN_SYMBOL,
        cooldownMinutesLeft: cooldownRemaining
    });
});

app.get('/api/get-raid-link', (req, res) => {
    res.json({ 
        targetTweet: RUNTIME_STATE.TARGET_RAID_TWEET,
        rewardAmount: calculateWbtcRewardAmount(),
        tokenSymbol: RUNTIME_STATE.TOKEN_SYMBOL,
        networkName: RUNTIME_STATE.NETWORK_NAME
    });
});

app.post('/api/claim-rewards', async (req, res) => {
    const { walletAddress, twitterProof, workToken } = req.body;
    if (!walletAddress || !twitterProof || !workToken) {
        return res.status(400).json({ success: false, error: "Invalid parameters." });
    }
    if (!ethers.isAddress(walletAddress)) {
        return res.status(400).json({ success: false, error: "Malformed wallet structure." });
    }

    const currentTick = Date.now();
    if (trackingCooldownRegistry.has(walletAddress)) {
        const chronologicalMarker = trackingCooldownRegistry.get(walletAddress);
        if (currentTick - chronologicalMarker < RUNTIME_STATE.ANTI_SPAM_COOLDOWN_MS) {
            return res.status(429).json({ success: false, error: "Security Hold: Cooldown active." });
        }
    }

    try {
        const finalCalculatedPayout = calculateWbtcRewardAmount();
        const txHash = "0xMainnetTx_" + Math.random().toString(16).substr(2, 32);

        trackingCooldownRegistry.set(walletAddress, currentTick);
        const baselinePrevious = userPayoutDatabase.get(walletAddress) || 0;
        userPayoutDatabase.set(walletAddress, baselinePrevious + parseFloat(finalCalculatedPayout));

        return res.json({
            success: true,
            amount: finalCalculatedPayout,
            symbol: RUNTIME_STATE.TOKEN_SYMBOL,
            networkName: RUNTIME_STATE.NETWORK_NAME,
            txHash: txHash
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: "Execution node failure." });
    }
});

const API_SERVER_PORT = process.env.PORT || 5000;
app.listen(API_SERVER_PORT, () => console.log(`🚀 Terminal running on port ${API_SERVER_PORT}`));
