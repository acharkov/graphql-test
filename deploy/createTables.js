/* This script to be used at the very beginnig to create needed tables
   to simplify the testing */
// NOTE: Using require here to not transpile it into ./dist directory in order to simplify the usage
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

async function createPostsTable() {
  try {
    await pool.query(createPostsQuery);
    console.log('posts table succesfully created');
  } catch (err) {
    console.error(err.stack);
  }
}

async function createAuthors() {
  try {
    await pool.query(createAuthorsQuery);
    console.log('authors table succesfully created');

    const insertQuery = `INSERT INTO 
    authors(id, name) 
    VALUES
    ('1', 'Kony'), ('2', 'Tony'), ('3', 'Pony');`;
    await pool.query(insertQuery);
    console.log('authors succesfully inserted');
  } catch (err) {
    console.error(err.stack);
  }
}

createPostsTable();
createAuthors();
