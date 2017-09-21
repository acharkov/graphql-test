const { Pool } = require('pg');
const Post = require('../post.js');

const pool = new Pool();

const query = function query(text, params) {
  const start = Date.now();

  return pool.query(text, params)
    .then((res) => {
      const duration = Date.now() - start;

      console.log('executed query', { text, duration, rows: res.rowCount });
      return res;
    });
};

const convertDbResultToPost = function convertDbResultToPost(dbElement) {
  const post = new Post(
    dbElement.id, dbElement.date,
    dbElement.title, dbElement.text,
    dbElement.author_id, dbElement.name
  );

  return post;
};

const convertDbResultToPostArray = function convertDbResultToPostArray(dbArray) {
  return dbArray.map(convertDbResultToPost);
};

module.exports = {
  query,
  convertDbResultToPost,
  convertDbResultToPostArray,
};
