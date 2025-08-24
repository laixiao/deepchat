# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language
Chinese

## Documentation and Demo Files
Do not create demonstration files or documentation files outside of the designated directories. All documentation should be maintained in the main CLAUDE.md file.

## Test Files
All server tests should be placed in the `server/tests/` directory. When creating new tests, ensure they are placed in this directory rather than creating separate demo or documentation files.

## Project Overview

This is the backend server for DeepChat, a feature-rich AI chat platform. The server is built with Node.js + Express + MongoDB and provides RESTful API services for the DeepChat application.

## Development Commands

### Package Management

Use `pnpm` as the package manager:

```bash
# Install dependencies
pnpm install
```

### Development

```bash
# Start development server with nodemon
pnpm run dev

# Build TypeScript files
pnpm run build

# Start production server
pnpm run start

# Run tests
pnpm run test
```

### Environment Variables

The server requires the following environment variables in the `.env` file:

```
MONGODB_URI=mongodb://username:password@host:port/database
PORT=3000
JWT_SECRET=your_jwt_secret_key
```

## Architecture Overview

### Core Components

The server follows a standard MVC-like architecture with additional layers for better organization:

- **Controllers** (`controllers/`): Handle incoming requests, process data, and send responses
- **Models** (`models/`): Define data structures and interact with the database
- **Routes** (`routes/`): Define API endpoints and route requests to appropriate controllers
- **Middleware** (`middleware/`): Handle cross-cutting concerns like authentication
- **Config** (`config/`): Configuration files like database connections
- **Services** (`services/`): Business logic implementations (currently minimal)
- **Utils** (`utils/`): Helper functions and utilities
- **Tests** (`tests/`): Test files

### Authentication

The server uses JWT (JSON Web Token) for user authentication:

1. Users register with username, email, and password
2. Passwords are hashed using bcrypt before storage
3. Upon successful login, a JWT is generated and returned
4. Clients include this JWT in the Authorization header for protected routes
5. Middleware verifies JWT validity before allowing access to protected endpoints

### Data Models

#### User Model

The User model includes:
- username: Unique username (3-30 characters)
- email: Unique email address with validation
- password: Hashed password (minimum 6 characters)
- avatar: Optional avatar URL
- timestamps: createdAt and updatedAt fields

### API Endpoints

#### User Routes (`/api/users`)

- `POST /register` - User registration
- `POST /login` - User login
- `GET /profile` - Get user profile (requires authentication)

## Development Guidelines

### Code Standards

- **Language**: Use Chinese for comments and logs, English for code
- **TypeScript**: Strict type checking enabled
- **Error Handling**: Comprehensive error handling with appropriate HTTP status codes
- **Security**: Password hashing, JWT authentication, input validation

### Database Operations

- Use Mongoose for MongoDB operations
- Always handle database errors appropriately
- Use async/await for database operations
- Validate data before saving to database

### Testing

- Tests are run with `pnpm run test`
- Current implementation includes basic server startup and API endpoint tests
- Manual testing can be done with tools like Postman or curl

### File Organization

- Separate concerns with dedicated folders for each component type
- Use clear, descriptive names for files and functions
- Group related functionality together
- Maintain consistent coding style

## Key Dependencies

### Core Framework

- **Express**: Web application framework
- **Mongoose**: MongoDB object modeling
- **TypeScript**: Type-safe JavaScript

### Authentication & Security

- **JWT**: JSON Web Token implementation
- **Bcrypt**: Password hashing
- **Dotenv**: Environment variable management

### Utilities

- **Cors**: Cross-Origin Resource Sharing support
- **Nodemon**: Development server with auto-restart
- **Ts-node**: TypeScript execution environment

## Security Considerations

- Passwords are hashed before storage
- JWT tokens are used for stateless authentication
- CORS is enabled for cross-origin requests
- Input validation on all user-provided data
- Environment variables for sensitive configuration

## Performance Optimization

- Connection pooling through Mongoose
- Efficient database queries
- Async/await for non-blocking operations
- Proper error handling to prevent crashes

## Common Development Tasks

### Adding New API Endpoints

1. Define the route in `routes/` directory
2. Create controller functions in `controllers/` directory
3. Add any required middleware
4. Update documentation in README.md

### Adding New Data Models

1. Create a new model file in `models/` directory
2. Define the schema using Mongoose
3. Export the model for use in controllers
4. Add appropriate indexes for performance

### Adding New Middleware

1. Create middleware function in `middleware/` directory
2. Implement the required logic
3. Export the middleware for use in routes
4. Add error handling as appropriate

## Debugging Tips

1. Check console logs for error messages
2. Verify environment variables are correctly set
3. Ensure MongoDB is accessible and credentials are correct
4. Use tools like Postman to test API endpoints directly
5. Check that JWT tokens are properly formatted in Authorization headers