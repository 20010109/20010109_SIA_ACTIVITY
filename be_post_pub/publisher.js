// publisher.js
const amqp = require('amqplib');
const { faker } = require('@faker-js/faker'); // or @faker-js/faker in newer versions

// RabbitMQ connection URL (using the default connection string)
const RABBITMQ_URL = 'amqp://localhost';
// The queue we will publish messages to
const QUEUE_NAME = 'posts_queue';

async function publishMessage(message) {
  try {
    // Connect to RabbitMQ
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    // Make sure the queue exists
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    // Publish the message to the queue
    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(message)), {
      persistent: true
    });
    console.log(' [x] Published message:', message);

    // Close connection after a brief delay so the message is sent
    setTimeout(() => {
      connection.close();
    }, 500);
  } catch (error) {
    console.error('Error publishing message:', error);
  }
}

function generateSyntheticPost() {
    return {
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraphs(2),
      authorId: faker.string.uuid(), 
      createdAt: new Date().toISOString()
    };
  }
  

// Publish synthetic posts every few seconds
setInterval(() => {
  const post = generateSyntheticPost();
  publishMessage(post);
}, 5000); // every 5 seconds
