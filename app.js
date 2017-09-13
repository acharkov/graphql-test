'use strict';
let express = require('express');
let graphqlHTTP = require('express-graphql');
let { schema, root} = require('./schema.js')

let app = express();

app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true,
}));

app.listen(4000, () => {
  console.log('Running a GraphQL API server at localhost:4000/graphql');
});