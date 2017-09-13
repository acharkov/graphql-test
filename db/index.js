const { Pool } = require('pg')

const pool = new Pool()

module.exports = {
  query: (text, params) => {
    const start = Date.now()

    return pool.query(text, params)
    .then(res => {
      console.log(res.rows)
      console.log('executed query', { text, rows: res.rowCount });
    })
    .catch(e => console.error(e.stack));
  }
}