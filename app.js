'use strict';
var express = require('express');
var { buildSchema } = require('graphql');
var graphqlHTTP = require('express-graphql');
const db = require('./db');
const { Pool } = require('pg');
const pool = new Pool()

// Construct a schema, using GraphQL schema language
var schema = buildSchema(`
  input PostInput {
    title: String
    text: String
    author: String
  }

  type Post {
    id: ID!
    title: String
    text: String
  }

  type PostWithAuthor {
    title: String
    text: String
    name: String
  }

  type Query {
    getAllPosts: [PostWithAuthor]
    getPaginatedPosts(limit: Int, offset: Int): [PostWithAuthor]
    getPost(id: ID!): PostWithAuthor
  }

  type Mutation {
    createPost(input: PostInput): Post
    updatePost(id: ID!, input: PostInput): Post
  }
`);

// If Message had any complex fields, we'd put them on this object.
class Post {
  constructor(id, {title, text, author}) {
    this.id = id;
    this.title = title;
    this.text = text;
    this.author = author;
  }
}

var root = {
  getPost: function({id}) {
    const postQuery = 
    `SELECT posts.id, posts.title, posts.text, authors.name 
    FROM posts 
    INNER JOIN authors ON authors.id=posts.author_id
    WHERE posts.id='${id}';`
    
    return pool.query(postQuery)
    .then(res => {
      return res.rows[0]
    })
    .catch(e => {
      console.log(e.stack)
    })
  },
  getAllPosts: function () {
    const allPostsQuery = 
    `SELECT posts.title, posts.text, authors.name 
    FROM posts 
    INNER JOIN authors ON authors.id=posts.author_id;`

    return pool.query(allPostsQuery)
    .then(res => {
      console.log(res.rows)
      return res.rows
    })
    .catch(e => {
      console.error(e.stack)
    })
  },
  getPaginatedPosts: function ({limit, offset}) {
    const postsQuery = 
    `SELECT posts.title, posts.text, authors.name 
    FROM posts 
    INNER JOIN authors ON authors.id=posts.author_id 
    LIMIT ${limit} OFFSET ${offset};`
    
    return pool.query(postsQuery)
      .then(res => {
        console.log(res.rows);
        return res.rows;
      })
      .catch(e => {
        console.error(e.stack)
      })
  },
  createPost: function ({input}) {
    return pool.query('SELECT * FROM authors WHERE name=$1', [input.author])
      .then(res => {
        let author_id = res.rows[0].id;
        // Create a random id for our "database".
        var id = require('crypto').randomBytes(10).toString('hex');
        let queryText = 'INSERT INTO posts(id, title, text, author_id) VALUES($1, $2, $3, $4)';
        
        return pool.query(queryText, [id, input.title, input.text, author_id])
          .then(res => {
            console.log(res)
            return new Post(id, input)
          })
          .catch(e => {
            console.error(e.stack)
          })
      })
      .catch(e => {
        console.error(`Author=${input.author} is not found`)
        console.error(e.stack)
      })
  },
  updatePost: function ({id, input}) {
    const updateQuery=`UPDATE posts 
    SET title='${input.title}', text='${input.text}' 
    WHERE posts.id='${id}';`
    
    return pool.query(updateQuery)
      .then(res => {
        return new Post(id, input);
      })
      .catch(e => {
        console.log(e.stack);
      })
  },
};

var app = express();

app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true,
}));

app.listen(4000, () => {
  console.log('Running a GraphQL API server at localhost:4000/graphql');
});