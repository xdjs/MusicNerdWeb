#!/usr/bin/env python3
"""
Test suite for the call_artist_bio.py script.
"""

import unittest
import json
import sys
import os
from unittest.mock import Mock, patch, MagicMock
from io import StringIO
import requests

# Add the script directory to the path so we can import the module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the module under test
from call_artist_bio import ArtistBioClient, main


class TestArtistBioClient(unittest.TestCase):
    """Test cases for the ArtistBioClient class."""
    
    def setUp(self):
        """Set up test fixtures before each test method."""
        self.client = ArtistBioClient("http://test.example.com")
        self.test_artist_id = "test-artist-123"
    
    def test_client_initialization(self):
        """Test client initialization with default and custom base URLs."""
        # Test default initialization
        default_client = ArtistBioClient()
        self.assertEqual(default_client.base_url, "http://localhost:3000")
        
        # Test custom base URL
        custom_client = ArtistBioClient("https://api.example.com/")
        self.assertEqual(custom_client.base_url, "https://api.example.com")
        
        # Test base URL with trailing slash removal
        trailing_slash_client = ArtistBioClient("http://example.com/")
        self.assertEqual(trailing_slash_client.base_url, "http://example.com")
    
    def test_session_headers(self):
        """Test that session headers are set correctly."""
        expected_headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'ArtistBio-Python-Client/1.0'
        }
        
        for key, value in expected_headers.items():
            self.assertEqual(self.client.session.headers[key], value)
    
    @patch('call_artist_bio.requests.Session.get')
    def test_successful_bio_retrieval(self, mock_get):
        """Test successful artist bio retrieval."""
        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.headers = {'content-type': 'application/json'}
        mock_response.json.return_value = {'bio': 'Test artist bio content'}
        mock_get.return_value = mock_response
        
        with patch('builtins.print'):  # Suppress print statements during test
            result = self.client.get_artist_bio(self.test_artist_id)
        
        # Verify the result
        self.assertIsNotNone(result)
        self.assertEqual(result['bio'], 'Test artist bio content')
        
        # Verify the request was made correctly
        mock_get.assert_called_once()
        call_args = mock_get.call_args
        self.assertIn(f"/api/artistBio/{self.test_artist_id}", call_args[0][0])
    
    @patch('call_artist_bio.requests.Session.get')
    def test_artist_not_found(self, mock_get):
        """Test handling of 404 artist not found."""
        mock_response = Mock()
        mock_response.status_code = 404
        mock_response.headers = {'content-type': 'application/json'}
        mock_response.json.return_value = {'error': 'Artist not found'}
        mock_get.return_value = mock_response
        
        with patch('builtins.print'):
            result = self.client.get_artist_bio(self.test_artist_id)
        
        self.assertIsNone(result)
    
    @patch('call_artist_bio.requests.Session.get')
    def test_request_timeout_status(self, mock_get):
        """Test handling of 408 timeout status."""
        mock_response = Mock()
        mock_response.status_code = 408
        mock_response.headers = {'content-type': 'application/json'}
        mock_response.json.return_value = {
            'error': 'Bio generation timed out. Please try again later.',
            'bio': 'Bio generation is taking longer than expected. Please refresh the page to try again.'
        }
        mock_get.return_value = mock_response
        
        with patch('builtins.print'):
            result = self.client.get_artist_bio(self.test_artist_id)
        
        self.assertIsNone(result)
    
    @patch('call_artist_bio.requests.Session.get')
    def test_server_error(self, mock_get):
        """Test handling of 500 server error."""
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.headers = {'content-type': 'application/json'}
        mock_response.json.return_value = {'error': 'Internal server error'}
        mock_get.return_value = mock_response
        
        with patch('builtins.print'):
            result = self.client.get_artist_bio(self.test_artist_id)
        
        self.assertIsNone(result)
    
    @patch('call_artist_bio.requests.Session.get')
    def test_connection_error(self, mock_get):
        """Test handling of connection errors."""
        mock_get.side_effect = requests.exceptions.ConnectionError("Connection failed")
        
        with patch('builtins.print'):
            result = self.client.get_artist_bio(self.test_artist_id)
        
        self.assertIsNone(result)
    
    @patch('call_artist_bio.requests.Session.get')
    def test_request_timeout_exception(self, mock_get):
        """Test handling of request timeout exceptions."""
        mock_get.side_effect = requests.exceptions.Timeout("Request timed out")
        
        with patch('builtins.print'):
            result = self.client.get_artist_bio(self.test_artist_id)
        
        self.assertIsNone(result)
    
    @patch('call_artist_bio.requests.Session.get')
    def test_json_decode_error(self, mock_get):
        """Test handling of JSON decode errors."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.headers = {'content-type': 'application/json'}
        mock_response.json.side_effect = json.JSONDecodeError("Invalid JSON", "", 0)
        mock_response.text = "Invalid JSON response"
        mock_get.return_value = mock_response
        
        with patch('builtins.print'):
            result = self.client.get_artist_bio(self.test_artist_id)
        
        self.assertIsNone(result)
    
    @patch('call_artist_bio.requests.Session.get')
    def test_non_json_response(self, mock_get):
        """Test handling of non-JSON responses."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.headers = {'content-type': 'text/plain'}
        mock_response.text = "Plain text response"
        mock_get.return_value = mock_response
        
        with patch('builtins.print'):
            result = self.client.get_artist_bio(self.test_artist_id)
        
        self.assertIsNotNone(result)
        self.assertEqual(result['raw'], "Plain text response")
    
    @patch('call_artist_bio.requests.Session.get')
    def test_unexpected_status_code(self, mock_get):
        """Test handling of unexpected status codes."""
        mock_response = Mock()
        mock_response.status_code = 418  # I'm a teapot
        mock_response.headers = {'content-type': 'application/json'}
        mock_response.json.return_value = {'message': 'I am a teapot'}
        mock_get.return_value = mock_response
        
        with patch('builtins.print'):
            result = self.client.get_artist_bio(self.test_artist_id)
        
        self.assertIsNotNone(result)
        self.assertEqual(result['message'], 'I am a teapot')


class TestMainFunction(unittest.TestCase):
    """Test cases for the main function and command line interface."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.original_argv = sys.argv.copy()
    
    def tearDown(self):
        """Clean up after tests."""
        sys.argv = self.original_argv
    
    @patch('call_artist_bio.ArtistBioClient')
    @patch('sys.exit')
    def test_successful_main_execution(self, mock_exit, mock_client_class):
        """Test successful main function execution."""
        # Mock the client and its methods
        mock_client = Mock()
        mock_client.get_artist_bio.return_value = {'bio': 'Test bio'}
        mock_client_class.return_value = mock_client
        
        # Set up command line arguments
        sys.argv = ['call_artist_bio.py', 'test-artist-123']
        
        with patch('builtins.print'):
            main()
        
        # Verify client was created and called correctly
        mock_client_class.assert_called_once_with(base_url="http://localhost:3000")
        mock_client.get_artist_bio.assert_called_once_with('test-artist-123')
        mock_exit.assert_called_once_with(0)
    
    @patch('call_artist_bio.ArtistBioClient')
    @patch('sys.exit')
    def test_main_with_custom_url(self, mock_exit, mock_client_class):
        """Test main function with custom URL."""
        mock_client = Mock()
        mock_client.get_artist_bio.return_value = {'bio': 'Test bio'}
        mock_client_class.return_value = mock_client
        
        sys.argv = ['call_artist_bio.py', 'test-artist-123', '--url', 'https://api.example.com']
        
        with patch('builtins.print'):
            main()
        
        mock_client_class.assert_called_once_with(base_url="https://api.example.com")
        mock_exit.assert_called_once_with(0)
    
    @patch('call_artist_bio.ArtistBioClient')
    @patch('sys.exit')
    def test_main_with_verbose_flag(self, mock_exit, mock_client_class):
        """Test main function with verbose flag."""
        mock_client = Mock()
        mock_client.get_artist_bio.return_value = {'bio': 'Test bio', 'extra': 'data'}
        mock_client_class.return_value = mock_client
        
        sys.argv = ['call_artist_bio.py', 'test-artist-123', '--verbose']
        
        with patch('builtins.print'):
            main()
        
        mock_client.get_artist_bio.assert_called_once_with('test-artist-123')
        mock_exit.assert_called_once_with(0)
    
    @patch('call_artist_bio.ArtistBioClient')
    @patch('sys.exit')
    def test_main_failure(self, mock_exit, mock_client_class):
        """Test main function when API call fails."""
        mock_client = Mock()
        mock_client.get_artist_bio.return_value = None
        mock_client_class.return_value = mock_client
        
        sys.argv = ['call_artist_bio.py', 'invalid-artist']
        
        with patch('builtins.print'):
            main()
        
        mock_exit.assert_called_once_with(1)
    
    @patch('sys.exit')
    def test_empty_artist_id(self, mock_exit):
        """Test main function with empty artist ID."""
        sys.argv = ['call_artist_bio.py', '']
        
        with patch('builtins.print'):
            main()
        
        # sys.exit should be called at least once with code 1
        mock_exit.assert_called_with(1)
    
    @patch('sys.exit')
    def test_whitespace_only_artist_id(self, mock_exit):
        """Test main function with whitespace-only artist ID."""
        sys.argv = ['call_artist_bio.py', '   ']
        
        with patch('builtins.print'):
            main()
        
        # sys.exit should be called at least once with code 1
        mock_exit.assert_called_with(1)
    
    @patch('call_artist_bio.ArtistBioClient')
    @patch('sys.exit')
    def test_keyboard_interrupt(self, mock_exit, mock_client_class):
        """Test handling of keyboard interrupt."""
        mock_client = Mock()
        mock_client.get_artist_bio.side_effect = KeyboardInterrupt()
        mock_client_class.return_value = mock_client
        
        sys.argv = ['call_artist_bio.py', 'test-artist-123']
        
        with patch('builtins.print'):
            main()
        
        mock_exit.assert_called_once_with(130)
    
    @patch('call_artist_bio.ArtistBioClient')
    @patch('sys.exit')
    def test_unexpected_exception(self, mock_exit, mock_client_class):
        """Test handling of unexpected exceptions."""
        mock_client = Mock()
        mock_client.get_artist_bio.side_effect = Exception("Unexpected error")
        mock_client_class.return_value = mock_client
        
        sys.argv = ['call_artist_bio.py', 'test-artist-123']
        
        with patch('builtins.print'):
            main()
        
        mock_exit.assert_called_once_with(1)


class TestIntegration(unittest.TestCase):
    """Integration tests for the complete script functionality."""
    
    @patch('call_artist_bio.requests.Session.get')
    def test_end_to_end_successful_flow(self, mock_get):
        """Test complete end-to-end successful flow."""
        # Mock a successful API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.headers = {'content-type': 'application/json'}
        mock_response.json.return_value = {
            'bio': 'This is a comprehensive artist biography with detailed information about their career and achievements.'
        }
        mock_get.return_value = mock_response
        
        client = ArtistBioClient("http://localhost:3000")
        
        with patch('builtins.print') as mock_print:
            result = client.get_artist_bio("real-artist-id")
        
        # Verify the result
        self.assertIsNotNone(result)
        self.assertIn('bio', result)
        self.assertTrue(len(result['bio']) > 0)
        
        # Verify that logging occurred (print was called)
        self.assertTrue(mock_print.called)
        
        # Verify the correct URL was called
        mock_get.assert_called_once()
        called_url = mock_get.call_args[0][0]
        self.assertIn('/api/artistBio/real-artist-id', called_url)


if __name__ == '__main__':
    # Configure test runner
    unittest.main(verbosity=2, buffer=True)
