#!/usr/bin/env python3
"""
Python script to call the artistBio API endpoint.
Usage: python call_artist_bio.py <artist_id>
"""

import sys
import requests
import json
import time
import argparse
from typing import Optional, Dict, Any
from urllib.parse import urljoin


class ArtistBioClient:
    """Client for calling the artistBio API endpoint with verbose logging."""
    
    def __init__(self, base_url: str = "https://localhost:3000"):
        """
        Initialize the client.
        
        Args:
            base_url: Base URL of the API (default: https://localhost:3000)
        """
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        
        # Set default headers
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'ArtistBio-Python-Client/1.0'
        })
        
        print(f"[INFO] Initialized client with base URL: {self.base_url}")
    
    def get_artist_bio(self, artist_id: str) -> Optional[Dict[str, Any]]:
        """
        Get artist bio from the API.
        
        Args:
            artist_id: The ID of the artist
            
        Returns:
            Dictionary containing the response data or None if failed
        """
        endpoint = f"/api/artistBio/{artist_id}"
        url = urljoin(self.base_url + "/", endpoint.lstrip('/'))
        
        print(f"[INFO] Making GET request to: {url}")
        print(f"[INFO] Artist ID: {artist_id}")
        print(f"[INFO] Request headers: {dict(self.session.headers)}")
        
        try:
            start_time = time.time()
            print(f"[INFO] Sending request at {time.strftime('%Y-%m-%d %H:%M:%S')}")
            
            response = self.session.get(url, timeout=30)
            
            end_time = time.time()
            duration = end_time - start_time
            
            print(f"[INFO] Response received in {duration:.2f} seconds")
            print(f"[INFO] Status Code: {response.status_code}")
            print(f"[INFO] Response headers: {dict(response.headers)}")
            
            # Log response content
            if response.headers.get('content-type', '').startswith('application/json'):
                try:
                    response_data = response.json()
                    print(f"[INFO] Response JSON:")
                    print(json.dumps(response_data, indent=2, ensure_ascii=False))
                except json.JSONDecodeError as e:
                    print(f"[ERROR] Failed to parse JSON response: {e}")
                    print(f"[ERROR] Raw response: {response.text}")
                    return None
            else:
                print(f"[INFO] Non-JSON response content: {response.text}")
            
            # Handle different status codes
            if response.status_code == 200:
                print(f"[SUCCESS] Successfully retrieved artist bio")
                return response_data if 'response_data' in locals() else {'raw': response.text}
                
            elif response.status_code == 404:
                print(f"[ERROR] Artist not found (404)")
                return None
                
            elif response.status_code == 408:
                print(f"[ERROR] Request timeout (408) - Bio generation took too long")
                return None
                
            elif response.status_code == 500:
                print(f"[ERROR] Internal server error (500)")
                return None
                
            else:
                print(f"[WARNING] Unexpected status code: {response.status_code}")
                return response_data if 'response_data' in locals() else {'raw': response.text}
                
        except requests.exceptions.Timeout:
            print(f"[ERROR] Request timed out after 30 seconds")
            return None
            
        except requests.exceptions.ConnectionError as e:
            print(f"[ERROR] Connection error: {e}")
            print(f"[ERROR] Make sure the server is running at {self.base_url}")
            return None
            
        except requests.exceptions.RequestException as e:
            print(f"[ERROR] Request failed: {e}")
            return None
            
        except Exception as e:
            print(f"[ERROR] Unexpected error: {e}")
            return None


def main():
    """Main function to handle command line arguments and execute the API call."""
    parser = argparse.ArgumentParser(
        description="Call the artistBio API endpoint",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python call_artist_bio.py 123
  python call_artist_bio.py abc-def-456 --url https://api.musicnerd.xyz
  python call_artist_bio.py 789 --url https://localhost:3000
        """
    )
    
    parser.add_argument(
        "artist_id",
        help="The ID of the artist to get bio for"
    )
    
    parser.add_argument(
        "--url", "-u",
        default="https://localhost:3000",
        help="Base URL of the API (default: https://localhost:3000)"
    )
    
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable extra verbose output"
    )
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("ARTIST BIO API CLIENT")
    print("=" * 60)
    print(f"[INFO] Starting artist bio retrieval")
    print(f"[INFO] Artist ID: {args.artist_id}")
    print(f"[INFO] API URL: {args.url}")
    print(f"[INFO] Verbose mode: {'ON' if args.verbose else 'OFF'}")
    print("-" * 60)
    
    # Validate artist_id
    if not args.artist_id or not args.artist_id.strip():
        print("[ERROR] Artist ID cannot be empty")
        sys.exit(1)
    
    # Create client and make request
    client = ArtistBioClient(base_url=args.url)
    
    try:
        result = client.get_artist_bio(args.artist_id.strip())
        
        print("-" * 60)
        
        if result is not None:
            print("[SUCCESS] Operation completed successfully")
            
            # Extract and display bio if present
            if isinstance(result, dict) and 'bio' in result:
                print(f"[RESULT] Artist Bio:")
                print("=" * 40)
                print(result['bio'])
                print("=" * 40)
            
            if args.verbose:
                print(f"[VERBOSE] Full response data:")
                print(json.dumps(result, indent=2, ensure_ascii=False))
                
            sys.exit(0)
        else:
            print("[FAILURE] Failed to retrieve artist bio")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n[INFO] Operation cancelled by user")
        sys.exit(130)
        
    except Exception as e:
        print(f"[ERROR] Unexpected error in main: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
