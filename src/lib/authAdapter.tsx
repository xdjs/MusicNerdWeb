import { createAuthenticationAdapter } from '@rainbow-me/rainbowkit';
import { SiweMessage } from 'siwe';
import { getCsrfToken, signIn, signOut } from "next-auth/react"

export const authenticationAdapter = createAuthenticationAdapter({
  getNonce: async () => {
    console.debug("[AuthAdapter] Getting CSRF token for nonce");
    
    // Try to get the CSRF token multiple times with a delay
    let token = null;
    let attempts = 0;
    const maxAttempts = 5; // Increased attempts for first login
    
    while (!token && attempts < maxAttempts) {
      token = await getCsrfToken();
      console.debug("[AuthAdapter] Attempt", attempts + 1, "token:", token ? "found" : "not found");
      
      if (!token) {
        attempts++;
        if (attempts < maxAttempts) {
          // Wait longer between attempts for first login
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
    }
    
    if (!token) {
      console.error("[AuthAdapter] Failed to get CSRF token after", maxAttempts, "attempts");
      throw new Error("Failed to get CSRF token");
    }
    
    console.debug("[AuthAdapter] Successfully obtained CSRF token");
    return token;
  },
  createMessage: ({ nonce, address, chainId }) => {
    // Get domain without port number
    const domain = window.location.hostname.split(':')[0];
    
    console.debug("[AuthAdapter] Creating SIWE message", {
      address,
      chainId,
      domain,
      origin: window.location.origin
    });

    // Clear any existing SIWE data to force a new message
    sessionStorage.removeItem('siwe-nonce');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('siwe.session');
      localStorage.removeItem('wagmi.siwe.message');
      localStorage.removeItem('wagmi.siwe.signature');
    }

    const message = new SiweMessage({
      domain,
      address,
      statement: 'Sign in to MusicNerd to add artists and manage your collection.',
      uri: window.location.origin,
      version: '1',
      chainId,
      nonce,
      issuedAt: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 1000 * 60 * 5).toISOString(), // 5 minutes from now
    });
    console.debug("[AuthAdapter] Created SIWE message");
    return message;
  },
  getMessageBody: ({ message }: { message: SiweMessage }) => {
    const messageBody = message.prepareMessage();
    console.debug("[AuthAdapter] Prepared message body");
    return messageBody;
  },
  verify: async ({ message, signature }) => {
    try {
      console.debug("[AuthAdapter] Starting verification", {
        domain: message.domain,
        origin: window.location.origin
      });

      // Clear any existing SIWE data
      sessionStorage.removeItem('siwe-nonce');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('siwe.session');
        localStorage.removeItem('wagmi.siwe.message');
        localStorage.removeItem('wagmi.siwe.signature');
      }

      // Clear the auto-refresh skip flag to ensure refresh happens after verification
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('autoRefreshSkipReload');
      }

      // First attempt to sign in
      const response = await signIn("credentials", {
        message: JSON.stringify(message),
        signature,
        redirect: false,
        callbackUrl: window.location.origin,
      });

      console.debug("[AuthAdapter] Sign in response received", {
        error: response?.error,
        status: response?.status,
        url: response?.url
      });

      if (response?.error) {
        console.error("[AuthAdapter] Sign in failed:", response.error);
        
        // If it's a 401 error, it might be a CSRF token issue on first login
        if (response.error.includes('401') || response.error.includes('Unauthorized')) {
          console.debug("[AuthAdapter] 401 error detected, might be first login CSRF issue");
          // Wait a bit longer and try again
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Try one more time
          const retryResponse = await signIn("credentials", {
            message: JSON.stringify(message),
            signature,
            redirect: false,
            callbackUrl: window.location.origin,
          });
          
          if (retryResponse?.error) {
            console.error("[AuthAdapter] Retry also failed:", retryResponse.error);
            return false;
          }
          
          console.debug("[AuthAdapter] Retry successful");
        } else {
          return false;
        }
      }

      // Wait a moment for the session to be established
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Dispatch verification complete event to trigger AutoRefresh
      console.debug("[AuthAdapter] Dispatching verification-complete event");
      window.dispatchEvent(new CustomEvent('verification-complete'));

      return true;
    } catch (error) {
      console.error("[AuthAdapter] Error during verification:", error);
      return false;
    }
  },
  signOut: async () => {
    try {
      console.debug("[AuthAdapter] Signing out");
      
      // Clear all session data
      sessionStorage.clear();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('siwe.session');
        localStorage.removeItem('wagmi.siwe.message');
        localStorage.removeItem('wagmi.siwe.signature');
        
        // Clear all wagmi-related data
        localStorage.removeItem('wagmi.wallet');
        localStorage.removeItem('wagmi.connected');
        localStorage.removeItem('wagmi.injected.connected');
        localStorage.removeItem('wagmi.store');
        localStorage.removeItem('wagmi.cache');
      }
      sessionStorage.removeItem('siwe-nonce');
      
      // Sign out without clearing CSRF token
      await signOut({ 
        redirect: false,
        callbackUrl: window.location.origin
      });
      
      // Wait longer for session cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Force a page reload to clear any lingering state
      window.location.reload();
      
      console.debug("[AuthAdapter] Sign out completed");
    } catch (error) {
      console.error("[AuthAdapter] Error during sign out:", error);
    }
  },
});