import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GitHub repository info
const REPO_OWNER = 'ayancodex503';
const REPO_NAME = 'QUEEN-NAZUMA-MINI';
const REPO_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}.git`;

async function isGitRepo() {
  try {
    const { stdout } = await execPromise('git rev-parse --git-dir');
    return stdout.trim() === '.git' || fs.existsSync(path.join(process.cwd(), '.git'));
  } catch {
    return false;
  }
}

async function getGitInfo() {
  try {
    const { stdout: branch } = await execPromise('git branch --show-current');
    const { stdout: commit } = await execPromise('git rev-parse --short HEAD');
    const { stdout: lastCommit } = await execPromise('git log -1 --format=%s');
    return {
      branch: branch.trim(),
      commit: commit.trim(),
      lastCommit: lastCommit.trim()
    };
  } catch {
    return null;
  }
}

async function getLatestCommitFromGitHub() {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?per_page=1`);
    const data = await response.json();
    if (data && data[0]) {
      return {
        commit: data[0].sha.substring(0, 7),
        message: data[0].commit.message.split('\n')[0],
        date: data[0].commit.author.date
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching from GitHub API:', error);
    return null;
  }
}

async function cloneRepository() {
  const backupDir = path.join(process.cwd(), 'backup');
  const tempDir = path.join(process.cwd(), 'temp_update');
  
  try {
    // Create backup of important files
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
    
    // Backup config.js and sessions
    if (fs.existsSync('./config.js')) {
      fs.copyFileSync('./config.js', path.join(backupDir, 'config.js'));
    }
    if (fs.existsSync('./Sessions')) {
      fs.cpSync('./Sessions', path.join(backupDir, 'Sessions'), { recursive: true });
    }
    
    // Clone the repository
    await execPromise(`git clone ${REPO_URL} ${tempDir}`);
    
    // Copy files from temp to current directory (excluding backup and sessions)
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      if (file === '.git') continue;
      const src = path.join(tempDir, file);
      const dest = path.join(process.cwd(), file);
      if (fs.existsSync(dest)) {
        fs.rmSync(dest, { recursive: true, force: true });
      }
      fs.cpSync(src, dest, { recursive: true });
    }
    
    // Restore config.js and sessions
    if (fs.existsSync(path.join(backupDir, 'config.js'))) {
      fs.copyFileSync(path.join(backupDir, 'config.js'), './config.js');
    }
    if (fs.existsSync(path.join(backupDir, 'Sessions'))) {
      if (fs.existsSync('./Sessions')) fs.rmSync('./Sessions', { recursive: true });
      fs.cpSync(path.join(backupDir, 'Sessions'), './Sessions', { recursive: true });
    }
    
    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
    fs.rmSync(backupDir, { recursive: true, force: true });
    
    return true;
  } catch (error) {
    console.error('Clone error:', error);
    return false;
  }
}

async function pullUpdates() {
  try {
    const { stdout } = await execPromise('git pull origin');
    return { success: true, output: stdout };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function reloadCommands() {
  const commandsMap = new Map();
  const pluginsPath = path.join(__dirname, '../plugins');
  
  if (!fs.existsSync(pluginsPath)) {
    console.log('Plugins directory not found');
    return;
  }

  const files = fs.readdirSync(pluginsPath);

  for (const file of files) {
    if (file.endsWith('.js')) {
      const fullPath = path.join(pluginsPath, file);
      try {
        delete require.cache[require.resolve(fullPath)];
        const { default: cmd } = await import(`file://${fullPath}?update=${Date.now()}`);
        
        if (cmd?.command && Array.isArray(cmd.command)) {
          cmd.command.forEach((c) => {
            commandsMap.set(c.toLowerCase(), cmd);
          });
        }
      } catch (err) {
        console.error(`Error loading ${file}:`, err.message);
      }
    }
  }

  global.comandos = commandsMap;
  console.log(`✅ Reloaded ${commandsMap.size} commands`);
}

export default {
  command: ['update', 'upgrade', 'gitpull'],
  category: 'owner',
  isOwner: true,
  run: async (client, m, args, command, text) => {
    try {
      await client.sendMessage(m.chat, {
        text: '🔄 *QUEEN NAZUMA MINI:* \n> Checking for updates...'
      }, { quoted: m });

      const isGit = await isGitRepo();
      const latestCommit = await getLatestCommitFromGitHub();
      
      if (!latestCommit) {
        return m.reply('❌ *Cannot check for updates.*\n> Unable to connect to GitHub API.');
      }

      // If not a git repo, offer to clone
      if (!isGit) {
        const message = `📦 *QUEEN NAZUMA MINI*\n\n` +
          `This installation was not done via Git.\n\n` +
          `📌 *Latest version:* ${latestCommit.commit}\n` +
          `📝 *Changes:* ${latestCommit.message}\n\n` +
          `❓ Would you like to convert to Git and update?\n\n` +
          `> ⚠️ *Warning:* This will backup your config and sessions, then clone the repository.\n` +
          `> Use *.update confirm* to proceed.`;
        
        if (!args || args[0] !== 'confirm') {
          return m.reply(message);
        }
        
        await client.sendMessage(m.chat, {
          text: '📦 *Cloning repository...*\n> This may take a moment. Your config and sessions will be preserved.'
        }, { quoted: m });
        
        const cloned = await cloneRepository();
        
        if (!cloned) {
          return m.reply('❌ *Clone failed.*\n> Please check your internet connection and try again, or install manually with:\n> `git clone https://github.com/ayancodex503/QUEEN-NAZUMA-MINI.git`');
        }
        
        await reloadCommands();
        
        await client.sendMessage(m.chat, {
          text: `✅ *QUEEN NAZUMA MINI updated successfully!*\n\n` +
            `📌 *Version:* ${latestCommit.commit}\n` +
            `📝 *Changes:* ${latestCommit.message}\n\n` +
            `🔄 *Restarting bot...*`
        }, { quoted: m });
        
        // Restart bot
        const botId = client.user.id.split(':')[0];
        if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp');
        fs.writeFileSync(`./tmp/restarting_${botId}.txt`, `${m.chat}|${m.id}`);
        
        setTimeout(() => {
          process.exit(0);
        }, 3000);
        
        return;
      }
      
      // If it is a git repo, get current info
      const currentInfo = await getGitInfo();
      
      if (!currentInfo) {
        return m.reply('❌ *Git repository found but unable to get info.*');
      }
      
      // Check if update is available
      if (currentInfo.commit === latestCommit.commit) {
        await reloadCommands();
        return m.reply(`✅ *QUEEN NAZUMA MINI is up to date!*\n\n` +
          `📌 *Branch:* ${currentInfo.branch}\n` +
          `🔖 *Commit:* ${currentInfo.commit}\n` +
          `📝 *Last update:* ${currentInfo.lastCommit}\n\n` +
          `> Commands have been refreshed.`);
      }
      
      // Update available
      await client.sendMessage(m.chat, {
        text: `📦 *Updates found!*\n\n` +
          `📌 *Current:* ${currentInfo.commit}\n` +
          `🆕 *Latest:* ${latestCommit.commit}\n` +
          `📝 *Changes:* ${latestCommit.message}\n\n` +
          `> 🔄 Pulling changes...`
      }, { quoted: m });
      
      const pullResult = await pullUpdates();
      
      if (!pullResult.success) {
        return m.reply(`❌ *Git Error:*\n\`\`\`${pullResult.error}\`\`\``);
      }
      
      // Reload commands
      await reloadCommands();
      
      await client.sendMessage(m.chat, {
        text: `✅ *QUEEN NAZUMA MINI updated successfully!*\n\n` +
          `📌 *Branch:* ${currentInfo.branch}\n` +
          `🔖 *Commit:* ${latestCommit.commit} (was ${currentInfo.commit})\n` +
          `📝 *Changes:* ${latestCommit.message}\n\n` +
          `🔄 *Restarting bot...*`
      }, { quoted: m });
      
      // Restart bot
      const botId = client.user.id.split(':')[0];
      if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp');
      fs.writeFileSync(`./tmp/restarting_${botId}.txt`, `${m.chat}|${m.id}`);
      
      setTimeout(() => {
        process.exit(0);
      }, 3000);
      
    } catch (error) {
      console.error('Update error:', error);
      await m.reply(`❌ *Update failed:*\n\`\`\`${error.message}\`\`\`\n> Please try again later or manually update with:\n> \`git pull\``);
    }
  }
};