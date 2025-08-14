## Api Endpoints
Url Structure: `{baseurl}/api/{endpoint}`

### Artist Search & Discovery

**searchArtists**

 - Type: POST
 - Body: `{query: "searchTerm"}`
 - Response: `{results: Array<Artist>}` (combined results from local DB and Spotify)
 - Auth: N/A
 - Error: Returns 400 if query is missing or invalid, 500 for server errors

**searchArtists/batch**

 - Type: POST
 - Body: `{artists: ["artist1", "artist2"]} | {artist: "singleArtist"}`
 - Response: `{results: Array<Artist>}` (batch search results)
 - Auth: N/A
 - CORS: Enabled
 - Error: Returns 400 if no queries provided, 408 for timeout, 500 for server errors

**findArtistBySpotifyID**

 - Type: POST
 - Body: `{spotifyID: "yourSpotifyId"}`
 - Response: `{result: Artist}` (object ref in schema folder)
 - Auth: N/A
 - Error: Returns 400 if spotifyID is missing, 405 for non-POST requests

**findArtistByIG**

 - Type: POST
 - Body: `{ig: "instagramHandle"}`
 - Response: `{result: Artist}` (object ref in schema folder)
 - Auth: N/A
 - Error: Returns 400 if instagram handle is missing, 405 for non-POST requests

**findTwitterHandle**

 - Type: POST
 - Body: `{name: "artistName"} | {ethAddress: "yourEthAddress"}` (can be .eth or wallet address)
 - Response: `{result: "artistTwitterHandle"}`
 - Auth: N/A
 - Error: Returns 400 if both name and ethAddress are missing, 405 for non-POST requests

### Artist Data & Content

**artistBio/[id]**

 - Type: GET, PUT
 - GET Response: `{bio: "generated bio text"}`
 - PUT Body: `{bio: "new bio", regenerate?: boolean}`
 - PUT Response: `{message: "success", bio?: "generated bio"}`
 - Auth: PUT requires authentication for regeneration
 - CORS: Enabled
 - Error: 404 if artist not found, 408 for timeout, 500 for server errors

**getSpotifyData**

 - Type: GET
 - Query: `?spotifyId=yourSpotifyId`
 - Response: `{data: SpotifyArtist}` (includes name, images, followers, genres, etc.)
 - Auth: N/A
 - CORS: Enabled
 - Error: 400 if spotifyId missing, 404 if invalid ID, 502 for Spotify API errors

**funFacts/[type]**

 - Type: GET
 - Query: `?id=artistId`
 - Params: `type` (fun fact category)
 - Response: `{funFact: "generated fun fact"}`
 - Auth: N/A
 - Error: 400 if artist id missing, 404 if artist not found, 408 for timeout

### Platform & Link Management

**validateLink**

 - Type: POST
 - Body: `{url: "platformUrl", platform: "platformName"}`
 - Response: `{isValid: boolean, error?: string}`
 - Auth: N/A
 - Error: 400 for invalid input, 500 for validation errors

**platformRegexes**

 - Type: GET
 - Response: `Array<{siteName: string, regex: string}>`
 - Auth: N/A
 - Note: Excludes 'ens' and 'wallets' platforms

### Leaderboard & Statistics

**leaderboard**

 - Type: GET
 - Query: `?from=date&to=date&page=1&perPage=10`
 - Response: `Array<LeaderboardEntry>` or `{entries: Array, total: number, pageCount: number}`
 - Auth: N/A (with walletless mode support)
 - Error: 500 for server errors

**pendingUGCCount**

 - Type: GET
 - Response: `{count: number}`
 - Auth: Admin required (returns 0 for non-admin)
 - Error: Returns count 0 on errors

**approvedUGCCount**

 - Type: GET
 - Response: `{count: number}`
 - Auth: Admin required
 - Error: 500 for server errors

**ugcCount**

 - Type: GET
 - Response: `{count: number}`
 - Auth: Session-based
 - Error: 500 for server errors

**recentEdited**

 - Type: GET
 - Query: `?userId=userId`
 - Response: `Array<RecentEdit>`
 - Auth: Session-based or userId parameter
 - Error: Returns empty array on errors

### Development & Testing

**coverage**

 - Type: GET
 - Query: `?format=json|html|lcov`
 - Response: Coverage data in requested format
 - Auth: N/A
 - Error: 404 if coverage data not found, 400 for unsupported format

**test-log**

 - Type: GET, POST
 - Response: Test logging data
 - Auth: N/A
 - Note: Development/testing endpoint

**Example Usage**
```javascript
// Example for findTwitterHandle
axios.post('https://api.musicnerd.xyz/api/findTwitterHandle', {
  ethAddress: '0xc7A0D765C3aF6E2710bA05A56c5E2cA190C2E11e'
})
  .then(response => {
    console.log('Response:', response.data);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```