const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
require('dotenv').config(); 

const app = express();
app.use(cors());
app.use(express.json());

// 🎛️ ADMINISTRATIVE TOGGLE CONTROL SWITCHES
const RUNTIME_STATE = {
    PAYOUTS_ENABLED: true,      // 🟢 TRUE = Automated Payments Live | 🔴 FALSE = Dead Switch Lock
    TOKEN_REWARD_VALUE: "10.0", // Flat ERC-20 token amount issued per computation claim
    ANTI_SPAM_COOLDOWN_MS: 3600000, // Strict 1-hour abuse protection rule per unique user address
};

// SIMULATION MODE SETTING (Bypasses private key requirements for testing)
const networkProvider = null;
let administrationSignerWallet = { address: "0xMockTestingWalletAddress" };
console.log(`🔒 Vault Check: Simulation Mode Live`);

const trackingCooldownRegistry = new Map();

app.post('/api/claim-rewards', async (req, res) => {
    // Upgraded to extract twitterProof alongside walletAddress and workToken
    const { walletAddress, twitterProof, workToken } = req.body;

    if (!walletAddress || !twitterProof || !workToken) {
        return res.status(400).json({ success: false, error: "Invalid payload parameters submitted. Missing address or proof link." });
    }

    // 1. MASTER LOCKOUT SWITCH CHECK
    if (!RUNTIME_STATE.PAYOUTS_ENABLED) {
        return res.status(503).json({ success: false, error: "Automated distribution vaults are currently PAUSED by admin." });
    }

    // 2. CRYPTO DATA VALIDATION
    if (!ethers.isAddress(walletAddress)) {
        return res.status(400).json({ success: false, error: "Submitted parameter does not conform to valid EVM formats." });
    }

    // 3. TWITTER PROOF LINK VALIDATION
    const cleanProof = twitterProof.trim().toLowerCase();
    if (!cleanProof.includes('x.com') && !cleanProof.includes('twitter.com')) {
        return res.status(400).json({ success: false, error: "Validation Fault: The proof submitted must be a valid X or Twitter link." });
    }

    // 4. DDOS/ANTI-SPAM SYSTEM CHECK
    const currentTick = Date.now();
    if (trackingCooldownRegistry.has(walletAddress)) {
        const chronologicalMarker = trackingCooldownRegistry.get(walletAddress);
        if (currentTick - chronologicalMarker < RUNTIME_STATE.ANTI_SPAM_COOLDOWN_MS) {
            return res.status(429).json({ success: false, error: "Security Hold: Cooldown criteria has not expired yet." });
        }
    }

    // 5. FALSIFIED VALIDATION SECURITY VERIFICATION
    if (workToken !== "VALID_COMPUTATION_TOKEN_HASH_99") {
        return res.status(403).json({ success: false, error: "Cryptographic assertion checksum invalid." });
    }

    try {
        // Logs both user identification metrics clearly to your terminal console logs
        console.log(`📡 Broadcast execution: Forwarding rewards to target: ${walletAddress}`);
        console.log(`🔗 Verified Twitter Proof Link: ${twitterProof}`);
        
        trackingCooldownRegistry.set(walletAddress, currentTick);

        return res.json({
            success: true,
            message: "Dispatched",
            txHash: "0x" + Math.random().toString(16).substr(2, 32) + Math.random().toString(16).substr(2, 32) // Simulated Transaction Hash
        });

    } catch (transactionFault) {
        console.error("Blockchain execution fault logic trace:", transactionFault);
        return res.status(500).json({ success: false, error: "Ecosystem node error." });
    }
});

const API_SERVER_PORT = process.env.PORT || 5000;
app.listen(API_SERVER_PORT, () => console.log(`🚀 System Engine listening dynamically on standard port ${API_SERVER_PORT}`));
