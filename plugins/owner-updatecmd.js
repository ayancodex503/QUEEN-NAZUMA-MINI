import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GitHub repository info
const REPO_OWNER = 'ayancodex503';
const REPO_NAME = 'QUEEN-NAZUMA-MINI';
const REPO_BRANCH = 'main';
const PLUGINS_PATH = path.join(__dirname, '../plugins');
const GITHUB_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/plugins`;

async function fetchPluginsFromGitHub() {
  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        'User-Agent': 'QUEEN-NAZUMA-MINI-Bot'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const files = await response.json();
    
    // Filter only .js files
    const jsFiles = files.filter(file => file.name.endsWith('.js') && file.type === 'file');
    
    return jsFiles;
  } catch (error) {
    console.error('Error fetching from GitHub:', error);
    return null;
  }
}

async function downloadPlugin(file) {
  try {
    const response = await fetch(file.download_url);
    const content = await response.text();
    return content;
  } catch (error) {
    console.error(`Error downloading ${file.name}:`, error);
    return null;
  }
}

async function backupPlugin(fileName) {
  const backupPath = path.join(__dirname, '../tmp/backup_plugins');
  const filePath = path.join(PLUGINS_PATH, fileName);
  
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true });
  }
  
  if (fs.existsSync(filePath)) {
    const backupFile = path.join(backupPath, `${fileName}.backup`);
    fs.copyFileSync(filePath, backupFile);
    return true;
  }
  return false;
}

async function restoreBackup(fileName) {
  const backupPath = path.join(__dirname, '../tmp/backup_plugins');
  const backupFile = path.join(backupPath, `${fileName}.backup`);
  const filePath = path.join(PLUGINS_PATH, fileName);
  
  if (fs.existsSync(backupFile)) {
    fs.copyFileSync(backupFile, filePath);
    fs.unlinkSync(backupFile);
    return true;
  }
  return false;
}

async function reloadCommands() {
  const commandsMap = new Map();
  
  if (!fs.existsSync(PLUGINS_PATH)) {
    console.log('Plugins directory not found');
    return 0;
  }

  const files = fs.readdirSync(PLUGINS_PATH);

  for (const file of files) {
    if (file.endsWith('.js')) {
      const fullPath = path.join(PLUGINS_PATH, file);
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
  return commandsMap.size;
}

export default {
  command: ['updatecmd', 'updateplugins', 'upcmds'],
  category: 'owner',
  isOwner: true,
  run: async (client, m, args) => {
    try {
      // Check if args is "restore" to restore backup
      if (args && args[0] === 'restore') {
        const backupPath = path.join(__dirname, '../tmp/backup_plugins');
        
        if (!fs.existsSync(backupPath)) {
          return m.reply('❌ *No backup found.*\n> No plugins have been backed up.');
        }
        
        const backupFiles = fs.readdirSync(backupPath).filter(f => f.endsWith('.backup'));
        
        if (backupFiles.length === 0) {
          return m.reply('❌ *No backup files found.*');
        }
        
        await client.sendMessage(m.chat, {
          text: `🔄 *Restoring ${backupFiles.length} plugins from backup...*`
        }, { quoted: m });
        
        let restored = 0;
        let failed = 0;
        
        for (const backupFile of backupFiles) {
          const fileName = backupFile.replace('.backup', '');
          const success = await restoreBackup(fileName);
          if (success) restored++;
          else failed++;
        }
        
        const cmdCount = await reloadCommands();
        
        await client.sendMessage(m.chat, {
          text: `✅ *Restore completed!*\n\n` +
            `📦 *Restored:* ${restored} plugins\n` +
            `❌ *Failed:* ${failed}\n` +
            `⚡ *Commands loaded:* ${cmdCount}\n\n` +
            `> All plugins restored to previous version.`
        }, { quoted: m });
        
        return;
      }
      
      // Normal update process
      await client.sendMessage(m.chat, {
        text: '🔄 *QUEEN NAZUMA MINI:* \n> Fetching latest plugins from GitHub...'
      }, { quoted: m });
      
      const plugins = await fetchPluginsFromGitHub();
      
      if (!plugins) {
        return m.reply('❌ *Failed to fetch plugins from GitHub.*\n> Please check your internet connection and try again.');
      }
      
      if (plugins.length === 0) {
        return m.reply('❌ *No plugins found in repository.*');
      }
      
      // Backup existing plugins
      await client.sendMessage(m.chat, {
        text: `📦 *Found ${plugins.length} plugins on GitHub.*\n> Creating backup of existing plugins...`
      }, { quoted: m });
      
      let backedUp = 0;
      for (const plugin of plugins) {
        const backed = await backupPlugin(plugin.name);
        if (backed) backedUp++;
      }
      
      // Download and update plugins
      await client.sendMessage(m.chat, {
        text: `📥 *Downloading plugins...*`
      }, { quoted: m });
      
      let updated = 0;
      let failed = 0;
      const failedPlugins = [];
      
      for (const plugin of plugins) {
        const content = await downloadPlugin(plugin);
        if (content) {
          const filePath = path.join(PLUGINS_PATH, plugin.name);
          fs.writeFileSync(filePath, content, 'utf-8');
          updated++;
        } else {
          failed++;
          failedPlugins.push(plugin.name);
        }
      }
      
      // Reload commands
      await client.sendMessage(m.chat, {
        text: `⚡ *Reloading commands...*`
      }, { quoted: m });
      
      const cmdCount = await reloadCommands();
      
      let message = `✅ *QUEEN NAZUMA MINI - Commands Updated!*\n\n` +
        `📥 *Updated:* ${updated} plugins\n` +
        `❌ *Failed:* ${failed}\n` +
        `📦 *Backed up:* ${backedUp} plugins\n` +
        `⚡ *Commands loaded:* ${cmdCount}\n`;
      
      if (failedPlugins.length > 0) {
        message += `\n⚠️ *Failed to update:*\n${failedPlugins.map(p => `• ${p}`).join('\n')}`;
      }
      
      message += `\n\n> 💡 *To restore previous version:*\n> \`.updatecmd restore\``;
      
      await client.sendMessage(m.chat, {
        text: message
      }, { quoted: m });
      
    } catch (error) {
      console.error('UpdateCmd error:', error);
      await m.reply(`❌ *Update failed:*\n\`\`\`${error.message}\`\`\`\n> Use \`.updatecmd restore\` to restore previous version.`);
    }
  }
};