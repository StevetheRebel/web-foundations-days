# Library Books REST API

## Conventions

- Base path: `/api`
- Request and response bodies use JSON.
- Send `Content-Type: application/json` for requests with a body.
- Book fields: `id` (server-generated integer), `title` (non-empty string), `author` (non-empty string), `publicationYear` (positive integer).

## 1. List books

- Method: `GET`
- Path: `/api/books`
- Description: Return all books.
- Request body: None.
- Success: `200 OK`, with an array of books, or `[]` if empty.

## 2. Get one book

- Method: `GET`
- Path: `/api/books/1`
- Description: Return the book with ID 1.
- Request body: None.
- Success: `200 OK`, with the book object.

## 3. Create a book

- Method: `POST`
- Path: `/api/books`
- Description: Create a book and assign a unique ID.
- Success: `201 Created`, with the created book and a `Location` header such as `/api/books/1`.
- Example request body:

```json
{
  "title": "The River and the Source",
  "author": "Margaret Ogola",
  "publicationYear": 1994
}
```

## 4. Update a book

- Method: `PUT`
- Path: `/api/books/1`
- Description: Replace all editable fields of the existing book with ID 1.
- Success: `200 OK`, with the updated book object.
- Example request body:

```json
{
  "title": "The River and the Source",
  "author": "Margaret Ogola",
  "publicationYear": 1995
}
```

## 5. Delete a book

- Method: `DELETE`
- Path: `/api/books/1`
- Description: Delete the book with ID 1.
- Request body: None.
- Success: `204 No Content`, with no response body.

## 6. List books by an author

- Method: `GET`
- Path: `/api/books?author=Margaret%20Ogola`
- Description: Return books whose author matches the query parameter, ignoring case.
- Request body: None.
- Success: `200 OK`, with matching books, or `[]` if no author matches.

## Error codes

- `400 Bad Request`: Invalid JSON, an invalid book ID such as `/api/books/abc`, or missing or invalid fields. Example: creating a book without a title.
- `404 Not Found`: A valid book ID does not exist. Example: `GET /api/books/9999` when no book has ID 9999. The same rule applies to update and delete.

## Example error response

```json
{
  "error": "Book not found."
}
```
