// This script to be used at the very beginnig to create needed tables
// to simplify the testing
const { Pool } = require('pg')
const createPostsQuery = `CREATE TABLE posts(
  id varchar(20) PRIMARY KEY,
  title varchar(20),
  text varchar(200),
  authorId varchar(20));`
const createAuthorsQuery = `CREATE TABLE authors(
  id varchar(20) PRIMARY KEY,
  name varchar(60));`

const pool = new Pool()

pool.query(createPostsQuery)
  .then(res => {
    console.log('posts table succesfully created')
  })
  .catch(e => {
    console.error(e.stack)
  })

pool.query(createAuthorsQuery)
  .then(res => {
    console.log('authors table succesfully created');

    const insertQuery = `insert into authors(id, name) values('1', 'Kony'), ('2', 'Tony'), ('3', 'Pony');`;
    pool.query(insertQuery)
      .then(res => {
        console.log('authors succesfully inserted');
      })
      .catch(e => {
        console.error(e.stack);
      })
  })
  .catch(e => {
    console.error(e.stack)
  })