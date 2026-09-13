const { Kafka } = require('kafkajs');
const User = require('../models/User');

const kafka = new Kafka({
  clientId: `${process.env.KAFKA_CLIENT_ID || 'ai-study-companion'}-consumer`,
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

const consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID || 'study-companion-group',
});

const handlers = {
  document_uploaded: async (message) => {
    console.log(`[Notification] Document uploaded: "${message.title}" by user ${message.userId}`);
    // Here you'd send a WebSocket push, email, or in-app notification
    // Example: await NotificationService.send(message.userId, `Your document "${message.title}" is ready!`);
  },

  ai_response_generated: async (message) => {
    console.log(`[Notification] AI response ready for user ${message.userId}`);
  },

  quiz_generated: async (message) => {
    console.log(`[Notification] Quiz generated (${message.questionCount} questions) for user ${message.userId}`);
  },

  quiz_submitted: async (message) => {
    console.log(`[Analytics] Quiz submitted — score: ${message.percentage}% by user ${message.userId}`);
    // Update streak logic
    try {
      const user = await User.findById(message.userId);
      if (user) {
        const lastActive = new Date(user.progress.lastActive);
        const now = new Date();
        const diffDays = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
        const newStreak = diffDays <= 1 ? user.progress.streak + 1 : 1;
        await User.findByIdAndUpdate(message.userId, {
          'progress.streak': newStreak,
          'progress.lastActive': now,
        });
      }
    } catch (err) {
      console.error('[Kafka] Streak update error:', err.message);
    }
  },

  ai_request_created: async (message) => {
    console.log(`[AI] Request created for user ${message.userId}`);
  },
};

const startKafkaConsumers = async () => {
  await consumer.connect();
  await consumer.subscribe({ topics: Object.keys(handlers), fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const payload = JSON.parse(message.value.toString());
        const handler = handlers[topic];
        if (handler) await handler(payload);
      } catch (error) {
        console.error(`[Kafka] Error processing message on ${topic}:`, error.message);
      }
    },
  });

  console.log('✅ Kafka consumers started');
};

const disconnectConsumer = async () => {
  await consumer.disconnect();
};

process.on('SIGTERM', disconnectConsumer);
process.on('SIGINT', disconnectConsumer);

module.exports = { startKafkaConsumers };
