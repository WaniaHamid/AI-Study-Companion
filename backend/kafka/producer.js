const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'ai-study-companion',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  retry: { initialRetryTime: 300, retries: 3 },
});

const producer = kafka.producer();
let isConnected = false;

const TOPICS = [
  'document_uploaded',
  'ai_request_created',
  'ai_response_generated',
  'quiz_generated',
  'quiz_submitted',
];

const initKafkaProducer = async () => {
  const admin = kafka.admin();
  await admin.connect();

  const existingTopics = await admin.listTopics();
  const topicsToCreate = TOPICS.filter(t => !existingTopics.includes(t)).map(topic => ({
    topic,
    numPartitions: 1,
    replicationFactor: 1,
  }));

  if (topicsToCreate.length > 0) {
    await admin.createTopics({ topics: topicsToCreate });
    console.log('✅ Kafka topics created:', topicsToCreate.map(t => t.topic).join(', '));
  }

  await admin.disconnect();
  await producer.connect();
  isConnected = true;
  console.log('✅ Kafka producer connected');
};

const publishEvent = async (topic, message) => {
  if (!isConnected) {
    console.debug(`[Kafka] Skipped event (not connected): ${topic}`);
    return;
  }
  try {
    await producer.send({
      topic,
      messages: [{ key: message.userId || null, value: JSON.stringify(message) }],
    });
    console.debug(`[Kafka] Published to ${topic}:`, message);
  } catch (error) {
    console.error(`[Kafka] Failed to publish to ${topic}:`, error.message);
  }
};

const disconnectProducer = async () => {
  if (isConnected) {
    await producer.disconnect();
    isConnected = false;
  }
};

process.on('SIGTERM', disconnectProducer);
process.on('SIGINT', disconnectProducer);

module.exports = { initKafkaProducer, publishEvent, TOPICS };
