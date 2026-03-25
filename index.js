import "./config.js";
import handler from "./handler.js";
import events from "./plugins/_events.js";
import {
  Browsers,
  makeWASocket,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  jidDecode,
  DisconnectReason,
} from "@whiskeysockets/baileys";

import pino from "pino";
import crypto from "crypto";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import readline from "readline";
import os from "os";
import qrcode from "qrcode-terminal";
import parsePhoneNumber from "awesome-phonenumber";
import { smsg } from "./lib/message.js";
import db from "./lib/system/database.js";
import { startSubBot } from "./lib/subs.js";
import { exec, execSync } from "child_process";
import moment from "moment-timezone";

const log = {
  info: (msg) => console.log(chalk.bgBlue.white.bold(`INFO`), chalk.white(msg)),
  success: (msg) =>
    console.log(chalk.bgGreen.white.bold(`SUCCESS`), chalk.greenBright(msg)),
  warn: (msg) =>
    console.log(
      chalk.bgYellowBright.blueBright.bold(`WARNING`),
      chalk.yellow(msg)
    ),
  warning: (msg) =>
    console.log(chalk.bgYellowBright.red.bold(`WARNING`), chalk.yellow(msg)),
  error: (msg) =>
    console.log(chalk.bgRed.white.bold(`ERROR`), chalk.redBright(msg)),
};

const print = (label, value) =>
  console.log(
    `${chalk.green.bold("║")} ${chalk.cyan.bold(label.padEnd(16))}${chalk.magenta.bold(":")} ${value}`
  );
const pairingCode = process.argv.includes("--qr")
  ? false
  : process.argv.includes("--pairing-code") || global.pairing_code;
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const question = (text) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(text, resolve);
  });
};
const usePairingCode = true;

const userInfoSyt = () => {
  try {
    return os.userInfo().username;
  } catch (e) {
    return process.env.USER || process.env.USERNAME || "unknown";
  }
};

console.log(chalk.bold.cyan("Made With | Magical"));
console.log(chalk.bold.cyan("Copyright (C) - ") + chalk.bold.red("QUEEN NAZUMA MINI"));

const ramInGB = os.totalmem() / (1024 * 1024 * 1024);
const freeRamInGB = os.freemem() / (1024 * 1024 * 1024);
const currentTime = new Date().toLocaleString();
const info = `\n╭─────────────────────────────◉\n│ ${chalk.red.bgBlueBright.bold("        🖥 SYSTEM INFORMATION        ")}\n│「 💻 」${chalk.yellow(`OS: ${os.type()}, ${os.release()} - ${os.arch()}`)}\n│「 💾 」${chalk.yellow(`Total RAM: ${ramInGB.toFixed(2)} GB`)}\n│「 💽 」${chalk.yellow(`Free RAM: ${freeRamInGB.toFixed(2)} GB`)}\n╰─────────────────────────────◉\n\n╭─────────────────────────────◉\n│ ${chalk.red.bgGreenBright.bold("        🟢 BOT INFORMATION        ")}\n│「 🎈 」${chalk.cyan(`Name » QUEEN NAZUMA MINI`)}\n│「 🍒 」${chalk.cyan(`Version » 1.0`)}\n│「 🍉 」${chalk.cyan(`Description » WhatsApp Bot`)}\n│「 🚩 」${chalk.cyan(`Author » AYAN CODEX`)}\n╰─────────────────────────────◉\n\n╭─────────────────────────────◉\n│ ${chalk.red.bgMagenta.bold("        ⏰ CURRENT TIME        ")}\n│「 🕒 」${chalk.magenta(`${currentTime}`)}\n╰─────────────────────────────◉\n`;
console.log(info);

const BOT_TYPES = [
  { name: "SubBot", folder: "./Sessions/Subs", starter: startSubBot },
];

global.conns = global.conns || [];
const reconnecting = new Set();

async function loadBots() {
  for (const { name, folder, starter } of BOT_TYPES) {
    if (!fs.existsSync(folder)) continue;
    const botIds = fs.readdirSync(folder);
    for (const userId of botIds) {
      const sessionPath = path.join(folder, userId);
      const credsPath = path.join(sessionPath, "creds.json");
      if (!fs.existsSync(credsPath)) continue;
      if (global.conns.some((conn) => conn.userId === userId)) continue;
      if (reconnecting.has(userId)) continue;
      try {
        reconnecting.add(userId);
        await starter(null, null, "Auto reconnect", false, userId, sessionPath);
      } catch (e) {
        reconnecting.delete(userId);
      }
      await new Promise((res) => setTimeout(res, 2500));
    }
  }
  setTimeout(loadBots, 60 * 1000);
}

(async () => {
  await loadBots();
})();

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(global.sessionName);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  const logger = pino({ level: "silent" });

  console.info = () => {};
  console.debug = () => {};
  const clientt = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    browser: Browsers.macOS("Chrome"),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    getMessage: async () => "",
    keepAliveIntervalMs: 45000,
    maxIdleTimeMs: 60000,
  });

  global.client = clientt;
  client.isInit = false;
  client.ev.on("creds.update", saveCreds);

  if (!client.authState.creds.registered) {
    const phoneNumber = await question(
      chalk.bgYellowBright.blueBright.bold(`WARNING`) +
        " " +
        chalk.yellow("Enter your WhatsApp number\n") +
        chalk.bgBlue.white.bold(`INFO`) +
        " " +
        chalk.white("Example: 258833406646") +
        chalk.yellow("\n---> ")
    );
    try {
      log.info("Requesting pairing code...");
      const pairing = await client.requestPairingCode(phoneNumber);
      log.success(
        `Pairing code: ${chalk.cyanBright(pairing)} (expires in 15s)`
      );
    } catch (err) {
      log.error("Error requesting pairing code:", err);
      exec("rm -rf ./Sessions/Owner/*");
      process.exit(1);
    }
  }

  client.sendText = (jid, text, quoted = "", options) =>
    client.sendMessage(jid, { text: text, ...options }, { quoted });

  client.ev.on("connection.update", async (update) => {
    const {
      qr,
      connection,
      lastDisconnect,
      isNewLogin,
      receivedPendingNotifications,
    } = update;

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode || 0;
      if (reason === DisconnectReason.connectionLost) {
        log.warning("Connection lost, attempting to reconnect...");
        startBot();
      } else if (reason === DisconnectReason.connectionClosed) {
        log.warning("Connection closed, attempting to reconnect...");
        startBot();
      } else if (reason === DisconnectReason.restartRequired) {
        log.warning("Restart required...");
        startBot();
      } else if (reason === DisconnectReason.timedOut) {
        log.warning("Connection timeout, attempting to reconnect...");
        startBot();
      } else if (reason === DisconnectReason.badSession) {
        log.warning("Delete session and scan again...");
        startBot();
      } else if (reason === DisconnectReason.connectionReplaced) {
        log.warning("Please close the current session first...");
      } else if (reason === DisconnectReason.loggedOut) {
        log.warning("Scan again and run...");
        exec("rm -rf ./Sessions/Owner/*");
        process.exit(1);
      } else if (reason === DisconnectReason.forbidden) {
        log.error("Connection error, scan again and run...");
        exec("rm -rf ./Sessions/Owner/*");
        process.exit(1);
      } else if (reason === DisconnectReason.multideviceMismatch) {
        log.warning("Restart now");
        exec("rm -rf ./Sessions/Owner/*");
        process.exit(0);
      } else {
        client.end(
          `Unknown disconnect reason: ${reason}|${connection}`
        );
      }
    }

    if (connection == "open") {
      console.log(
        chalk.bold.greenBright(
          "\n✩ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈✦ QUEEN NAZUMA MINI ✦┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ ✩\n│\n│★ CONNECTION SUCCESSFUL WITH WHATSAPP 🌷\n│\n✩ ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈✦ ✅ ✦┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ ✩"
        )
      );
    }

    if (isNewLogin) {
      log.info("New device detected");
    }

    if (receivedPendingNotifications == "true") {
      log.warn("Please wait approximately 1 minute...");
      client.ev.flush();
    }
  });

  let m;
  client.ev.on("messages.upsert", async ({ messages }) => {
    try {
      m = messages[0];
      if (!m.message) return;
      m.message =
        Object.keys(m.message)[0] === "ephemeralMessage"
          ? m.message.ephemeralMessage.message
          : m.message;
      if (m.key && m.key.remoteJid === "status@broadcast") return;
      if (!client.public && !m.key.fromMe && messages.type === "notify") return;
      if (m.key.id.startsWith("BAE5") && m.key.id.length === 16) return;
      m = await smsg(client, m);
      handler(client, m, messages);
    } catch (err) {
      console.log(err);
    }
  });

  try {
    await events(client, m);
  } catch (err) {
    console.log(chalk.gray(`[ BOT  ]  → ${err}`));
  }

  client.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      let decode = jidDecode(jid) || {};
      return (
        (decode.user && decode.server && decode.user + "@" + decode.server) ||
        jid
      );
    } else return jid;
  };
}

(async () => {
  global.loadDatabase();
  console.log(chalk.gray("Database loaded successfully."));
  await startBot();
})();