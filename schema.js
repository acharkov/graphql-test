let { buildSchema } = require('graphql');
let { Pool } = require('pg');
let pool = new Pool();
let db = require('./db');

// Construct a schema, using GraphQL schema language
let schema = buildSchema(`
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

// variable which contains the resolvers. 
// In case if there is an error we just throw the error to GraphQl.
// No status codes are used in GraphQl.
let root = {
  getPost: function ({ id }) {
    const postQuery = `SELECT 
      posts.id, posts.title, posts.text, posts.date, posts.author_id, authors.name 
      FROM posts 
      INNER JOIN authors ON authors.id=posts.author_id
      WHERE posts.id='${id}'
      ORDER BY posts.date;`

    return db.query(postQuery)
      .then(res => {
        if (res.rowCount === 0) {
          throw new Error(`Post with id=${id} is not found`);
        }
        return db.convertDbResultToPost(res.rows[0]);
      })
      .catch(err => {
        console.error(err.stack);
        throw err;
      })
  },
  // returns all posts to client
  getAllPosts: function () {
    const allPostsQuery =`SELECT 
      posts.id, posts.title, posts.text, posts.date, posts.author_id, authors.name
      FROM posts 
      INNER JOIN authors ON authors.id=posts.author_id
      ORDER BY posts.date;`

    return db.query(allPostsQuery)
      .then(res => {
        return db.convertDbResultToPostArray(res.rows)
      })
      .catch(err => {
        console.error(err.stack)
        throw err;
      })
  },
  // returns "limit" number of posts starting from "offset"
  getPaginatedPosts: function ({ limit, offset }) {
    const postsQuery = `SELECT 
      posts.id, posts.title, posts.text, posts.date, posts.author_id, authors.name 
      FROM posts 
      INNER JOIN authors ON authors.id=posts.author_id 
      LIMIT ${limit} OFFSET ${offset} 
      ORDER BY posts.date;`

    return db.query(postsQuery)
      .then(res => {
        return db.convertDbResultToPostArray(res.rows);
      })
      .catch(err => {
        console.error(err.stack);
        throw err;
      })
  },
  // create new post using specified input parameters
  createPost: function ({ input }) {
    // create a random id for our "database".
    let id = require('crypto').randomBytes(10).toString('hex');
    let queryText = 'INSERT INTO posts(id, title, text, author_id, date) VALUES($1, $2, $3, $4, $5) RETURNING *;';
    let now = new Date();

    return db.query(queryText, [id, input.title, input.text, input.authorId, now])
      .then(res => {
        return db.convertDbResultToPost(res.rows[0]);
      })
      .catch(err => {
        console.error(err.stack);
        throw err;
      })
  },
  // update post with specified id using input values
  updatePost: function ({ id, input }) {
    const updateQuery = `UPDATE posts 
      SET title='${input.title}', text='${input.text}' 
      WHERE posts.id='${id}' RETURNING *`

    return db.query(updateQuery)
      .then(res => {
        return db.convertDbResultToPost(res.rows[0]);
      })
      .catch(err => {
        console.error(err.stack);
        throw err;
      })
  },
};

module.exports = { schema, root };