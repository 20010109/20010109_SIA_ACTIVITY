import React, { useState, useEffect } from 'react';
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  useQuery,
  useSubscription,
  gql,
  split,
  HttpLink,
} from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import './App.css';
// import classNames from 'classnames';

// Create an HTTP link to your posts-service (update the URL if necessary)
const httpLink = new HttpLink({
  uri: 'http://localhost:4002/', // Adjust if your posts-service runs on a different port or path
});

// Create a WebSocket link for subscriptions using graphql-ws
const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:4002/graphql', // Matches your posts-service subscription endpoint
  })
);

// Use split to send subscription operations to the wsLink and the rest to httpLink
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);

// Initialize Apollo Client
const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

// GraphQL query to fetch posts
const GET_POSTS = gql`
  query GetPosts {
    posts {
      id
      title
      content
    }
  }
`;

// GraphQL subscription for new posts
const POST_CREATED_SUBSCRIPTION = gql`
  subscription OnPostCreated {
    postCreated {
      id
      title
      content
    }
  }
`;

function PostsTable() {
  const { data, loading, error } = useQuery(GET_POSTS);
  const { data: subscriptionData } = useSubscription(POST_CREATED_SUBSCRIPTION);
  const [posts, setPosts] = useState([]);

  // Set posts from the query when loaded
  useEffect(() => {
    if (data && data.posts) {
      setPosts(data.posts);
    }
  }, [data]);

  // When a new post is received via subscription, append it to the posts list
  useEffect(() => {
    if (subscriptionData) {
      setPosts((prev) => [...prev, subscriptionData.postCreated]);
    }
  }, [subscriptionData]);

  if (loading) return <p>Loading posts...</p>;
  if (error) return <p>Error loading posts: {error.message}</p>;

  return (
    <div className='tablediv'>
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Content</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post, index) => (
            <tr
              key={post.id}
              className={`table-row ${index % 2 === 0 ? 'table-row-even' : 'table-row-odd'}`}
            >
              <td>{post.id}</td>
              <td>{post.title}</td>
              <td>{post.content}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function App() {
  return (
    <ApolloProvider client={client}>
      <div style={{ margin: '0px'}}>
        <h1 style={{ color:"black", backgroundColor:"#FFB22C", fontFamily:"Arial", padding:30, margin:0, textAlign:'center'}} >Posts Service</h1>
        <PostsTable />
      </div>
    </ApolloProvider>
  );
}

export default App;
