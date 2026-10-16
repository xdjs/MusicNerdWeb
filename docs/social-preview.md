# Default link preview

Pete approved the record-sleeve card on October 16, 2026 and requested it as
the musicnerd.net thumbnail for now ([#1503](https://github.com/xdjs/MusicNerdWeb/issues/1503)).
The card keeps the pink logo-only sleeve, a smaller vinyl record, a black
background and white sentence-case text: “The music is only half the story.”

![Approved Music Nerd link-preview card](../public/social/music-nerd-record-sleeve-v1.png)

The static PNG is 1200 × 630. `src/lib/socialPreviewImage.ts` supplies its
absolute URL, dimensions and alt text to root and homepage Open Graph metadata;
root Twitter metadata uses the same image and `@musicnerdnet`. The homepage
explicitly includes the image because its Open Graph object replaces the root
object. Other routes inherit the defaults unless they define their own metadata.
Artist profiles retain their existing artist-specific images and `/icon.ico`
remains the favicon. Titles and descriptions are unchanged.

This is static metadata and a public asset: no route/action, database, job,
authentication or provider changes. Future artwork changes should use a new
filename so crawlers can discover new image bytes. Preview services may still
cache previously shared pages until they fetch the URL again.

Verify the rendered homepage and an inherited page such as `/about`, the image's
anonymous HTTP response and PNG dimensions/bytes, and an artist page's distinct
image on the exact preview, staging and production deployments. Record release
evidence on the issue/PR; approval of the design alone is not proof of deployment.
