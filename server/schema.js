import { buildSchema } from 'graphql';
import crypto from 'crypto';
import query from './db';
import getPostFromDbResult from './post';

// Construct a schema, using GraphQL schema language
const schema = buildSchema(`
input PostInput {
  title: String
  text: String
  authorId: String
}

type Post {
  id: String!
  title: String!
  text: String!
  authorId: String
  name: String
  date: String
}

type Query {
  getAllPosts: [Post]
  getPaginatedPosts(limit: Int, offset: Int): [Post]
  getPost(id: ID!): Post
}

type Mutation {
  createPost(input: PostInput): Post
  updatePost(id: ID!, input: PostInput): Post
}
`);

/* Variable which contains the resolvers.
In case if there is an error we just throw the error to GraphQl.
No status codes are used in GraphQl */
const root = {
  async getPost({ id }) {
    if (id === null || id === undefined) {
      throw new Error('Invalid id provided');
    }

    const postQuery = `SELECT 
    posts.id, posts.title, posts.text, posts.date, posts.author_id, authors.name 
    FROM posts 
    INNER JOIN authors ON authors.id=posts.author_id
    WHERE posts.id='${id}'
    ORDER BY posts.date;`;

    try {
      const dbRes = await query(postQuery);
      if (dbRes.rowCount === 0) {
        throw new Error(`Post with id=${id} is not found`);
      }

      return getPostFromDbResult(dbRes.rows[0]);
    } catch (err) {
      console.error(err.stack);
      throw err;
    }
  },
  // returns all posts to client
  async getAllPosts() {
    const allPostsQuery = `SELECT 
      posts.id, posts.title, posts.text, posts.date, posts.author_id, authors.name
      FROM posts 
      INNER JOIN authors ON authors.id=posts.author_id
      ORDER BY posts.date;`;

    try {
      const dbRes = await query(allPostsQuery);
      return dbRes.rows.map(getPostFromDbResult);
    } catch (err) {
      console.error(err.stack);
      throw err;
    }
  },
  // returns "limit" number of posts starting from "offset"
  async getPaginatedPosts({ limit, offset }) {
    const postsQuery = `SELECT 
      posts.id, posts.title, posts.text, posts.date, posts.author_id, authors.name 
      FROM posts 
      INNER JOIN authors ON authors.id=posts.author_id 
      LIMIT ${limit} OFFSET ${offset} 
      ORDER BY posts.date;`;

    try {
      const dbRes = await query(postsQuery);
      return dbRes.rows.map(getPostFromDbResult);
    } catch (err) {
      console.error(err.stack);
      throw err;
    }
  },
  // create new post using specified input parameters
  async createPost({ input }) {
    // create a random id for our "database".
    const id = crypto.randomBytes(10).toString('hex');
    const queryText = `INSERT INTO 
    posts(id, title, text, author_id, date) 
    VALUES($1, $2, $3, $4, $5) RETURNING *;`;
    const now = new Date();
    try {
      const dbRes = await query(queryText, [id, input.title, input.text, input.authorId, now]);
      return getPostFromDbResult(dbRes.rows[0]);
    } catch (err) {
      console.error(err.stack);
      throw err;
    }
  },
  // update post with specified id using input values
  async updatePost({ id, input }) {
    const updateQuery = `UPDATE posts 
      SET title=$1, text=$2 
      WHERE posts.id=$3 RETURNING *`;

    try {
      const dbRes = await query(updateQuery, [input.title, input.text, id]);
      if (dbRes.rowCount === 0) {
        throw new Error(`Post with id=${id} is not found`);
      }
      return getPostFromDbResult(dbRes.rows[0]);
    } catch (err) {
      console.error(err.stack);
      throw err;
    }
  },
};

export { schema, root };
