@echo off
echo ============================================
echo Creating .env.example files
echo ============================================
echo.

REM Create backend/.env.example
echo Creating backend/.env.example...
(
echo # ============================================
echo # SUPABASE CONFIGURATION ^(REQUIRED^)
echo # ============================================
echo SUPABASE_URL=https://your-project.supabase.co
echo SUPABASE_KEY=your_anon_key
echo SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
echo.
echo # ============================================
echo # OPENAI ^(REQUIRED for prompt enhancement^)
echo # ============================================
echo OPENAI_API_KEY=sk-proj-...
echo.
echo # ============================================
echo # REPLICATE ^(Optional - for additional models^)
echo # ============================================
echo REPLICATE_API_TOKEN=r8_...
echo.
echo # ============================================
echo # GEMINI ^(Optional^)
echo # ============================================
echo GEMINI_API_KEY=your-gemini-key
echo.
echo # ============================================
echo # SERVER CONFIGURATION
echo # ============================================
echo PORT=5000
echo NODE_ENV=development
echo CORS_ORIGINS=http://localhost:3000,http://localhost:3001
) > backend\.env.example

echo ✅ Created backend/.env.example
echo.

REM Create frontend/.env.example
echo Creating frontend/.env.example...
(
echo # ============================================
echo # API CONFIGURATION
echo # ============================================
echo # Development:
echo REACT_APP_API_URL=http://localhost:5000/api
echo.
echo # Production ^(GitHub Pages^):
echo # REACT_APP_API_URL=https://your-backend.vercel.app/api
) > frontend\.env.example

echo ✅ Created frontend/.env.example
echo.
echo ============================================
echo Done! Now copy .env.example to .env and fill in your values:
echo   1. cd backend
echo   2. copy .env.example .env
echo   3. Edit .env with your actual API keys
echo   4. cd ../frontend  
echo   5. copy .env.example .env
echo   6. Edit .env with your backend URL
echo ============================================
pause
