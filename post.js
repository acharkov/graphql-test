module.exports = class Post {
    constructor(id, date, title, text, authorId, authorName) {
      this.id = id;
      this.title = title;
      this.text = text;
      this.authorId = authorId;
      this.name = authorName;
      this.date = date;
    }
  } 