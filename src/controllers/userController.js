const { User } = require('../models/index');

/**
 * Handles account identification and auto-registration
 */
exports.getAccountIdentifier = async (req, res) => {
    try {
        const testUuid = "0x123456789ABCDEF";
        
        // Find user or create if it doesn't exist
        const [user, created] = await User.findOrCreate({
            where: { uuid: testUuid },
            defaults: { 
                username: 'New_Eden_Player',
                email: 'player@eden.network'
            }
        });

        if (created) {
            console.log(`🆕 [User] Created new account: ${user.username}`);
        }

        return res.status(200).send(user.uuid);
    } catch (error) {
        console.error("❌ [Controller Error]:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};