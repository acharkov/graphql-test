/* This script to be used at the very beginnig to create needed tables
   to simplify the testing */
const { Pool } = require('pg');

const createPostsQuery = `CREATE TABLE posts(
  id varchar(20) PRIMARY KEY,
  title varchar(20),
  text varchar(500),
  author_id varchar(20),
  date date);`;
const createAuthorsQuery = `CREATE TABLE authors(
  id varchar(20) PRIMARY KEY,
  name varchar(60));`;

const pool = new Pool();

pool.query(createPostsQuery)
  .then(() => {
    console.log('posts table succesfully created');
  })
  .catch((err) => {
    console.error(err.stack);
  });

pool.query(createAuthorsQuery)
  .then(() => {
    console.log('authors table succesfully created');

    const insertQuery = `INSERT INTO 
    authors(id, name) 
    VALUES
    ('1', 'Kony'), ('2', 'Tony'), ('3', 'Pony');`;

    pool.query(insertQuery)
      .then(() => {
        console.log('authors succesfully inserted');
      })
      .catch((err) => {
        console.error(err.stack);
      });
  })
  .catch((err) => {
    console.error(err.stack);
  });
