# Contributing to strapi-plugin-email-brevo

First off, thank you for considering contributing to this project!

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (code snippets, configuration)
- **Describe the behavior you observed and what you expected**
- **Include your environment details** (Node.js version, Strapi version, OS)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**

### Pull Requests

1. Fork the repo and create your branch from `main`
2. Make your changes
3. Ensure your code follows the existing style
4. Write a clear commit message following [Conventional Commits](https://www.conventionalcommits.org/)
5. Open a Pull Request

## Commit Message Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) for automatic versioning with semantic-release.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature (triggers minor release)
- `fix`: A bug fix (triggers patch release)
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements (triggers patch release)
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD configuration changes

### Breaking Changes

For breaking changes, add `BREAKING CHANGE:` in the footer or `!` after the type:

```
feat!: remove support for Node.js 16

BREAKING CHANGE: Node.js 18 or higher is now required
```

### Examples

```
feat: add support for email attachments

fix: handle empty recipient array gracefully

docs: update configuration examples

perf: optimize email parsing for large recipient lists
```

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/opkod-france/strapi-plugin-email-brevo.git
   cd strapi-plugin-email-brevo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Test your changes in a Strapi project:
   ```bash
   npm link
   cd /path/to/your/strapi-project
   npm link @opkod-france/strapi-plugin-email-brevo
   ```

## Code Style

- Use clear, descriptive variable and function names
- Add JSDoc comments for public functions
- Keep functions small and focused
- Handle errors appropriately with error codes

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
