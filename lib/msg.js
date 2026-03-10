// AYAN CODEX 2025-2026
const { proto, downloadContentFromMessage, getContentType } = require('@whiskeysockets/baileys')
const fs = require('fs')
const path = require('path')
const { pipeline } = require('stream/promises')
const { formatLargeBytes } = require('./functions')

// Configuração para arquivos grandes (até 4GB)
const MAX_FILE_SIZE = 4 * 1024 * 1024 * 1024; // 4GB em bytes

const downloadMediaMessage = async(m, filename, options = {}) => {
    const { timeout = 300000, cleanup = true, cleanupTimeout = 3600000 } = options;
    
    if (m.type === 'viewOnceMessage') {
        m.type = m.msg.type
    }
    
    try {
        let stream;
        let fileExtension;
        let mimeType;
        
        if (m.type === 'imageMessage') {
            fileExtension = '.jpg';
            mimeType = 'image/jpeg';
            stream = await downloadContentFromMessage(m.msg, 'image');
        } else if (m.type === 'videoMessage') {
            fileExtension = '.mp4';
            mimeType = 'video/mp4';
            stream = await downloadContentFromMessage(m.msg, 'video');
        } else if (m.type === 'audioMessage') {
            fileExtension = '.mp3';
            mimeType = 'audio/mpeg';
            stream = await downloadContentFromMessage(m.msg, 'audio');
        } else if (m.type === 'stickerMessage') {
            fileExtension = '.webp';
            mimeType = 'image/webp';
            stream = await downloadContentFromMessage(m.msg, 'sticker');
        } else if (m.type === 'documentMessage') {
            const originalName = m.msg.fileName || 'document';
            fileExtension = path.extname(originalName) || '.bin';
            mimeType = m.msg.mimetype || 'application/octet-stream';
            stream = await downloadContentFromMessage(m.msg, 'document');
        } else {
            throw new Error('Unsupported media type: ' + m.type);
        }

        const outputFilename = filename ? filename + fileExtension : 'download_' + Date.now() + fileExtension;
        
        const writeStream = fs.createWriteStream(outputFilename);
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Download timeout')), timeout);
        });
        
        await Promise.race([
            pipeline(stream, writeStream),
            timeoutPromise
        ]);
        
        if (!fs.existsSync(outputFilename)) {
            throw new Error('Failed to create file');
        }
        
        const stats = fs.statSync(outputFilename);
        if (stats.size > MAX_FILE_SIZE) {
            fs.unlinkSync(outputFilename);
            throw new Error('File exceeds maximum allowed size of 4GB');
        }
        
        if (cleanup && cleanupTimeout > 0) {
            setTimeout(() => {
                if (fs.existsSync(outputFilename)) {
                    try {
                        const fileStats = fs.statSync(outputFilename);
                        fs.unlinkSync(outputFilename);
                        console.log(`🧹 Auto-cleaned file: ${outputFilename} (${formatLargeBytes(fileStats.size)})`);
                    } catch (e) {
                        console.error('Error auto-cleaning file:', e);
                    }
                }
            }, cleanupTimeout);
        }
        
        return {
            filePath: outputFilename,
            size: stats.size,
            mimeType: mimeType,
            filename: outputFilename,
            autoCleanup: cleanup
        };
        
    } catch (error) {
        console.error('Download error:', error);
        if (filename && fs.existsSync(filename)) {
            try {
                fs.unlinkSync(filename);
            } catch (e) {
                console.error('Error cleaning partial file:', e);
            }
        }
        throw error;
    }
}

const downloadWithProgress = async(m, filename, onProgress = null) => {
    let downloadedBytes = 0;
    
    if (m.type === 'viewOnceMessage') {
        m.type = m.msg.type;
    }

    try {
        let stream;
        let fileExtension;
        
        if (m.type === 'imageMessage') {
            fileExtension = '.jpg';
            stream = await downloadContentFromMessage(m.msg, 'image');
        } else if (m.type === 'videoMessage') {
            fileExtension = '.mp4';
            stream = await downloadContentFromMessage(m.msg, 'video');
        } else if (m.type === 'audioMessage') {
            fileExtension = '.mp3';
            stream = await downloadContentFromMessage(m.msg, 'audio');
        } else if (m.type === 'documentMessage') {
            const originalName = m.msg.fileName || 'document';
            fileExtension = path.extname(originalName) || '.bin';
            stream = await downloadContentFromMessage(m.msg, 'document');
        } else {
            throw new Error('Unsupported media type for progress download: ' + m.type);
        }

        const outputFilename = filename ? filename + fileExtension : 'download_' + Date.now() + fileExtension;
        const writeStream = fs.createWriteStream(outputFilename);

        for await (const chunk of stream) {
            downloadedBytes += chunk.length;
            writeStream.write(chunk);
            
            if (onProgress && typeof onProgress === 'function') {
                onProgress(downloadedBytes);
            }
        }

        writeStream.end();
        
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });

        return {
            filePath: outputFilename,
            size: downloadedBytes,
            filename: outputFilename
        };

    } catch (error) {
        console.error('Progress download error:', error);
        throw error;
    }
}

const getMediaType = (messageType) => {
    const typeMap = {
        'imageMessage': 'image',
        'videoMessage': 'video',
        'audioMessage': 'audio',
        'stickerMessage': 'sticker',
        'documentMessage': 'document'
    };
    return typeMap[messageType] || 'document';
}

const sms = (queenElisa, m) => {
    if (m.key) {
        m.id = m.key.id
        m.chat = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = m.fromMe ? queenElisa.user.id.split(':')[0]+'@s.whatsapp.net' : m.isGroup ? m.key.participant : m.key.remoteJid
    }
    
    if (m.message) {
        m.type = getContentType(m.message)
        m.msg = (m.type === 'viewOnceMessage') ? m.message[m.type].message[getContentType(m.message[m.type].message)] : m.message[m.type]
        
        if (m.msg) {
            if (m.type === 'viewOnceMessage') {
                m.msg.type = getContentType(m.message[m.type].message)
            }
            
            var quotedMention = m.msg.contextInfo != null ? m.msg.contextInfo.participant : ''
            var tagMention = m.msg.contextInfo != null ? m.msg.contextInfo.mentionedJid : []
            var mention = typeof(tagMention) == 'string' ? [tagMention] : tagMention
            mention != undefined ? mention.push(quotedMention) : []
            m.mentionUser = mention != undefined ? mention.filter(x => x) : []
            
            let bodyText = '';
            let isButtonMessage = false;
            let buttonId = '';
            let buttonText = '';
            
            if (m.type === 'templateButtonReplyMessage') {
                bodyText = m.msg.selectedId || '';
                buttonId = m.msg.selectedId || '';
                buttonText = m.msg.selectedDisplayText || '';
                isButtonMessage = true;
            }
            else if (m.type === 'buttonsResponseMessage') {
                bodyText = m.msg.selectedButtonId || '';
                buttonId = m.msg.selectedButtonId || '';
                buttonText = m.msg.selectedDisplayText || '';
                isButtonMessage = true;
            }
            else if (m.type === 'listResponseMessage') {
                bodyText = m.msg.title || '';
                buttonId = m.msg.singleSelectReply?.selectedRowId || '';
                buttonText = m.msg.singleSelectReply?.selectedRowId || '';
                isButtonMessage = true;
            }
            else if (m.type === 'interactiveResponseMessage') {
                bodyText = m.msg.body || '';
                buttonId = m.msg.nativeFlowResponseMessage?.paramsJson || '';
                isButtonMessage = true;
            }
            else {
                bodyText = (m.type === 'conversation') ? m.msg : 
                          (m.type === 'extendedTextMessage') ? m.msg.text : 
                          (m.type == 'imageMessage') && m.msg.caption ? m.msg.caption : 
                          (m.type == 'videoMessage') && m.msg.caption ? m.msg.caption : 
                          (m.type == 'templateButtonReplyMessage') && m.msg.selectedId ? m.msg.selectedId : 
                          (m.type == 'buttonsResponseMessage') && m.msg.selectedButtonId ? m.msg.selectedButtonId : ''
            }
            
            m.body = bodyText;
            m.isButtonMessage = isButtonMessage;
            m.buttonId = buttonId;
            m.buttonText = buttonText;
            
            m.quoted = m.msg.contextInfo != undefined ? m.msg.contextInfo.quotedMessage : null
            if (m.quoted) {
                m.quoted.type = getContentType(m.quoted)
                m.quoted.id = m.msg.contextInfo.stanzaId
                m.quoted.sender = m.msg.contextInfo.participant
                m.quoted.fromMe = m.quoted.sender.split('@')[0].includes(queenElisa.user.id.split(':')[0])
                m.quoted.msg = (m.quoted.type === 'viewOnceMessage') ? m.quoted[m.quoted.type].message[getContentType(m.quoted[m.quoted.type].message)] : m.quoted[m.quoted.type]
                if (m.quoted.type === 'viewOnceMessage') {
                    m.quoted.msg.type = getContentType(m.quoted[m.quoted.type].message)
                }
                var quoted_quotedMention = m.quoted.msg.contextInfo != null ? m.quoted.msg.contextInfo.participant : ''
                var quoted_tagMention = m.quoted.msg.contextInfo != null ? m.quoted.msg.contextInfo.mentionedJid : []
                var quoted_mention = typeof(quoted_tagMention) == 'string' ? [quoted_tagMention] : quoted_tagMention
                quoted_mention != undefined ? quoted_mention.push(quoted_quotedMention) : []
                m.quoted.mentionUser = quoted_mention != undefined ? quoted_mention.filter(x => x) : []
                m.quoted.fakeObj = proto.WebMessageInfo.fromObject({
                    key: {
                        remoteJid: m.chat,
                        fromMe: m.quoted.fromMe,
                        id: m.quoted.id,
                        participant: m.quoted.sender
                    },
                    message: m.quoted
                })
                m.quoted.download = (filename, options) => downloadMediaMessage(m.quoted, filename, options)
                m.quoted.downloadWithProgress = (filename, onProgress) => downloadWithProgress(m.quoted, filename, onProgress)
                m.quoted.delete = () => queenElisa.sendMessage(m.chat, { delete: m.quoted.fakeObj.key })
                m.quoted.react = (emoji) => queenElisa.sendMessage(m.chat, { react: { text: emoji, key: m.quoted.fakeObj.key } })
            }
        }
        
        m.download = (filename, options = {}) => downloadMediaMessage(m, filename, options)
        m.downloadWithProgress = (filename, onProgress) => downloadWithProgress(m, filename, onProgress)
    }
    
    m.reply = (teks, id = m.chat, option = { mentions: [m.sender] }) => queenElisa.sendMessage(id, { text: teks, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
    m.replyS = (stik, id = m.chat, option = { mentions: [m.sender] }) => queenElisa.sendMessage(id, { sticker: stik, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
    m.replyImg = (img, teks, id = m.chat, option = { mentions: [m.sender] }) => queenElisa.sendMessage(id, { image: img, caption: teks, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
    m.replyVid = (vid, teks, id = m.chat, option = { mentions: [m.sender], gif: false }) => queenElisa.sendMessage(id, { video: vid, caption: teks, gifPlayback: option.gif, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
    m.replyAud = (aud, id = m.chat, option = { mentions: [m.sender], ptt: false }) => queenElisa.sendMessage(id, { audio: aud, ptt: option.ptt, mimetype: 'audio/mpeg', contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
    m.replyDoc = (doc, id = m.chat, option = { mentions: [m.sender], filename: 'undefined.pdf', mimetype: 'application/pdf' }) => queenElisa.sendMessage(id, { document: doc, mimetype: option.mimetype, fileName: option.filename, contextInfo: { mentionedJid: option.mentions } }, { quoted: m })
    m.replyContact = (name, info, number) => {
        var vcard = 'BEGIN:VCARD\n' + 'VERSION:3.0\n' + 'FN:' + name + '\n' + 'ORG:' + info + ';\n' + 'TEL;type=CELL;type=VOICE;waid=' + number + ':+' + number + '\n' + 'END:VCARD'
        queenElisa.sendMessage(m.chat, { contacts: { displayName: name, contacts: [{ vcard }] } }, { quoted: m })
    }
    m.react = (emoji) => queenElisa.sendMessage(m.chat, { react: { text: emoji, key: m.key } })
    
    m.replyButtons = (text, buttons, id = m.chat, options = {}) => {
        const message = {
            text: text,
            buttons: buttons,
            headerType: 1
        }
        return queenElisa.sendMessage(id, message, { quoted: m, ...options })
    }

    m.replyImageButtons = (image, caption, buttons, id = m.chat, options = {}) => {
        const message = {
            image: image,
            caption: caption,
            buttons: buttons,
            headerType: 1
        }
        return queenElisa.sendMessage(id, message, { quoted: m, ...options })
    }

    m.replyList = (text, buttonText, sections, id = m.chat, options = {}) => {
        const message = {
            text: text,
            footer: buttonText,
            buttons: [
                {
                    buttonId: 'list',
                    buttonText: { displayText: buttonText },
                    type: 1
                }
            ],
            sections: sections
        }
        return queenElisa.sendMessage(id, message, { quoted: m, ...options })
    }
    
    return m
}

const createButtons = (buttonsArray) => {
    return buttonsArray.map(btn => ({
        buttonId: btn.id,
        buttonText: { displayText: btn.text },
        type: btn.type || 1
    }))
}

const createListSection = (title, rows) => {
    return {
        title: title,
        rows: rows.map(row => ({
            title: row.title,
            description: row.description,
            rowId: row.id
        }))
    }
}

module.exports = { 
    sms, 
    downloadMediaMessage,
    downloadWithProgress,
    createButtons,
    createListSection,
    getMediaType
}