import { Bot, Context, InlineKeyboard } from "grammy";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { initDatabase, query } from "./db";
import { StorageManager } from "./storage";
import { DockerManager } from "./docker";

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN || "8852284221:AAFHysf9GB9Jfh25tBYyg0K5SVxPINTINCY";
const REQUIRED_CHANNEL = process.env.REQUIRED_CHANNEL || "@MrTripleR_YT0";
const DEVELOPER = process.env.DEVELOPER || "@YaminOnFire07";
const BOT_NAME = process.env.BOT_NAME || "TYNEX HOSTING SERVER";

const ADMIN_IDS = process.env.ADMIN_IDS 
  ? process.env.ADMIN_IDS.split(",").map(id => parseInt(id.trim())) 
  : [];

const bot = new Bot(BOT_TOKEN);

// ১. চ্যানেল সাবস্ক্রিপশন চেক ফাংশন
async function checkSubscription(ctx: Context): Promise<boolean> {
  if (!ctx.from) return false;
  try {
    const chatMember = await ctx.api.getChatMember(REQUIRED_CHANNEL, ctx.from.id);
    return ["member", "creator", "administrator"].includes(chatMember.status);
  } catch (error) {
    console.error("Channel check error:", error);
    return false;
  }
}

// ২. প্রাইভেট হোস্টিং সিকিউরিটি চেক
function isAuthorizedUser(userId: number): boolean {
  if (ADMIN_IDS.length === 0) return true;
  return ADMIN_IDS.includes(userId);
}

// মেইন মেনু কিবোর্ড
const mainMenuKeyboard = new InlineKeyboard()
  .text("🚀 Create Project", "create_project")
  .text("📂 My Projects", "my_projects").row()
  .text("📊 Server Status", "server_status")
  .text("ℹ️ Help & Support", "help_info");

// /start কমান্ড
bot.command("start", async (ctx) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || "unknown";
  if (!userId) return;

  if (!isAuthorizedUser(userId)) {
    return ctx.reply("⛔ *ACCESS DENIED*\n\nThis is a private hosting server bot.", { parse_mode: "Markdown" });
  }

  const isJoined = await checkSubscription(ctx);
  if (!isJoined) {
    const joinKeyboard = new InlineKeyboard()
      .url("📢 Join Official Channel", "https://t.me/MrTripleR_YT0")
      .row()
      .text("🔄 Check Membership", "check_membership");

    return ctx.reply(
      `⚠️ *ATTENTION REQUIRED!*\n\nTo use *${BOT_NAME}*, you must join our update channel first.\n\n📌 Channel: ${REQUIRED_CHANNEL}`,
      { parse_mode: "Markdown", reply_markup: joinKeyboard }
    );
  }

  // ডাটাবেসে ইউজার রেজিস্টার বা আপডেট করা
  await query(
    `INSERT INTO users (telegram_id, username, role) VALUES ($1, $2, $3) 
     ON CONFLICT (telegram_id) DO UPDATE SET username = $2`,
    [userId, username, ADMIN_IDS.includes(userId) ? 'admin' : 'user']
  );

  await ctx.reply(
    `🔥 *WELCOME TO ${BOT_NAME}* 🔥\n\nPrivate Universal Telegram Hosting Server.\nManage your projects securely inside sandboxed containers.\n\n👨‍💻 Developer: ${DEVELOPER}\n📢 Channel: ${REQUIRED_CHANNEL}`,
    { parse_mode: "Markdown", reply_markup: mainMenuKeyboard }
  );
});

bot.callbackQuery("check_membership", async (ctx) => {
  const isJoined = await checkSubscription(ctx);
  if (!isJoined) {
    return ctx.answerCallbackQuery({ text: "❌ আপনি এখনো চ্যানেলে জয়েন করেননি!", show_alert: true });
  }
  await ctx.answerCallbackQuery({ text: "✅ ভেরিফিকেশন সফল!" });
  await ctx.editMessageText(`🔥 *${BOT_NAME}* 🔥\n\nSelect an option below:`, {
    parse_mode: "Markdown",
    reply_markup: mainMenuKeyboard,
  });
});

// প্রজেক্ট লিস্ট বা মাই প্রজেক্টস
bot.callbackQuery("my_projects", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const userRes = await query(`SELECT id FROM users WHERE telegram_id = $1`, [userId]);
  if (userRes.rows.length === 0) return ctx.answerCallbackQuery({ text: "User not found!" });

  const dbUserId = userRes.rows[0].id;
  const projectsRes = await query(`SELECT * FROM projects WHERE user_id = $1`, [dbUserId]);

  if (projectsRes.rows.length === 0) {
    return ctx.editMessageText("📂 You have no projects yet.\n\nClick '🚀 Create Project' to start.", {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard().text("« Back to Menu", "main_menu"),
    });
  }

  let text = `📂 *Your Projects:*\n\n`;
  const keyboard = new InlineKeyboard();

  for (const proj of projectsRes.rows) {
    text += `🔹 *${proj.name}* (${proj.runtime}) - \`${proj.status}\`\n`;
    keyboard.text(`⚙️ ${proj.name}`, `proj_${proj.id}`).row();
  }

  keyboard.text("« Back to Menu", "main_menu");
  await ctx.editMessageText(text, { parse_mode: "Markdown", reply_markup: keyboard });
});

// মেইন মেনু ও হেল্প
bot.callbackQuery("main_menu", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(`🔥 *${BOT_NAME}* 🔥\n\nSelect an option below:`, {
    parse_mode: "Markdown",
    reply_markup: mainMenuKeyboard,
  });
});

bot.callbackQuery("server_status", async (ctx) => {
  await ctx.answerCallbackQuery();
  const projCount = await query(`SELECT COUNT(*) FROM projects`);
  const runningCount = await query(`SELECT COUNT(*) FROM projects WHERE status = 'RUNNING'`);

  await ctx.editMessageText(
    `🖥 *SERVER STATUS*\n\n- **Total Projects:** ${projCount.rows[0].count}\n- **Running Containers:** ${runningCount.rows[0].count}\n- **Status:** Online & Secure ✅`,
    {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard().text("« Back to Menu", "main_menu"),
    }
  );
});

bot.callbackQuery("help_info", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `ℹ️ *Help & Support*\n\n- **Bot:** ${BOT_NAME}\n- **Developer:** ${DEVELOPER}\n- **Channel:** ${REQUIRED_CHANNEL}`,
    {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard().text("« Back to Menu", "main_menu"),
    }
  );
});

// ইনিশিয়ালাইজেশন ও স্টার্ট
async function startServer() {
  await initDatabase();
  bot.start();
  console.log(`[${BOT_NAME}] is running successfully!`);
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});