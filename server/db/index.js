import 'babel-polyfill';
import { Pool } from 'pg';
import Post from '../post';

const pool = new Pool();

const query = async function query(text, params) {
  const start = Date.now();

  const dbRes = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('executed query', { text, duration, rows: dbRes.rowCount });
  return dbRes;
};

const convertDbResultToPost = function convertDbResultToPost(dbElement) {
  const post = new Post(
    dbElement.id,
    dbElement.date,
    dbElement.title,
    dbElement.text,
    dbElement.author_id,
    dbElement.name
  );

  return post;
};

const convertDbResultToPostArray = function convertDbResultToPostArray(dbArray) {
  return dbArray.map(convertDbResultToPost);
};

module.exports = {
  query,
  convertDbResultToPost,
  convertDbResultToPostArray
};
