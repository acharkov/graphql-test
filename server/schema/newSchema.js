import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLInt,
  GraphQLBoolean
} from 'graphql';
import joinMonster from 'join-monster';
import pgFormat from 'pg-format';
import crypto from 'crypto';
import getPostFromDbResult from '../models/post';
import query from '../db';

const Author = new GraphQLObjectType({
  name: 'Author',
  sqlTable: 'authors',
  uniqueKey: 'id',
  fields: () => ({
    id: {
      sqlColumn: 'id',
      type: GraphQLString
    },
    name: {
      sqlColumn: 'name',
      type: GraphQLString
    }
  })
});

const Post = new GraphQLObjectType({
  name: 'Post',
  sqlTable: 'posts',
  uniqueKey: 'id',
  fields: () => ({
    id: {
      type: GraphQLString
    },
    title: {
      type: GraphQLString
    },
    text: {
      type: GraphQLString
    },
    date: {
      type: GraphQLString
    },
    author: {
      type: Author,
      sqlJoin: (postTable, authorsTable) => pgFormat(`${postTable}.author_id = ${authorsTable}.id`)
    }
  })
});

const Edges = new GraphQLObjectType({
  name: 'Edges',
  fields: {
    node: {
      type: Post
    },
    cursor: {
      type: GraphQLString
    }
  }
});

// Used for infinite paginating
const InfiniteQueryType = new GraphQLObjectType({
  name: 'InfiniteQueryType',
  fields: {
    totalCount: {
      type: GraphQLInt
    },
    edges: {
      type: new GraphQLList(Edges)
    },
    endCursor: {
      type: GraphQLInt
    },
    hasNextPage: {
      type: GraphQLBoolean
    }
  }
});

const RootQueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    getAllAuthors: {
      type: new GraphQLList(Author),
      async resolve() {
        const allPostsQuery = 'SELECT * from authors;';
        try {
          const dbRes = await query(allPostsQuery);
          return dbRes.rows;
        } catch (err) {
          console.error(err.stack);
          throw err;
        }
      }
    },
    getAllPosts: {
      type: new GraphQLList(Post),
      async resolve(parent, args, context, resolveInfo) {
        return joinMonster(resolveInfo, {}, async (sql) => {
          try {
            const dbRes = await query(sql);
            return dbRes.rows;
          } catch (err) {
            console.error(err.stack);
            throw err;
          }
        });
      }
    },
    getPostsInfinitely: {
      type: InfiniteQueryType,
      args: {
        numOfPosts: { type: GraphQLInt },
        lastCursor: { type: GraphQLInt }
      },
      async resolve(parent, { numOfPosts, lastCursor }) {
        const edgesArray = [];
        let dbRes;
        let totalRowCount = 0;
        let hasNextPage;
        // FOR MAXIM: risk unessesary join here: can corrected with graphql-relay.js for pagination
        const postQuery = `SELECT 
        posts.id, posts.cursor, posts.title, posts.text, posts.date, posts.author_id, authors.name 
        FROM posts 
        LEFT JOIN authors ON authors.id=posts.author_id
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
            console.log(dbRes.rows[i]);
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
    },
    getPost: {
      type: Post,
      args: {
        id: { type: GraphQLString }
      },
      where: (PostTable, args) => pgFormat(`${PostTable}.id = %L`, args.id),
      async resolve(parent, args, context, resolveInfo) {
        return joinMonster(resolveInfo, {}, async (sql) => {
          console.log(sql);
          try {
            const dbRes = await query(sql);
            return dbRes.rows;
          } catch (err) {
            console.error(err.stack);
            throw err;
          }
        });
      }
    }
  }
});

const RootMutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    createPost: {
      type: Post,
      args: {
        title: { type: GraphQLString },
        text: { type: GraphQLString },
        authorId: { type: GraphQLString }
      },
      async resolve(parent, { title, text, authorId }) {
        const id = crypto.randomBytes(10).toString('hex');
        const queryText = `INSERT INTO 
        posts(id, title, text, author_id, date) 
        VALUES($1, $2, $3, $4, $5) RETURNING *;`;
        const now = new Date();
        try {
          const dbRes = await query(queryText, [id, title, text, authorId, now]);
          return getPostFromDbResult(dbRes.rows[0]);
        } catch (err) {
          console.error(err.stack);
          throw err;
        }
      }
    },
    updatePost: {
      type: Post,
      args: {
        id: { type: GraphQLString },
        title: { type: GraphQLString },
        text: { type: GraphQLString }
      },
      async resolve(parent, {
        id, title, text
      }) {
        const updateQuery = `UPDATE posts 
        SET title=$1, text=$2 
        WHERE posts.id=$3 RETURNING *`;

        try {
          const dbRes = await query(updateQuery, [title, text, id]);
          if (dbRes.rowCount === 0) {
            throw new Error(`Post with id=${id} is not found`);
          }
          return getPostFromDbResult(dbRes.rows[0]);
        } catch (err) {
          console.error(err.stack);
          throw err;
        }
      }
    }
  }
});

const schema = new GraphQLSchema({
  query: RootQueryType,
  mutation: RootMutationType
});

export default schema;
