let { Pool } = require('pg')
let Post = require('../post.js');
let pool = new Pool();

let query = function (text, params) {
  const start = Date.now()
  return pool.query(text, params)
    .then(res => {
      const duration = Date.now() - start
      console.log('executed query', { text, duration, rows: res.rowCount })
      return res;
    })
}

let convertDbResultToPost = function (dbElement) {
  let post = new Post(dbElement.id, dbElement.date, dbElement.title, 
                      dbElement.text, dbElement.author_id, dbElement.name);
    
  return post;
}

let convertDbResultToPostArray = function (dbArray) {
  let posts = new Array();

  for (let i = 0; i < dbArray.length; ++i) {
    let post = convertDbResultToPost(dbArray[i])
    posts.push(post)
  }
  
  return posts;
}

module.exports = { 
  query: query,
  convertDbResultToPost: convertDbResultToPost,
  convertDbResultToPostArray: convertDbResultToPostArray
}