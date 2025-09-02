# Node.js Express Project with Tailwind CSS

A well-structured Node.js Express.js project with Tailwind CSS for modern frontend styling.

## Project Structure

```
src/
├── config/          # Configuration files
│   └── config.js
├── controllers/     # Route controllers
│   └── sampleController.js
├── models/          # Data models
│   └── Item.js
├── routes/          # Route definitions
│   └── sampleRoutes.js
├── services/        # Business logic layer
│   └── itemService.js
├── styles/          # CSS source files
│   └── input.css    # Tailwind CSS input file
├── utils/           # Utility functions
│   └── helpers.js
├── views/           # View templates
├── app.js           # Express app configuration
└── index.js         # Application entry point
public/
├── css/             # Compiled CSS files
│   └── style.css    # Compiled Tailwind CSS
└── index.html       # Frontend demo page
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Database Setup

This project connects to your existing MySQL database without making any modifications.

### Prerequisites

- MySQL Server installed and running
- Existing database named `enercondb` with your tables

### Environment Configuration

The project uses environment variables for database configuration. Make sure your `.env` file contains:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=enercondb
PORT=3000
```

**Note**: The application will only connect to your existing database and will not create, modify, or delete any tables or data.

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up your database connection:
   - Ensure your MySQL database `enercondb` is running and accessible
   - Update the `.env` file with your database credentials

3. Build Tailwind CSS:
```bash
npm run build-css
```

4. Start the development server (with CSS watch mode):
```bash
npm run dev
```

5. Start the production server:
```bash
npm start
```

## Frontend Demo

Visit `http://localhost:3000` to see the frontend demo page with Tailwind CSS styling and API testing interface.

## API Endpoints

### Items

- `GET /api/items` - Get all items
- `GET /api/items/:id` - Get item by ID
- `POST /api/items` - Create new item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

## Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with CSS watch mode and nodemon
- `npm run build-css` - Build Tailwind CSS once
- `npm run build-css:watch` - Build Tailwind CSS in watch mode
- `npm test` - Run tests (not implemented yet)

## Tailwind CSS

This project uses Tailwind CSS 4.x with a custom build script. The CSS is automatically compiled when running in development mode.

## Environment Variables

Create a `.env` file in the root directory:

```
PORT=3000
NODE_ENV=development
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the ISC License.
