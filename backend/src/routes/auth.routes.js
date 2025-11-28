import express from 'express';
import { supabase } from '../db/supabase.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Simple authentication (NO real password hashing for demo)
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    // Find user by username
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !users) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Simple password check (NOT SECURE - just for demo)
    // In production, use bcrypt.compare(password, users.password_hash)
    // Check password from database
    if (users.password_hash !== password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Update last_login_at
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', users.id);

    // Return user data (exclude password_hash)
    const { password_hash, ...userData } = users;
    
    res.json({
      success: true,
      user: userData,
      message: 'Login successful'
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/register
 * Register new user (simplified)
 */
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password, full_name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, and password are required'
      });
    }

    // Check if user exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`)
      .single();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Username or email already exists'
      });
    }

    // Prepare user data
    const userData = {
      username,
      email,
      password_hash: password, // NOT SECURE - just for demo
      role: 'user'
    };

    // Add full_name only if provided (column might not exist in older schemas)
    if (full_name) {
      userData.full_name = full_name;
    }

    // Insert new user (with simple password for demo)
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Remove password_hash from response
    const { password_hash, ...userResponse } = newUser;
    
    res.status(201).json({
      success: true,
      user: userResponse,
      message: 'Registration successful'
    });

  } catch (error) {
    next(error);
  }
});

export default router;
