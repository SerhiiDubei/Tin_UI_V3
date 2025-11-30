@echo off
echo Creating .env.example files...
echo.

REM Create backend/.env.example
(
echo # Server Configuration
echo PORT=5000
echo NODE_ENV=production
echo.
echo # Supabase Configuration
echo SUPABASE_URL=your_supabase_url_here
echo SUPABASE_KEY=your_supabase_anon_key_here
echo SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
echo.
echo # AI API Keys
echo OPENAI_API_KEY=your_openai_api_key_here
echo REPLICATE_API_TOKEN=your_replicate_api_token_here
echo GEMINI_API_KEY=your_gemini_api_key_here
echo.
echo # CORS Configuration ^(comma-separated URLs^)
echo # For production, add your GitHub Pages URL
echo CORS_ORIGINS=http://localhost:3000,https://yourusername.github.io
echo.
echo # Rate Limiting
echo RATE_LIMIT=100
echo.
echo # Logging
echo LOG_LEVEL=info
) > backend\.env.example

echo ✓ Created backend/.env.example

REM Create frontend/.env.example
(
echo # Frontend Environment Variables
echo.
echo # API URL - Update this with your Vercel backend URL after deployment
echo # For local development:
echo REACT_APP_API_URL=http://localhost:5000/api
echo.
echo # For production ^(GitHub Pages^):
echo # REACT_APP_API_URL=https://your-vercel-backend-url.vercel.app/api
) > frontend\.env.example

echo ✓ Created frontend/.env.example
echo.
echo Done! You can now copy .env.example to .env and fill in your values.
pause

