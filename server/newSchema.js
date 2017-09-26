import { graphql } from 'graphql';
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLID,
  GraphQLString,
  GraphQLNonNull,
  GraphQLList
} from 'graphql';
import query from './db';
import joinMonster from 'join-monster';
import getPostFromDbResult from './post';
import crypto from 'crypto';


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
})

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
      type: new GraphQLList(Author),
      sqlJoin: (postTable, authorsTable, args) => `${postTable}.author_id = ${authorsTable}.id`
    }
  })
})

let RootQueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    getAllAuthors: {
      type: new GraphQLList(Author),
      resolve: async function () {   
        const allPostsQuery = `SELECT * from authors;`;

        try {
          const dbRes = await query(allPostsQuery);
          console.log(dbRes.rows)
          return dbRes.rows;
        } catch (err) {
          console.error(err.stack);
          throw err;
        }
      }
    },
    getAllPosts: {
      type: new GraphQLList(Post),
      resolve: async function (parent, args, context, resolveInfo) {

        return joinMonster(resolveInfo, {}, async sql => {
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
})

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
      resolve: async function (parent, { title, text, authorId }) {
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
        text: { type: GraphQLString },
        authorId: { type: GraphQLString }
      },
      resolve: async function (parent, {id, title, text, authorId }) {
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
})

var schema = new GraphQLSchema({
  query: RootQueryType,
  mutation: RootMutationType
});

export default schema