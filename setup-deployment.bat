@echo off
echo 🚀 Pollirshad E-commerce Platform - Deployment Setup
echo ======================================================
echo.
echo This script will help you set up your GitHub repository.
echo.
echo Prerequisites:
echo - Git installed on your system
echo - GitHub account with repository: invinciblelesar/pollirshad-ecommerce
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul

echo.
echo 📁 Initializing Git repository...
git init

echo 📤 Adding all files to staging...
git add .

echo 💾 Creating initial commit...
git commit -m "Initial commit: Multi-vendor e-commerce platform with admin dashboard, vendor management, and AI features"

echo 🔗 Adding remote origin...
git remote add origin https://github.com/invinciblelesar/pollirshad-ecommerce.git

echo 🚀 Pushing to GitHub...
git branch -M main
git push -u origin main

echo.
echo ✅ GitHub repository setup complete!
echo.
echo 📝 Next steps:
echo 1. Visit: https://github.com/invinciblelesar/pollirshad-ecommerce
echo 2. Verify all files are uploaded
echo 3. Set up MongoDB Atlas (see DEPLOYMENT_GUIDE.md)
echo 4. Deploy to Render (see DEPLOYMENT_GUIDE.md)
echo.
echo 📖 For detailed instructions, see DEPLOYMENT_GUIDE.md
echo.
pause