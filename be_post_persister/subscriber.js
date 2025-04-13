// subscriber.js
const amqp = require('amqplib');
const fetch = require('node-fetch');

const RABBITMQ_URL = 'amqp://localhost';
const QUEUE_NAME = 'posts_queue';

// URL for the Posts-service GraphQL endpoint
const POSTS_GRAPHQL_ENDPOINT = 'http://localhost:4002/graphql'; // adjust port if necessary

// GraphQL Mutation to insert a post (adjust field names as per your schema)
const CREATE_POST_MUTATION = `
  mutation CreatePost($title: String!, $content: String!) {
    createPost(title: $title, content: $content) {
      id
      title
    }
  }
`;

async function callGraphQLMutation(postData) {
  try {
    const response = await fetch(POSTS_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: CREATE_POST_MUTATION,
        variables: postData
      })
    });
    const result = await response.json();
    console.log('GraphQL Mutation Result:', result);
  } catch (error) {
    console.error('Error calling GraphQL endpoint:', error);
  }
}

async function startSubscriber() {
  try {
    // Connect to RabbitMQ
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log(' [*] Waiting for messages in %s. To exit press CTRL+C', QUEUE_NAME);

    // Consume messages from the queue
    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg !== null) {
        const messageContent = msg.content.toString();
        console.log(' [x] Received message:', messageContent);

        // Parse the message (assumed to be JSON)
        let postData;
        try {
          postData = JSON.parse(messageContent);
        } catch (error) {
          console.error('Error parsing message:', error);
          // Acknowledge so it doesn’t get requeued indefinitely
          channel.ack(msg);
          return;
        }

        // Call GraphQL mutation to persist the post
        await callGraphQLMutation(postData);

        // After processing, acknowledge the message so it is removed from the queue
        channel.ack(msg);
      }
    }, { noAck: false });
  } catch (error) {
    console.error('Error in subscriber:', error);
  }
}

startSubscriber();
