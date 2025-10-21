import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Environment Variables', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules to get fresh import of env.ts
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('OPENAI_MODEL', () => {
    it('should be undefined when OPENAI_MODEL is not set', async () => {
      // Remove OPENAI_MODEL from environment
      process.env = { ...originalEnv };
      delete process.env.OPENAI_MODEL;

      // Dynamic import to get fresh module with current env
      const { OPENAI_MODEL } = await import('@/env');
      
      expect(OPENAI_MODEL).toBeUndefined();
    });

    it('should use environment value when OPENAI_MODEL is set', async () => {
      // Set custom OPENAI_MODEL value
      process.env = { 
        ...originalEnv, 
        OPENAI_MODEL: 'gpt-4-turbo' 
      };

      // Dynamic import to get fresh module with current env
      const { OPENAI_MODEL } = await import('@/env');
      
      expect(OPENAI_MODEL).toBe('gpt-4-turbo');
    });

    it('should use environment value when OPENAI_MODEL is empty string', async () => {
      // Set empty OPENAI_MODEL value
      process.env = { 
        ...originalEnv, 
        OPENAI_MODEL: '' 
      };

      // Dynamic import to get fresh module with current env
      const { OPENAI_MODEL } = await import('@/env');
      
      expect(OPENAI_MODEL).toBe(''); // Should be empty string, not undefined
    });

    it('should handle various model names correctly', async () => {
      const testModels = [
        'gpt-3.5-turbo',
        'gpt-4',
        'gpt-4-turbo-preview',
        'gpt-5-nano'
      ];

      for (const model of testModels) {
        process.env = { 
          ...originalEnv, 
          OPENAI_MODEL: model 
        };

        // Reset modules for each iteration
        jest.resetModules();
        const { OPENAI_MODEL } = await import('@/env');
        
        expect(OPENAI_MODEL).toBe(model);
      }
    });
  });
});
