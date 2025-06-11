# Deployment Guide

This guide walks you through deploying the User Manager Library to GitHub and NPM.

## 📋 Prerequisites

- [x] GitHub account
- [x] NPM account
- [x] Git configured locally
- [x] Node.js 18+ installed

## 🚀 Step 1: GitHub Repository Setup

### 1.1 Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository
2. Repository name: `user-manager`
3. Description: `Complete TypeScript library for Supabase user management`
4. Set to **Public** (for NPM publishing)
5. **Don't** initialize with README (we have one)

### 1.2 Update Package Configuration

Update the repository URLs in `package.json`:

```json
{
  "name": "@your-username/user-manager",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/user-manager.git"
  },
  "homepage": "https://github.com/your-username/user-manager#readme",
  "bugs": {
    "url": "https://github.com/your-username/user-manager/issues"
  },
  "author": "Your Name <your.email@example.com>"
}
```

### 1.3 Push to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Initial commit
git commit -m "feat: initial release of User Manager Library v1.0.0

- Complete authentication system with email verification
- Advanced session management with multi-tab sync
- User status progression system (Basic → Silver → Gold → Platinum)
- Real Supabase database integration
- Comprehensive error handling and validation
- Full TypeScript support with type definitions
- Production-ready with comprehensive test suite"

# Add remote origin
git remote add origin https://github.com/your-username/user-manager.git

# Push to GitHub
git branch -M master
git push -u origin master
```

## 📦 Step 2: NPM Publishing Setup

### 2.1 Create NPM Account

1. Go to [npmjs.com](https://www.npmjs.com/)
2. Create account or sign in
3. Verify your email address

### 2.2 Generate NPM Access Token

1. Go to NPM → Account → Access Tokens
2. Click "Generate New Token"
3. Choose "Automation" (for CI/CD)
4. Copy the token (starts with `npm_`)

### 2.3 Add NPM Token to GitHub Secrets

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `NPM_TOKEN`
5. Value: Your NPM token
6. Click "Add secret"

## 🔄 Step 3: Automated Deployment

### 3.1 CI/CD Workflows

The repository includes two GitHub Actions workflows:

- **CI Workflow** (`.github/workflows/ci.yml`)

  - Runs on every push and PR
  - Tests TypeScript compilation
  - Builds the library
  - Checks bundle size
  - Runs on Node.js 18.x and 20.x

- **Release Workflow** (`.github/workflows/release.yml`)
  - Runs when you create a git tag
  - Builds and publishes to NPM
  - Creates GitHub release

### 3.2 Create Your First Release

```bash
# Make sure everything is committed and pushed
git add .
git commit -m "chore: prepare for v1.0.0 release"
git push

# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

This will trigger the release workflow and:

- ✅ Build the library
- ✅ Publish to NPM as `@your-username/user-manager`
- ✅ Create a GitHub release

## 🎯 Step 4: Verification

### 4.1 Check NPM Package

```bash
# Search for your package
npm search @your-username/user-manager

# View package info
npm info @your-username/user-manager
```

### 4.2 Test Installation

```bash
# Create test directory
mkdir test-user-manager
cd test-user-manager

# Initialize package.json
npm init -y

# Install your package
npm install @your-username/user-manager @supabase/supabase-js

# Test import
node -e "console.log(require('@your-username/user-manager'))"
```

## 🔧 Step 5: Future Releases

### 5.1 Version Updates

```bash
# Update version in package.json
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.1 → 1.1.0
npm version major  # 1.1.0 → 2.0.0

# Push the version commit and tag
git push && git push --tags
```

### 5.2 Manual NPM Publishing (Alternative)

If you prefer manual publishing:

```bash
# Build the library
npm run build

# Login to NPM
npm login

# Publish
npm publish
```

## 📊 Step 6: Package Management

### 6.1 NPM Package Settings

1. Go to [npmjs.com/package/@your-username/user-manager](https://npmjs.com/package/@your-username/user-manager)
2. Add package description and keywords
3. Link to GitHub repository
4. Add collaborators if needed

### 6.2 GitHub Repository Settings

1. **About Section**: Add description, website, and topics
2. **Releases**: Your releases will appear automatically
3. **Issues**: Bug reports and feature requests will use your templates
4. **Actions**: Monitor CI/CD workflow runs

## 🎉 Success!

Your User Manager Library is now:

- ✅ **Published on NPM** - Available for installation worldwide
- ✅ **Open Source on GitHub** - Community can contribute
- ✅ **Automated CI/CD** - Releases happen automatically
- ✅ **Professional Setup** - Issue templates, documentation, licensing

## 📈 Next Steps

1. **Monitor Usage**: Check NPM download stats
2. **Community**: Respond to issues and PRs
3. **Documentation**: Keep README updated
4. **Versioning**: Follow semantic versioning
5. **Security**: Monitor for vulnerabilities

## 🆘 Troubleshooting

### Common Issues

**NPM Publish Fails**

- Check if package name is available
- Verify NPM token is correct
- Ensure you're logged in: `npm whoami`

**GitHub Actions Fail**

- Check secrets are set correctly
- Verify workflow syntax
- Check Node.js version compatibility

**Build Errors**

- Run `npm run type-check` locally
- Check TypeScript configuration
- Verify all dependencies are installed

---

**🎊 Congratulations on your first NPM package!**
