import { buildSchema } from 'graphql';
import crypto from 'crypto';
import query from './db';
import getPostFromDbResult from './post';

function getFields(resolveInfo) {
  return resolveInfo.fieldNodes[0].selectionSet.selections.reduce((fieldsArray, selection) => {
    fieldsArray[selection.name.value] = true;
    return fieldsArray;
  }, {});
}

// Construct a schema, using GraphQL schema language
const schema = buildSchema(`
input PostInput {
  title: String
  text: String
  authorId: String
}

type Post() {
  id: String!
  title: String!
  text: String!
  authorId: String
  name: String
  date: String
}

type Edge {
  cursor: Int
  node: Post
}

type CursorQuery {
  totalCount: Int
  edges: [Edge]
  endCursor: Int
  hasNextPage: Boolean
}

type Query {
  getAllPosts: [Post]
  getPost(id: ID!): Post
  getPostsInfinitely(numOfPosts: Int!, lastCursor: Int!): CursorQuery
}

type Mutation {
  createPost(input: PostInput): Post
  updatePost(id: ID!, input: PostInput): Post
}
`);

/* Variable which contains the resolvers.
In case if there is an error we just throw the error to GraphQl.
No status codes are used in GraphQl */
const root = {
  async getPostsInfinitely({ numOfPosts, lastCursor }) {
    const edgesArray = [];
    let dbRes;
    let totalRowCount = 0;
    let hasNextPage;
    const postQuery = `SELECT 
    posts.id, posts.cursor, posts.title, posts.text, posts.date, posts.author_id, authors.name 
    FROM posts 
    INNER JOIN authors ON authors.id=posts.author_id
    WHERE posts.cursor>$1 
    LIMIT $2`;
    const leftCountQuery = `SELECT COUNT(*)
    FROM posts
    WHERE cursor>$1`;
    const totalCountQuery = `SELECT COUNT(*)
    FROM posts`;

    if (numOfPosts === 0) {
      throw new Error('numOfPosts should be greater than 0');
    }

    // get all edges(cursor, node)
    try {
      dbRes = await query(postQuery, [lastCursor, numOfPosts]);
      for (let i = 0; i < dbRes.rowCount; i += 1) {
        edgesArray.push({
          cursor: dbRes.rows[i].cursor,
          node: getPostFromDbResult(dbRes.rows[i])
        });
      }
    } catch (err) {
      throw new Error(`Unable to get edges: ${err.stack}`);
    }

    // calculate newEndCursor
    const newEndCursor = edgesArray.length > 0 ? edgesArray[edgesArray.length - 1].cursor : NaN;

    // calculate hasNextPage
    try {
      if (newEndCursor) {
        dbRes = await query(leftCountQuery, [newEndCursor]);
        hasNextPage = dbRes.rows[0].count > 0;
      } else {
        hasNextPage = false;
      }
    } catch (err) {
      throw new Error(`Unable to calculate left posts count: ${err.stack}`);
    }

    // calculate total row count
    try {
      dbRes = await query(totalCountQuery);
      totalRowCount = dbRes.rows[0].count;
    } catch (err) {
      throw new Error(`Unable to calculate total row count: ${err.stack}`);
    }

    return {
      totalCount: totalRowCount,
      edges: edgesArray,
      endCursor: newEndCursor,
      hasNextPage
    };
  },

  async getPost({ id }) {
    if (id === null || id === undefined) {
      throw new Error('Invalid id provided');
    }

    const postQuery = `SELECT 
    posts.id, posts.title, posts.text, posts.date, posts.author_id, authors.name 
    FROM posts 
    INNER JOIN authors ON authors.id=posts.author_id
    WHERE posts.id=$1
    ORDER BY posts.date;`;

    try {
      const dbRes = await query(postQuery, [id]);
      if (dbRes.rowCount === 0) {
        throw new Error(`Post with id=${id} is not found`);
      }

      return getPostFromDbResult(dbRes.rows[0]);
    } catch (err) {
      console.error(err.stack);
      throw err;
    }
  },
  // returns all posts to client
  async getAllPosts(source, context, resolveInfo) {
    const requestedFields = getFields(resolveInfo);
    console.log(requestedFields);
    const allPostsQuery = `SELECT 
      posts.id, posts.title, posts.text, posts.date, posts.author_id, authors.name
      FROM posts 
      INNER JOIN authors ON authors.id=posts.author_id
      ORDER BY posts.date;`;

    try {
      const dbRes = await query(allPostsQuery);
      return dbRes.rows.map(getPostFromDbResult);
    } catch (err) {
      console.error(err.stack);
      throw err;
    }
  },
  // create new post using specified input parameters
  async createPost({ input }) {
    // create a random id for our "database".
    const id = crypto.randomBytes(10).toString('hex');
    const queryText = `INSERT INTO 
    posts(id, title, text, author_id, date) 
    VALUES($1, $2, $3, $4, $5) RETURNING *;`;
    const now = new Date();
    try {
      const dbRes = await query(queryText, [id, input.title, input.text, input.authorId, now]);
      return getPostFromDbResult(dbRes.rows[0]);
    } catch (err) {
      console.error(err.stack);
      throw err;
    }
  },
  // update post with specified id using input values
  async updatePost({ id, input }) {
    const updateQuery = `UPDATE posts 
      SET title=$1, text=$2 
      WHERE posts.id=$3 RETURNING *`;

    try {
      const dbRes = await query(updateQuery, [input.title, input.text, id]);
      if (dbRes.rowCount === 0) {
        throw new Error(`Post with id=${id} is not found`);
      }
      return getPostFromDbResult(dbRes.rows[0]);
    } catch (err) {
      console.error(err.stack);
      throw err;
    }
  },
};

export { schema, root };
