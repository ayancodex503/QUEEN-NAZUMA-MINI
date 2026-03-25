import fetch from 'node-fetch';
import moment from 'moment-timezone';

const REPO_OWNER = 'ayancodex503';
const REPO_NAME = 'QUEEN-NAZUMA-MINI';
const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}`;

async function getRepoInfo() {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, {
      headers: {
        'User-Agent': 'QUEEN-NAZUMA-MINI-Bot',
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching repo info:', error);
    return null;
  }
}

async function getLastCommit() {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?per_page=1`, {
      headers: {
        'User-Agent': 'QUEEN-NAZUMA-MINI-Bot',
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    if (data && data[0]) {
      return {
        hash: data[0].sha.substring(0, 7),
        message: data[0].commit.message.split('\n')[0],
        date: data[0].commit.author.date,
        author: data[0].commit.author.name
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching last commit:', error);
    return null;
  }
}

function formatDate(dateString) {
  const date = moment(dateString);
  return date.format('DD MMM YYYY, HH:mm');
}

function formatNumber(num) {
  if (!num) return '0';
  return num.toLocaleString();
}

export default {
  command: ['repo', 'github', 'repository'],
  category: 'info',
  run: async (client, m) => {
    try {
      await client.sendMessage(m.chat, {
        text: '🔍 *QUEEN NAZUMA MINI:* \n> Fetching repository information...'
      }, { quoted: m });

      const [repoInfo, lastCommit] = await Promise.all([
        getRepoInfo(),
        getLastCommit()
      ]);

      if (!repoInfo) {
        return m.reply('❌ *Failed to fetch repository information.*\n> Please try again later.');
      }

      const botId = client.user.id.split(':')[0] + '@s.whatsapp.net';
      const botSettings = global.db.data.settings[botId] || {};
      const botname = botSettings.namebot2 || 'QUEEN NAZUMA MINI';
      const banner = botSettings.banner || 'https://files.catbox.moe/deznqj.jpg';

      const stars = formatNumber(repoInfo.stargazers_count);
      const forks = formatNumber(repoInfo.forks_count);
      const watchers = formatNumber(repoInfo.watchers_count);
      const issues = formatNumber(repoInfo.open_issues_count);
      const size = (repoInfo.size / 1024).toFixed(2);
      const language = repoInfo.language || 'JavaScript';
      const license = repoInfo.license?.name || 'MIT';
      const description = repoInfo.description || 'QUEEN NAZUMA MINI - Advanced WhatsApp Bot with Gacha, Economy, AI and more!';
      const createdAt = formatDate(repoInfo.created_at);
      const updatedAt = formatDate(repoInfo.updated_at);
      
      const commitMessage = lastCommit ? lastCommit.message : 'No information';
      const commitHash = lastCommit ? lastCommit.hash : 'unknown';
      const commitDate = lastCommit ? formatDate(lastCommit.date) : 'unknown';
      const commitAuthor = lastCommit ? lastCommit.author : 'AYAN CODEX';

      const message = `✨ ── *${botname}* ── ✨

🐙 *GitHub Repository*

📌 *Name:* ${REPO_OWNER}/${REPO_NAME}
📝 *Description:* ${description}

⭐ *Stars:* ${stars}
🍴 *Forks:* ${forks}
👀 *Watchers:* ${watchers}
⚠️ *Issues:* ${issues}
💾 *Size:* ${size} MB
📜 *License:* ${license}
💻 *Language:* ${language}

📅 *Created:* ${createdAt}
🔄 *Updated:* ${updatedAt}

🔖 *Latest Commit:*
┣ 📝 ${commitMessage}
┣ 🔑 \`${commitHash}\`
┣ 👤 ${commitAuthor}
┗ 📅 ${commitDate}

🔗 *Links:*
┣ 🌐 *Repository:* ${REPO_URL}
┣ 📢 *Channel:* https://whatsapp.com/channel/0029VbCHFQTAYlUJU7q3Vt2x
┗ 💬 *Group:* https://chat.whatsapp.com/Gyt9bKWCwJlHuXwNfqQkhq

> ✨ *Star this repository to support the project!* ✨`;

      await client.sendMessage(m.chat, {
        image: { url: banner },
        caption: message,
        contextInfo: {
          externalAdReply: {
            title: `${REPO_OWNER}/${REPO_NAME}`,
            body: `${stars} ⭐ | ${forks} 🍴`,
            thumbnailUrl: banner,
            sourceUrl: REPO_URL,
            mediaType: 1,
            renderLargerThumbnail: true
          }
        }
      }, { quoted: m });

    } catch (error) {
      console.error('Repo command error:', error);
      
      // Fallback message without GitHub API
      const botId = client.user.id.split(':')[0] + '@s.whatsapp.net';
      const botSettings = global.db.data.settings[botId] || {};
      const botname = botSettings.namebot2 || 'QUEEN NAZUMA MINI';
      
      const fallbackMessage = `✨ ── *${botname}* ── ✨

🐙 *GitHub Repository*

📌 *Repository:* ${REPO_OWNER}/${REPO_NAME}
🔗 *URL:* ${REPO_URL}

📢 *WhatsApp Channel:* 
https://whatsapp.com/channel/0029VbCHFQTAYlUJU7q3Vt2x

💬 *WhatsApp Group:*
https://chat.whatsapp.com/Gyt9bKWCwJlHuXwNfqQkhq

> ✨ *Star the repository on GitHub!* ✨`;

      await m.reply(fallbackMessage);
    }
  }
};