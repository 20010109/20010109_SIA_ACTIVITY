const { ApolloServer, gql } = require('apollo-server');
const { PrismaClient } = require('@prisma/client');
const { PubSub } = require('graphql-subscriptions'); // Import PubSub

const prisma = new PrismaClient();
const pubsub = new PubSub(); // Create a PubSub instance

// GraphQL Schema
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
    updatePost(id: Int!, title: String, content: String): Post!
    deletePost(id: Int!): Post!
  }

  type Subscription {
    postCreated: Post!
    postUpdated: Post!
    postDeleted: Post!
  }
`;

// Resolvers
const resolvers = {
  Query: {
    posts: () => prisma.post.findMany(),
    post: (_, args) => prisma.post.findUnique({ where: { id: args.id } }),
  },
  Mutation: {
    createPost: (_, args) => {
      const newPost = prisma.post.create({ data: { title: args.title, content: args.content } });

      // Publish the new post to the subscription
      pubsub.publish('POST_CREATED', { postCreated: newPost });

      return newPost;
    },
    updatePost: (_, args) => {
      const updatedPost = prisma.post.update({
        where: { id: args.id },
        data: { title: args.title, content: args.content },
      });

      // Publish the updated post to the subscription
      pubsub.publish('POST_UPDATED', { postUpdated: updatedPost });

      return updatedPost;
    },
    deletePost: (_, args) => {
      const deletedPost = prisma.post.delete({ where: { id: args.id } });

      // Publish the deleted post to the subscription
      pubsub.publish('POST_DELETED', { postDeleted: deletedPost });

      return deletedPost;
    },
  },
  Subscription: {
    postCreated: {
      subscribe: () => pubsub.asyncIterator(['POST_CREATED']), // Listen for post creation events
    },
    postUpdated: {
      subscribe: () => pubsub.asyncIterator(['POST_UPDATED']), // Listen for post update events
    },
    postDeleted: {
      subscribe: () => pubsub.asyncIterator(['POST_DELETED']), // Listen for post deletion events
    },
  },
};

// Start the Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  subscriptions: {
    path: '/subscriptions', // Subscription endpoint
  },
});

server.listen({ port: 4002 }).then(({ url, subscriptionsUrl }) => {
  console.log(`Posts service running at ${url}`);
  console.log(`Subscriptions ready at ${subscriptionsUrl}`);
});