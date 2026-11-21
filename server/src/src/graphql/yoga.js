// Server GraphQL (graphql-yoga) yang dipasang di Express pada alamat /graphql.
import { createYoga, createSchema } from 'graphql-yoga';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';

// Membaca token JWT dari header "Authorization: Bearer <token>".
function buildContext({ request }) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return { user: null };
  try {
    const p = jwt.verify(token, env.JWT_SECRET);
    return { user: { id: p.sub, role: p.role, username: p.username } };
  } catch {
    return { user: null };
  }
}

const defaultQuery = `# 1) Jalankan login ini dulu, lalu salin nilai "token".
# 2) Buka tab "Headers" (kiri bawah) dan isi:  {"Authorization":"Bearer TOKEN_ANDA"}
mutation {
  login(username: "admin", password: "password123") {
    token
    user { name role }
  }
}
`;

export const yoga = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: '/graphql',
  context: buildContext,
  graphiql: env.NODE_ENV === 'production' ? false : { title: 'Warung POS - GraphQL', defaultQuery },
  landingPage: false,
  maskedErrors: env.NODE_ENV === 'production',
});
