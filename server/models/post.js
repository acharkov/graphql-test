class Post {
  constructor(id, date, title, text, authorId, authorName) {
    this.id = id;
    this.title = title;
    this.text = text;
    this.author = {
      id: authorId,
      name: authorName
    };
    this.date = date;
  }
}

export default function getPostFromDbResult(dbResult) {
  const post = new Post(
    dbResult.id,
    dbResult.date,
    dbResult.title,
    dbResult.text,
    dbResult.author_id,
    dbResult.name
  );
  return post;
}
