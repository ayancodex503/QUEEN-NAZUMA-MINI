// NAZUMA CODEX 2026-2030 - GROUP EVENTS WITH WELCOME IMAGE API
const { isJidGroup } = require('@whiskeysockets/baileys');
const config = require('../config');
const axios = require('axios');

const getContextInfo = (m) => {
    return {
        mentionedJid: [m.sender],
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363407904372384@newsletter',
            newsletterName: 'ƝƛȤƲMƛ MƊ ƲƤƊƛƬЄ',
            serverMessageId: 143,
        },
    };
};

// Cache for avatar URLs
const avatarCache = new Map();

// Function to get user avatar URL
async function getAvatarUrl(userJid, conn) {
    if (avatarCache.has(userJid)) {
        return avatarCache.get(userJid);
    }
    
    try {
        const ppUrl = await conn.profilePictureUrl(userJid, 'image').catch(() => null);
        if (ppUrl) {
            avatarCache.set(userJid, ppUrl);
            return ppUrl;
        }
    } catch (error) {
        console.log("Could not fetch profile picture:", error.message);
    }
    
    const defaultAvatar = config.MENU_IMAGE_URL || "https://files.catbox.moe/bjb6ja.jpeg";
    avatarCache.set(userJid, defaultAvatar);
    return defaultAvatar;
}

// Function to generate welcome/goodbye image via API
async function generateWelcomeImage(userName, guildName, memberCount, avatarUrl, type = 'welcome') {
    try {
        const endpoint = type === 'welcome' ? 'welcome' : 'goodbye';
        const apiUrl = `https://api.deline.web.id/canvas/${endpoint}` +
            `?username=${encodeURIComponent(userName)}` +
            `&guildName=${encodeURIComponent(guildName)}` +
            `&memberCount=${memberCount}` +
            `&avatar=${encodeURIComponent(avatarUrl)}` +
            `&background=${encodeURIComponent(config.MENU_IMAGE_URL || "https://files.catbox.moe/bjb6ja.jpeg")}` +
            `&quality=99`;

        const response = await axios.get(apiUrl, {
            timeout: 15000,
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*' }
        });

        return Buffer.from(response.data, 'binary');
    } catch (error) {
        console.error(`Error generating ${type} image:`, error.message);
        return null;
    }
}

const GroupEvents = async (conn, update) => {
    try {
        const isGroup = isJidGroup(update.id);
        if (!isGroup) return;

        const metadata = await conn.groupMetadata(update.id);
        const participants = update.participants;
        const groupMembersCount = metadata.participants.length;

        for (const num of participants) {
            const userJid = num;
            const userName = num.split("@")[0];
            const timestamp = new Date().toLocaleString('en-US', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit', 
                minute: '2-digit'
            });

            // WELCOME EVENT
            if (update.action === "add" && config.WELCOME === "true") {
                try {
                    // Get user name
                    let pushName = "Member";
                    try {
                        const contact = await conn.getContact(userJid);
                        pushName = contact.pushname || contact.name || userName;
                    } catch (e) {}

                    // Get avatar
                    const avatarUrl = await getAvatarUrl(userJid, conn);

                    // Generate welcome image
                    const welcomeImage = await generateWelcomeImage(
                        pushName,
                        metadata.subject,
                        groupMembersCount,
                        avatarUrl,
                        'welcome'
                    );

                    if (welcomeImage) {
                        // Send with generated image
                        await conn.sendMessage(update.id, {
                            image: welcomeImage,
                            caption: `👋 *WELCOME* 👋\n\n` +
                                    `*User:* @${userName}\n` +
                                    `*Group:* ${metadata.subject}\n` +
                                    `*Members:* ${groupMembersCount}\n` +
                                    `*Joined:* ${timestamp}\n\n` +
                                    `*Powered by* ©ƝƛȤƲMƛ MƊ`,
                            mentions: [userJid],
                            contextInfo: getContextInfo({ sender: userJid }),
                        });
                    } else {
                        // Fallback to text if image fails
                        const welcomeText = `👋 *WELCOME* 👋\n\n` +
                            `@${userName} joined *${metadata.subject}*.\n` +
                            `You are member number *${groupMembersCount}*.\n` +
                            `📅 ${timestamp}\n\n` +
                            `*Powered by* ©ƝƛȤƲMƛ MƊ`;

                        await conn.sendMessage(update.id, {
                            text: welcomeText,
                            mentions: [userJid],
                            contextInfo: getContextInfo({ sender: userJid }),
                        });
                    }
                } catch (error) {
                    console.error("Error in welcome event:", error);
                }
            }

            // GOODBYE EVENT
            else if (update.action === "remove" && config.WELCOME === "true") {
                try {
                    // Get user name
                    let pushName = "Member";
                    try {
                        const contact = await conn.getContact(userJid);
                        pushName = contact.pushname || contact.name || userName;
                    } catch (e) {}

                    // Get avatar
                    const avatarUrl = await getAvatarUrl(userJid, conn);

                    // Generate goodbye image
                    const goodbyeImage = await generateWelcomeImage(
                        pushName,
                        metadata.subject,
                        groupMembersCount,
                        avatarUrl,
                        'goodbye'
                    );

                    if (goodbyeImage) {
                        // Send with generated image
                        await conn.sendMessage(update.id, {
                            image: goodbyeImage,
                            caption: `👋 *GOODBYE* 👋\n\n` +
                                    `*User:* @${userName}\n` +
                                    `*Group:* ${metadata.subject}\n` +
                                    `*Members now:* ${groupMembersCount}\n` +
                                    `*Left:* ${timestamp}\n\n` +
                                    `*Powered by* ©ƝƛȤƲMƛ MƊ`,
                            mentions: [userJid],
                            contextInfo: getContextInfo({ sender: userJid }),
                        });
                    } else {
                        // Fallback to text if image fails
                        const goodbyeText = `👋 *GOODBYE* 👋\n\n` +
                            `@${userName} left *${metadata.subject}*.\n` +
                            `Group now has *${groupMembersCount}* members.\n` +
                            `📅 ${timestamp}\n\n` +
                            `*Powered by* ©ƝƛȤƲMƛ MƊ`;

                        await conn.sendMessage(update.id, {
                            text: goodbyeText,
                            mentions: [userJid],
                            contextInfo: getContextInfo({ sender: userJid }),
                        });
                    }
                } catch (error) {
                    console.error("Error in goodbye event:", error);
                }
            }

            // PROMOTE EVENT
            else if (update.action === "promote" && config.ADMIN_EVENTS === "true") {
                const promoter = update.author.split("@")[0];
                await conn.sendMessage(update.id, {
                    text: `👑 *ADMIN EVENT* 👑\n\n` +
                          `@${promoter} promoted @${userName} to admin.\n` +
                          `Time: ${timestamp}\n` +
                          `Group: *${metadata.subject}*`,
                    mentions: [update.author, num],
                    contextInfo: getContextInfo({ sender: update.author }),
                });
            }

            // DEMOTE EVENT
            else if (update.action === "demote" && config.ADMIN_EVENTS === "true") {
                const demoter = update.author.split("@")[0];
                await conn.sendMessage(update.id, {
                    text: `👑 *ADMIN EVENT* 👑\n\n` +
                          `@${demoter} demoted @${userName} from admin.\n` +
                          `Time: ${timestamp}\n` +
                          `Group: *${metadata.subject}*`,
                    mentions: [update.author, num],
                    contextInfo: getContextInfo({ sender: update.author }),
                });
            }
        }
    } catch (err) {
        console.error('Group event error:', err);
    }
};

module.exports = GroupEvents;