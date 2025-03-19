import { ApolloClient, InMemoryCache, ApolloProvider, gql, useQuery, useSubscription } from '@apollo/client';
import { WebSocketLink } from '@apollo/client/link/ws';

// Create WebSocket link for subscriptions
const wsLink = new WebSocketLink({
  uri: 'ws://localhost:4002/subscriptions', // Match the subscription path
  options: {
    reconnect: true,
  },
});

// Create Apollo Client
const client = new ApolloClient({
  link: wsLink,
  cache: new InMemoryCache(),
});

// Wrap your app with ApolloProvider
export default function App({ Component, pageProps }) {
  return (
    <ApolloProvider client={client}>
      <Component {...pageProps} />
    </ApolloProvider>
  );
}