let { buildSchema } = require('graphql');
let { Pool } = require('pg');
let pool = new Pool();
let Post = require('./post.js');
let db = require('./db');

// Construct a schema, using GraphQL schema language
let schema = buildSchema(`
input PostInput {
  title: String
  text: String
  authorId: String
}

type Post {
  id: String
  title: String
  text: String
  authorId: String
  name: String
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

let root = {
getPost: function({id}) {
  const postQuery = 
  `SELECT posts.id, posts.title, posts.text, authors.name 
  FROM posts 
  INNER JOIN authors ON authors.id=posts.authorId
  WHERE posts.id='${id}';`

  return db.query(postQuery)
    .then(res => {
        return res.rows[0];
    })
    .catch(e => {
        console.error(e.stack);
    })
},
getAllPosts: function () {
  const allPostsQuery = 
  `SELECT posts.id, posts.title, posts.text, authors.name
  FROM posts 
  INNER JOIN authors ON authors.id=posts.authorId;`

  return db.query(allPostsQuery)
    .then(res => {
        return res.rows;
    })
    .catch(e => {
        console.error(e.stack);
    })
},
getPaginatedPosts: function ({limit, offset}) {
  const postsQuery = 
  `SELECT posts.title, posts.text, authors.name 
  FROM posts 
  INNER JOIN authors ON authors.id=posts.authorId 
  LIMIT ${limit} OFFSET ${offset};`

  return db.query(postsQuery)
    .then(res => {
        return res.rows;
    })
    .catch(e => {
        console.error(e.stack);
    })
},
createPost: function ({input}) {
  // Create a random id for our "database".
  let id = require('crypto').randomBytes(10).toString('hex');
  let queryText = 'INSERT INTO posts(id, title, text, authorId) VALUES($1, $2, $3, $4)';

  return db.query(queryText, [id, input.title, input.text, input.authorId])
    .then(res => {
        return new Post(id, input);
    })
    .catch(e => {
        console.error(e.stack);
    })
},
updatePost: function ({id, input}) {
  const updateQuery=`UPDATE posts 
  SET title='${input.title}', text='${input.text}' 
  WHERE posts.id='${id}';`

  return db.query(updateQuery)
    .then(res => {
        return new Post(id, input);
    })
    .catch(e => {
        console.error(e.stack);
    })
},
};

module.exports =  { schema, root };