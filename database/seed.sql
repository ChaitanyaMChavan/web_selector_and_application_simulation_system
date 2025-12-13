-- =====================================================
-- Seed Data for Development/Testing
-- Schema Name: projectweb
-- =====================================================

SET search_path TO projectweb;

-- Note: Passwords should be hashed using bcrypt
-- Default password for all users: "password123"
-- Hash: $2b$10$rOzJ5Z8Z8Z8Z8Z8Z8Z8Z8O8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z

-- =====================================================
-- 1. CREATE USERS
-- =====================================================

-- Admin User
INSERT INTO projectweb.users (email, name, password_hash, role)
VALUES 
  ('admin@example.com', 'Admin User', '$2b$10$rOzJ5Z8Z8Z8Z8Z8Z8Z8Z8O8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z', 'ADMIN')
ON CONFLICT (email) DO NOTHING;

-- Author User
INSERT INTO projectweb.users (email, name, password_hash, role)
VALUES 
  ('author@example.com', 'Author User', '$2b$10$rOzJ5Z8Z8Z8Z8Z8Z8Z8Z8O8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z', 'AUTHOR')
ON CONFLICT (email) DO NOTHING;

-- Selector User
INSERT INTO projectweb.users (email, name, password_hash, role)
VALUES 
  ('selector@example.com', 'Selector User', '$2b$10$rOzJ5Z8Z8Z8Z8Z8Z8Z8Z8O8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z', 'SELECTOR')
ON CONFLICT (email) DO NOTHING;

-- Applicant User
INSERT INTO projectweb.users (email, name, password_hash, role)
VALUES 
  ('applicant@example.com', 'Applicant User', '$2b$10$rOzJ5Z8Z8Z8Z8Z8Z8Z8Z8O8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z', 'APPLICANT')
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- 2. CREATE SAMPLE SIMULATION
-- =====================================================

-- Get author ID
DO $$
DECLARE
  author_id_val UUID;
  simulation_id_val UUID;
BEGIN
  -- Get author ID
  SELECT id INTO author_id_val FROM projectweb.users WHERE email = 'author@example.com' LIMIT 1;

  -- Create simulation
  INSERT INTO projectweb.simulations (title, description, time_limit_minutes, author_id, status)
  VALUES (
    'Frontend Developer Assessment',
    'A comprehensive assessment for frontend developers covering React, JavaScript, and web development fundamentals.',
    60,
    author_id_val,
    'PUBLISHED'
  )
  RETURNING id INTO simulation_id_val;

  -- Create steps
  INSERT INTO projectweb.steps (simulation_id, "order", type, prompt, options)
  VALUES
    (simulation_id_val, 1, 'MCQ', 'What is React?', '["A library", "A framework", "A language", "An OS"]'::jsonb),
    (simulation_id_val, 2, 'WRITTEN', 'Explain the concept of virtual DOM in React.', NULL),
    (simulation_id_val, 3, 'CODING', 'Write a function that reverses a string in JavaScript.', NULL),
    (simulation_id_val, 4, 'VIDEO', 'Introduce yourself and explain your experience with frontend development.', NULL);

END $$;

-- =====================================================
-- NOTES
-- =====================================================

-- IMPORTANT: The password hash above is a placeholder.
-- In production, generate proper bcrypt hashes using:
--   - Online tool: https://bcrypt-generator.com/
--   - Node.js: bcrypt.hash('password123', 10)
--   - Python: bcrypt.hashpw(b'password123', bcrypt.gensalt())

-- To generate a proper hash, you can use this Node.js script:
-- const bcrypt = require('bcryptjs');
-- console.log(bcrypt.hashSync('password123', 10));

