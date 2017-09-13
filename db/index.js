const { Pool } = require('pg')

const pool = new Pool()

module.exports = {
  query: (text, params) => {
    const start = Date.now()
    return pool.query(text, params)
      .then(res => {
        const duration = Date.now() - start
        console.log('executed query', { text, duration, rows: res.rowCount })
        return res;
      })
  }
}