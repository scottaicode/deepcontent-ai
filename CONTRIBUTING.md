# Contributing to DeepContent

Thank you for your interest in contributing to DeepContent! This document provides guidelines and instructions for contributors to ensure the project maintains its core architectural principles.

## Core Architectural Principle: Research-Driven Content Generation

DeepContent follows a **research-driven content generation** approach, where all content creation is informed by real-time research of current best practices. This is the foundational principle of our application, and all contributions must maintain this architecture.

### The Research-Driven Flow (MUST BE PRESERVED)

1. **Research Phase** - Gather current best practices using Perplexity API
2. **Content Generation Phase** - Use Claude API with research data
3. **Rendering Phase** - Display content with appropriate styling

Please see [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation of this architecture.

## Pull Request Guidelines

When submitting a pull request, ensure that:

1. **Research-driven flow is preserved**: All content generation MUST be based on research data.
2. **No hardcoded templates**: Content structure should be determined by research, not hardcoded templates.
3. **Tests pass**: Run `npm test` to ensure all tests pass, especially the research-flow tests.
4. **New features include tests**: Any new feature should include tests that verify it adheres to the research-driven approach.

## Development Process

### 1. Setting Up Your Development Environment

```bash
# Clone the repository
git clone https://github.com/your-username/deepcontent.git

# Install dependencies
npm install

# Create environment variables file
cp .env.example .env.local

# Start the development server
npm run dev
```

### 2. Understanding the Codebase

The codebase is organized as follows:

- `src/app/api/perplexity/` - Research API integration
- `src/app/api/claude/` - Content generation API integration
- `src/app/create/` - Frontend content creation pages
- `src/app/lib/` - Utility functions and helpers
- `src/tests/` - Test files

### 3. Making Changes

When making changes, always consider:

- Does this maintain the research-driven architecture?
- Am I introducing any hardcoded templates?
- Is content generation still based on research data?

### 4. Testing Your Changes

```bash
# Run tests
npm test

# Run end-to-end tests
npm run test:e2e
```

Pay special attention to the research-flow tests, which verify the integrity of the research-driven architecture.

## Architecture Preservation Checklist

Before submitting a PR, verify that:

- [ ] No content is generated without research data
- [ ] No hardcoded content templates have been introduced
- [ ] Research data is passed to content generation
- [ ] Content rendering is flexible and adapts to various formats
- [ ] Research guard middleware is still functional
- [ ] Tests for the research-driven flow pass

## Best Practices

1. **Use the Research Guard**: All content generation routes must implement the research guard.
2. **Flexible Rendering**: Content rendering should accommodate various formats without making assumptions.
3. **Dynamic Formatting**: Allow content format to be determined by research, not hardcoded.
4. **Separation of Concerns**: Research, content generation, and rendering should remain separated.

## Code Review Process

Pull requests will be reviewed with special attention to:

1. Preservation of the research-driven architecture
2. Absence of hardcoded templates
3. Proper separation of concerns
4. Test coverage for the research flow

## Getting Help

If you have questions about the research-driven architecture or how to implement it, please:

1. Review the [ARCHITECTURE.md](./ARCHITECTURE.md) document
2. Open an issue with the "architecture-question" label
3. Reach out to the core team via the project's communication channels

Thank you for helping maintain the integrity of DeepContent's architecture! 