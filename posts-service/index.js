const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/use/ws');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { PrismaClient } = require('@prisma/client');
const { PubSub } = require('graphql-subscriptions');
const gql = require('graphql-tag');

const prisma = new PrismaClient();
const pubsub = new PubSub();
const POST_CREATED = "POST_CREATED";

// GraphQL Schema (without published)
const typeDefs = gql`
  type Post {
    id: Int!
    title: String!
    content: String!
  }

  type Query {
    posts: [Post!]!
    post(id: Int!): Post
  }

  type Mutation {
    createPost(title: String!, content: String!): Post!
    updatePost(id: Int!, title: String, content: String): Post
    deletePost(id: Int!): Post
  }
  
  type Subscription {
    postCreated: Post!
  }
`;

// Resolvers (without published)
const resolvers = {
  Query: {
    posts: () => prisma.post.findMany(),
    post: (_, { id }) => prisma.post.findUnique({ where: { id } }),
  },
  Mutation: {
    createPost: async (_, args) => {
      const post = await prisma.post.create({ data: args });
      pubsub.publish(POST_CREATED, { postCreated: post });
      return post;
    },
    updatePost: async (_, { id, ...data }) => {
      return prisma.post.update({ where: { id }, data });
    },
    deletePost: (_, { id }) => prisma.post.delete({ where: { id } }),
  },
  Subscription: {
    postCreated: {
      subscribe: () => pubsub.asyncIterableIterator([POST_CREATED]),
    },
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  const server = new ApolloServer({ schema });
  await server.start();
  server.applyMiddleware({ app, path: '/' });

  // Set up WebSocket server for subscriptions
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });
  useServer({ schema }, wsServer);

  const PORT = 4002;
  httpServer.listen(PORT, () => {
    console.log(`Posts service running at http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`Subscriptions ready at ws://localhost:${PORT}${server.graphqlPath}`);
  });
}

startServer().catch(error => console.error(error));
