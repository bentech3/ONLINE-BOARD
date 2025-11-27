import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

/**
 * Checks if a user is currently logged in and returns their user data.
 * @returns Promise<User | null> - Returns the user object if authenticated, null otherwise
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }

    return user;
  } catch (error) {
    console.error('Unexpected error getting current user:', error);
    return null;
  }
};

/**
 * Checks if a user is authenticated (convenience wrapper around getCurrentUser).
 * @returns Promise<boolean> - True if user is authenticated, false otherwise
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return user !== null;
};