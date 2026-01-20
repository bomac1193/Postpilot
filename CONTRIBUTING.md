# Contributing to Postpanda

Thank you for your interest in contributing to Postpanda! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Prioritize the project's goals

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:

- **Clear title** describing the bug
- **Steps to reproduce** the issue
- **Expected behavior** vs **actual behavior**
- **Environment details** (OS, Node version, etc.)
- **Screenshots** if applicable

Example:
```
Title: "Upload fails for videos larger than 50MB"

Steps to reproduce:
1. Login to Postpanda
2. Click "Upload Content"
3. Select a video file > 50MB
4. Click upload

Expected: Video uploads successfully
Actual: Upload fails with timeout error

Environment:
- OS: Ubuntu 22.04
- Node: v18.19.1
- Browser: Chrome 120
```

### Suggesting Features

Feature requests are welcome! Please create an issue with:

- **Clear description** of the feature
- **Use case** - why is it needed?
- **Proposed implementation** (optional)
- **Alternative solutions** you've considered

### Pull Requests

1. **Fork the repository**

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow code style guidelines
   - Add comments for complex logic
   - Keep commits focused and atomic

4. **Test your changes**
   - Test all affected functionality
   - Ensure no regressions
   - Test on different screen sizes (if UI changes)

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add feature description"
   ```

   Use conventional commit messages:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes (formatting)
   - `refactor:` Code refactoring
   - `test:` Adding tests
   - `chore:` Maintenance tasks

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Provide clear description
   - Reference related issues
   - Add screenshots if UI changes
   - Request review from maintainers

## Development Setup

See [DEVELOPMENT.md](./DEVELOPMENT.md) for detailed setup instructions.

Quick start:
```bash
npm install
cp .env.example .env
npm run dev
```

## Code Style Guidelines

### JavaScript

```javascript
// Use const/let, not var
const apiKey = process.env.API_KEY;
let counter = 0;

// Use async/await
async function fetchData() {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Use descriptive names
const userAuthToken = generateToken(userId); // Good
const t = generateToken(u); // Bad

// Add JSDoc comments for functions
/**
 * Calculate content virality score
 * @param {Object} content - Content object
 * @returns {Promise<number>} Score from 0-100
 */
async function calculateViralityScore(content) {
  // Implementation
}
```

### CSS

```css
/* Use meaningful class names */
.content-card { } /* Good */
.cc { } /* Bad */

/* Use CSS variables for theming */
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
}

/* Mobile-first approach */
.element {
  width: 100%;
}

@media (min-width: 768px) {
  .element {
    width: 50%;
  }
}
```

### File Organization

```
src/
├── models/         # Data models only
├── controllers/    # Request handlers
├── services/       # Business logic
├── routes/         # Route definitions
├── middleware/     # Middleware functions
└── utils/          # Helper functions
```

Keep files focused:
- Controllers should be thin, delegating to services
- Services contain business logic
- Utils are pure functions with no side effects

## Testing

### Before Submitting PR

Test these core flows:

1. **Authentication**
   - Register new user
   - Login with correct credentials
   - Login with wrong credentials
   - Access protected routes

2. **Content Management**
   - Upload image
   - Upload video
   - Edit content
   - Delete content
   - View content list

3. **Grid Planning**
   - Create new grid
   - Add content to grid
   - Remove content from grid
   - Delete grid

4. **AI Features** (if applicable)
   - Content analysis runs
   - Scores are displayed
   - Hashtag generation works
   - Caption generation works

### API Testing

Use curl or Postman to test API endpoints:

```bash
# Test registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test"}'
```

## Documentation

When adding features, update:

- **README.md** - User-facing features
- **API_DOCUMENTATION.md** - New API endpoints
- **DEVELOPMENT.md** - Technical details
- **Code comments** - Complex logic

Use clear, concise language. Add examples where helpful.

## Security

### Reporting Security Issues

**DO NOT** open public issues for security vulnerabilities.

Instead:
1. Email security concerns to maintainers
2. Provide detailed description
3. Include steps to reproduce
4. Wait for response before public disclosure

### Security Best Practices

When contributing code:
- Never commit API keys or secrets
- Validate and sanitize all user input
- Use parameterized queries (Mongoose does this)
- Implement rate limiting on new endpoints
- Use HTTPS in production
- Keep dependencies updated

## Adding New Dependencies

Before adding new npm packages:

1. **Check if really needed** - Can you use existing dependencies?
2. **Check package health** - Is it actively maintained?
3. **Check bundle size** - Will it significantly increase app size?
4. **Check license** - Is it compatible with MIT?

Add dependencies:
```bash
npm install package-name
```

Update documentation explaining why the dependency was added.

## Feature Roadmap

Current priorities:

1. **High Priority**
   - Direct posting to Instagram/TikTok
   - Drag-and-drop grid rearrangement
   - Real post performance analytics

2. **Medium Priority**
   - Calendar view for scheduled posts
   - Team collaboration features
   - Instagram Stories planning

3. **Low Priority**
   - Video editing capabilities
   - More platform integrations
   - A/B testing automation

Check issues for "good first issue" label for beginner-friendly tasks.

## Questions?

- Check [README.md](./README.md) for usage guide
- Check [DEVELOPMENT.md](./DEVELOPMENT.md) for technical details
- Open an issue for questions
- Join discussions in issues/PRs

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Postpanda! 🚀
