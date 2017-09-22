"use strict";
import 'babel-polyfill';
import { Pool } from 'pg';
import Post from '../post';

const pool = new Pool();

export default async function query(text, params) {
  const start = Date.now();

  const dbRes = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('executed query', { text, duration, rows: dbRes.rowCount });
  return dbRes;
};
