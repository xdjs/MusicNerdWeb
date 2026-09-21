# User-profile update filters

Issue #1309: the user-profile feed has All, Releases, Socials and Lore. Socials includes Instagram posts and In-Process moments. Lore includes interview answers only. Card source labels, destinations and expanded views stay unchanged; this does not rename the top-level artist-profile sections.

September 21: Pete also requested the same four filters and glass slider inside artist-profile Latest. Both surfaces use one shared filter component. An empty selected category explains that there are no updates yet; a different artist starts on All.

The preview, live client and updates API share the filter mapping. Filtering happens before the existing two-update-per-artist cap. Existing Instagram, Interview and In-Process API values remain accepted for older clients. The four choices retain the glass slider, pointer and keyboard controls.
