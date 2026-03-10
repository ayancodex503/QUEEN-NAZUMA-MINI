// NAZUMA CODEX 2026-2030
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { pipeline } = require('stream/promises')

// Configuração simplificada para arquivos
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB em bytes

const getBuffer = async(url, options) => {
	try {
		options ? options : {}
		var res = await axios({
			method: 'get',
			url,
			headers: {
				'DNT': 1,
				'Upgrade-Insecure-Request': 1
			},
			...options,
			responseType: 'arraybuffer'
		})
		return res.data
	} catch (e) {
		console.log(e)
		return null
	}
}

// Função para baixar arquivos com streaming
const getLargeFile = async(url, filePath, options = {}) => {
    try {
        const { timeout = 30000, onProgress } = options;
        
        const response = await axios({
            method: 'get',
            url,
            headers: {
                'DNT': 1,
                'Upgrade-Insecure-Request': 1
            },
            responseType: 'stream',
            timeout: timeout
        });

        const writer = fs.createWriteStream(filePath);
        let downloadedBytes = 0;
        const totalBytes = parseInt(response.headers['content-length']) || 0;

        response.data.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            if (onProgress && typeof onProgress === 'function') {
                onProgress(downloadedBytes, totalBytes);
            }
        });

        await pipeline(response.data, writer);

        // Verificar tamanho do arquivo
        const stats = fs.statSync(filePath);
        if (stats.size > MAX_FILE_SIZE) {
            fs.unlinkSync(filePath);
            throw new Error(`File exceeds maximum allowed size of ${formatBytes(MAX_FILE_SIZE)}`);
        }

        return {
            filePath: filePath,
            size: stats.size,
            success: true
        };

    } catch (error) {
        console.error('File download error:', error.message);
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (e) {
                console.error('Error cleaning partial file:', e);
            }
        }
        throw error;
    }
}

const getGroupAdmins = (participants) => {
	var admins = []
	for (let i of participants) {
		i.admin !== null  ? admins.push(i.id) : ''
	}
	return admins
}

const getRandom = (ext) => {
	return `${Math.floor(Math.random() * 10000)}${ext}`
}

const h2k = (eco) => {
	var lyrik = ['', 'K', 'M', 'B', 'T', 'P', 'E']
	var ma = Math.log10(Math.abs(eco)) / 3 | 0
	if (ma == 0) return eco
	var ppo = lyrik[ma]
	var scale = Math.pow(10, ma * 3)
	var scaled = eco / scale
	var formatt = scaled.toFixed(1)
	if (/\.0$/.test(formatt))
		formatt = formatt.substr(0, formatt.length - 2)
	return formatt + ppo
}

const isUrl = (url) => {
	return url.match(
		new RegExp(
			'/https?:\/\/(www\.)?[-a-zA-Z0-9@:%.+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%+.~#?&/=]*)/',
			'gi'
		)
	)
}

const Json = (string) => {
    return JSON.stringify(string, null, 2)
}

const runtime = (seconds) => {
	seconds = Number(seconds)
	var d = Math.floor(seconds / (3600 * 24))
	var h = Math.floor(seconds % (3600 * 24) / 3600)
	var m = Math.floor(seconds % 3600 / 60)
	var s = Math.floor(seconds % 60)
	var dDisplay = d > 0 ? d + (d == 1 ? ' day, ' : ' days, ') : ''
	var hDisplay = h > 0 ? h + (h == 1 ? ' hour, ' : ' hours, ') : ''
	var mDisplay = m > 0 ? m + (m == 1 ? ' minute, ' : ' minutes, ') : ''
	var sDisplay = s > 0 ? s + (s == 1 ? ' second' : ' seconds') : ''
	return dDisplay + hDisplay + mDisplay + sDisplay;
}

const sleep = async(ms) => {
	return new Promise(resolve => setTimeout(resolve, ms))
}

const fetchJson = async (url, options) => {
    try {
        options ? options : {}
        const res = await axios({
            method: 'GET',
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
            },
            ...options
        })
        return res.data
    } catch (err) {
        console.error('Fetch JSON error:', err.message)
        return null
    }
}

// Funções para formatar bytes
const formatBytes = (bytes, decimals = 2) => {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const formatLargeBytes = (bytes, decimals = 2) => {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	
	if (i >= sizes.length - 1) {
		return (bytes / Math.pow(k, 3)).toFixed(dm) + ' GB';
	}
	
	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const formatMessage = (title, content, footer) => {
	return `*${title}*\n\n${content}\n\n> *${footer}*`;
}

const generateFakeVCard = (botName = "NAZUMA", ownerNumber = config?.OWNER_NUM || "258833406646") => {
	return {
		key: {
			fromMe: false,
			participant: "0@s.whatsapp.net",
			remoteJid: "status@broadcast"
		},
		message: {
			contactMessage: {
				displayName: `©${botName} ✅`,
				vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:Meta\nORG:META AI;\nTEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}\nEND:VCARD`
			}
		}
	}
}

const convertToSpecialFont = (text) => {
  const specialFont = {
    'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ꜰ', 'g': 'ɢ', 'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ',
    'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ', 's': 'ꜱ', 't': 'ᴛ',
    'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ',
    'A': 'ᴀ', 'B': 'ʙ', 'C': 'ᴄ', 'D': 'ᴅ', 'E': 'ᴇ', 'F': 'ꜰ', 'G': 'ɢ', 'H': 'ʜ', 'I': 'ɪ', 'J': 'ᴊ',
    'K': 'ᴋ', 'L': 'ʟ', 'M': 'ᴍ', 'N': 'ɴ', 'O': 'ᴏ', 'P': 'ᴘ', 'Q': 'ǫ', 'R': 'ʀ', 'S': 'ꜱ', 'T': 'ᴛ',
    'U': 'ᴜ', 'V': 'ᴠ', 'W': 'ᴡ', 'X': 'x', 'Y': 'ʏ', 'Z': 'ᴢ'
  };
  return text.split('').map(char => specialFont[char] || char).join('');
}

// Função para verificar se um arquivo é muito grande
const isFileTooLarge = (filePath) => {
    try {
        const stats = fs.statSync(filePath);
        return stats.size > MAX_FILE_SIZE;
    } catch (error) {
        console.error('Error checking file size:', error.message);
        return true;
    }
}

// Função para obter informações do arquivo
const getFileInfo = (filePath) => {
    try {
        const stats = fs.statSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        return {
            size: stats.size,
            formattedSize: formatBytes(stats.size),
            extension: ext,
            name: path.basename(filePath),
            path: filePath,
            isLarge: stats.size > MAX_FILE_SIZE
        };
    } catch (error) {
        console.error('Error getting file info:', error.message);
        return null;
    }
}

// Função para criar diretório se não existir
const ensureDirectory = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    return dirPath;
}

// Função para gerar nome de arquivo único
const generateUniqueFilename = (originalName, directory = './downloads') => {
    ensureDirectory(directory);
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return path.join(directory, `${baseName}_${timestamp}_${random}${ext}`);
}

// Função para limpar arquivos temporários automaticamente
const cleanupOldFiles = (directory, maxAgeMinutes = 60) => {
    try {
        if (!fs.existsSync(directory)) {
            return { cleaned: 0, totalSize: 0 };
        }
        
        const files = fs.readdirSync(directory);
        const now = Date.now();
        const maxAge = maxAgeMinutes * 60 * 1000;
        let cleanedCount = 0;
        let totalSize = 0;
        
        files.forEach(file => {
            const filePath = path.join(directory, file);
            try {
                const stats = fs.statSync(filePath);
                const fileAge = now - stats.mtimeMs;
                
                if (fileAge > maxAge) {
                    const fileSize = stats.size;
                    fs.unlinkSync(filePath);
                    cleanedCount++;
                    totalSize += fileSize;
                    console.log(`🧹 Cleaned up old file: ${file} (${formatBytes(fileSize)})`);
                }
            } catch (error) {
                console.error(`Error cleaning up file ${file}:`, error.message);
            }
        });
        
        console.log(`🧹 Cleanup completed: ${cleanedCount} files removed, ${formatBytes(totalSize)} freed`);
        return { cleaned: cleanedCount, totalSize: totalSize };
    } catch (error) {
        console.error('Error during cleanup:', error.message);
        return { cleaned: 0, totalSize: 0 };
    }
}

// Função para limpeza completa do sistema
const fullCleanup = () => {
    console.log('🚀 Starting full system cleanup...');
    
    const results = {
        downloads: cleanupOldFiles('./downloads', 30),
        session: cleanupOldFiles('./session', 1440),
        tmp: cleanupOldFiles('./tmp', 60),
        root: cleanupOldFiles('.', 120)
    };
    
    let totalCleaned = 0;
    let totalFreed = 0;
    
    Object.keys(results).forEach(key => {
        totalCleaned += results[key].cleaned;
        totalFreed += results[key].totalSize;
    });
    
    console.log(`🎉 Full cleanup completed: ${totalCleaned} files removed, ${formatBytes(totalFreed)} freed`);
    
    return {
        totalCleaned,
        totalFreed,
        details: results
    };
}

// Função para fazer download com timeout
const downloadWithTimeout = async (url, timeout = 30000) => {
    try {
        const response = await axios({
            method: 'GET',
            url,
            responseType: 'arraybuffer',
            timeout: timeout,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Download timeout error:', error.message);
        throw error;
    }
}

// Função para verificar se URL é válida
const isValidUrl = (string) => {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

module.exports = { 
	getBuffer, 
	getLargeFile,
	getGroupAdmins, 
	getRandom, 
	h2k, 
	isUrl, 
	Json, 
	runtime, 
	sleep, 
	fetchJson,
	formatBytes,
	formatLargeBytes,
	formatMessage,
	generateFakeVCard,
	convertToSpecialFont,
	isFileTooLarge,
	getFileInfo,
	ensureDirectory,
	generateUniqueFilename,
	cleanupOldFiles,
	fullCleanup,
	MAX_FILE_SIZE,
	downloadWithTimeout,
	isValidUrl
}