// backend/services/dailySummaryScheduler.js

const logger = require('../config/logger');
const { generateDailySummaryForChatbot } = require('./summaries');
const { sendDailySummaryEmail } = require('./email');

async function runDailySummaries(date) {
  const { supabase } = require('../config/database');
  if (!supabase) {
    return;
  }

  const { data: chatbots } = await supabase
    .from('chatbots')
    .select('id, name, user_id');

  for (const chatbot of chatbots || []) {
    try {
      const summary = await generateDailySummaryForChatbot(chatbot.id, date);

      await supabase
        .from('daily_summaries')
        .upsert(summary, { onConflict: 'chatbot_id,summary_date' });

      const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('id', chatbot.user_id)
        .single();

      if (user?.email) {
        await sendDailySummaryEmail({
          to: user.email,
          chatbotName: chatbot.name,
          summary,
        });
      }
    } catch (err) {
      logger.error('Daily summary generation failed', {
        chatbotId: chatbot.id,
        error: err.message,
      });
    }
  }
}

function startDailySummaryScheduler() {
  const enabled = process.env.ENABLE_DAILY_SUMMARY_SCHEDULER === 'true';
  if (!enabled) {
    logger.info('Daily summary scheduler disabled');
    return;
  }

  logger.info('Daily summary scheduler started');

  setInterval(async () => {
    const today = new Date().toISOString().slice(0, 10);
    await runDailySummaries(today);
  }, 24 * 60 * 60 * 1000);
}

module.exports = {
  startDailySummaryScheduler,
  runDailySummaries,
};
