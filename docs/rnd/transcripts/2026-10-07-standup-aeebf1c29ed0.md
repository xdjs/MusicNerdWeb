# Music Nerd Stand Up — 2026-10-07

Meeting start: 2026-10-07T11:00:00-04:00 (America/New_York).

Source: https://docs.google.com/document/d/1VBndAumf3ioMtBzhwPrtEywqqk14Aek5v8zkxa5X4zM/edit (original requires Google access).

Verbatim text from the Google-generated Transcript tab. Transcription errors may be present.

```text
Oct 7, 2026
Music Nerd Stand Up - Transcript
00:00:02

Pete Rango: Um, cool. Cool. Um, well, seems like everybody's doing good. Um, Carl, what's what's in London?
Carl Tydingco: um here for uh Jamie Sound of Fractures alone together um event. It's like his third iteration.
Pete Rango: Nice.
Carl Tydingco: And so CY and I decided like it'd be just to kind of see how it's evolving. And we're also going to meet up with uh Tom and Chris later in the week.


00:00:31

Pete Rango: Yeah, nice. That'll be fun. Um, okay. I'll give you guys my updates. Um, so most of everything that I've been working on is now live on the main page. Um, so since yesterday the agents pretty much shipped source retention. Um, I built a few previews for like question specific research that I'm looking at. Um, also like I did something where if somebody asks a question about an artist in the chat and they don't have the information, the agent now has the ability to go search for that information uh, and then come back. Um, they'll also clearly state that this is information outside of the lore. So, that that was something I was interested in is like, okay, well, yes, it's nice that it's answering questions based off of the lore, but if for some reason we don't have something specific, it can go look and it'll state that, hey, this is not from the lore, right? So, it still needs to be approved. And then also once that information is found and presented, it's also going up into the queue for an artist's uh lore.


00:01:48

Pete Rango: Um, so, uh, that's that's up and live. Um, what else? Um, looking through my notes here. Um, oh yeah, the interviewer has now more durable memory. Um, so I've I've added that to the API docs, too. So like the each question that gets asked will also know about previous questions that were asked. Um and then also it'll be aware of corrections. You know if if any correction was made it'll correct that in its own database. Um what else? Um, the UI UI now includes uh reading, answering, saving, res, resume, skip, finish topic controls. Um, so artists can also like remove old topics from instructions. Uh, I'm going to explore that a little bit. I haven't tested that one as much uh yet. It was just something that I was interested in adding. It got added and now I have to go test. Um, and then the last thing that I'm working on is just the the issue of like question quality, which I told you guys I'm kind of still trying to get that right.


00:03:07

sweetman eth (sweets): Heat. Heat.
Pete Rango: Um, I had uh a loop going with the agents last night before I went to bed and I woke up this morning and the agents have accepted five out of eight outputs from the recent tests. Um,
Carl Tydingco: Okay.
Pete Rango: so now I have to go back and read through the answers and see what's getting rejected and all that and then um and then yeah, just keep iterating on it. I'm not I'm not going to get stuck on this. It's just like something that I really wanted to make sure it wasn't hallucinating too much and that it's just like the balance, right, of like preventing hallucinations, but then also when you go to prevent hallucinations, then you're also like preventing really interesting stuff for creative connections. So,
Carl Tydingco: Mhm.
Pete Rango: it's just um it's a balance I'm playing with right now. Uh but yeah, that's pretty much it. Sweet. How are you?
sweetman eth (sweets): I'm doing well. Yesterday I got the access page out so people can now get a temporary token to be able to query the API authentication page.


00:04:11

Carl Tydingco: That was sweet.
sweetman eth (sweets): Um, can you guys see my screen?
Carl Tydingco: Yeah.
Pete Rango: Yep.
sweetman eth (sweets): Okay, so now we've got this access token section. It talks about exactly where you go. You sign into music nerd. You log in. Once you log in, you go to musicnerd.netacess. You can then copy a token. So, here's my um access page. It loads. I can then copy a token. Then I can go back over to the API reference and then I can do something like um advanced re. No. What's the one? Is it this? I'll try look again. So, run look again. Throw in my key for the authorization. I don't think this is my artist.
Carl Tydingco: You ready?
sweetman eth (sweets): I think this is a temporary placeholder. Couldn't start that. So, this is not my artist. I'll look up uh Bio Ritmo who's who I've been uh using.


00:05:13

Carl Tydingco: It's not.
sweetman eth (sweets): I'll copy their artist ID. put it in and then I run. And now it says it's rebuilding the lore. Don't need to use Postman. And then from there I can get the research status. I'll paste the Nope, not Was it research status? I think it's research status.
Carl Tydingco: Stop.
sweetman eth (sweets): Paste in the ID. It carries over my bearer token across. So I don't need to repaste that in. And then we can see social injust is pending.
Pete Rango: Nice.
sweetman eth (sweets): Lore is pending. Lore refresh is already done. I can send it again. So the front end what it does is it continues to pull this endpoint. L refresh is now running.
Carl Tydingco: Mhm.
sweetman eth (sweets): Social ingest is still pending. L refresh is done. And then I can just keep hitting this endpoint just like the front end does.


00:05:56

sweetman eth (sweets): Caption extract is now done. Social ingest is done. Lor refresh is done. So now it's finished. Um now it has finished the run and so I can do all that from the docs. That's what I did yesterday. What I'm going to be doing today is uh finishing up in situ um research.
Carl Tydingco: That's
sweetman eth (sweets): It's already here, but it just needs those UI components I was mentioning yesterday. So, I'll have that done today. Close out the issue that's now about a week ago that I've been working on. And that way at the end of the day tomorrow I'll be able to move on to new tasks.
Carl Tydingco: Very cool.
sweetman eth (sweets): That is it for me.
Carl Tydingco: The question about the API stuff once you know you get the token and then you can interact with the endpoints but all the access control based on whether you're admin or whitelist and stuff like that that all still is intact.


00:06:42

Carl Tydingco: Right.
sweetman eth (sweets): That's all based off of whatever was in on the back end. So if if the backend did not allow it before,
Carl Tydingco: Okay.
sweetman eth (sweets): it doesn't allow it now.
Carl Tydingco: Right.
sweetman eth (sweets): This gives us a great opportunity to have more uniform access control across the API endpoints.
Carl Tydingco: love it. Um, yeah, that's really great. Um,
Pete Rango: One question. um for um for somebody that lands on Music Nerd and they don't know that we have like an API page, do you think it's worth somewhere within our main page to connect it or you know make them aware that there's this page
sweetman eth (sweets): My first instinct would be to put it either in this dropdown that has the leaderboard, user profile, admin panel, account, logout, or have a footer. Right now,
Carl Tydingco: All
sweetman eth (sweets): we don't really have a traditional footer. I know Cy and Carl have both mentioned throwing things like terms of service, privacy policy. So if that is something I can have I can whip up a quick terms of service privacy policy and make a footer and throw privacy policy terms and docs in the footer.


00:07:52

sweetman eth (sweets): Do you have a preference of where it goes Pete?
Carl Tydingco: right.
Pete Rango: Um, I think a little bit of both would be cool. So, like the footer is definitely good. And then also if like I'm in my user profile, um it'd be good to have like a tab or something where it says API and then just be able to reach it.
Carl Tydingco: Yeah. Can we just um I I like the idea of sticking it all in the hamburger menu. Can we just add another item where it's about and then it'll drive you to a page that can then um collate all these links like oh you know you know little bit about us who's making this oh if there's an API if you want to jam on that here's the term of service etc etc
sweetman eth (sweets): I like the idea of an about page.
Pete Rango: Yeah, I can own the about page. Um, and if you just want to do the terms of service suite, um, that'll be helpful. Um, I can also own the footer on the main page.


00:09:00

Pete Rango: Um, yeah. So, I'll do the about I'll do all of that and then um if it's cool with you guys,
sweetman eth (sweets): Beautiful.
Pete Rango: I'll see if there's a way to implement it into the um like if you know how you can get your um your API key through the docs. Um,
Carl Tydingco: Hey
Pete Rango: I'm gonna see if you could also maybe just get that through your uh profile, your user profile. Just surface it in there.
Carl Tydingco: Okay. Um, a question for Sweetman. Back to the API. The legacy APIs, those have migrated or are they still living in the main codebase?
sweetman eth (sweets): Legacy API endpoints are still living in the main codebase.
Carl Tydingco: Okay. Are are we planning to move that over to the new API server?
sweetman eth (sweets): This is the second time you've mentioned it. Would do you consider that to be something I should hold as a high priority?
Carl Tydingco: Um uh let's see. Trying to think of how best to do this so we don't disrupt um Chris at sleeve note.


00:10:10

Carl Tydingco: I mean ideally like I would like to get all the APIs where they should be ju just to to reduce the the cognitive load on us where
sweetman eth (sweets): Mhm.
Carl Tydingco: we just know like oh all the API stuff is here right instead of like oh well we got to work here for the old legacy API and the new stuff we work here. So yeah, I I think I would like that migrated over and then it just becomes a question of making sure that DNS is set up so that it's transparent to Chris.
sweetman eth (sweets): Perfect. I will finish up Institute today and then starting tomorrow, my main priority will be moving all the APIs over. Um, and with the goal being communicating to to Chris what the new endpoint is,
Pete Rango: Cool.
sweetman eth (sweets): getting him to merge over to the new endpoint. That way, we can fully delete the API folder from the front-end web code.
Carl Tydingco: Great. I love it. Thank you.
Pete Rango: Um, no, no rush. Uh, sweet,


00:11:14

Carl Tydingco: Very
Pete Rango: but when do you think um you'll be able to have some time to um finish the um the loading states for the chat or sorry, not for the chat, for the uh profile generation.
sweetman eth (sweets): the artist profile generation like as the research is happening having those that's today so by the in our call tomorrow I will demo
Pete Rango: Okay, cool. Sick. Um,
Carl Tydingco: cool.
Pete Rango: yeah, I have a call with Amaya today, so I'm excited to just show her where we're at with everything.
Carl Tydingco: Love it. Yep. Yep. Yep. I'm excited to hear how that goes, too. Uh oh,
Pete Rango: Mhm.
Carl Tydingco: just quickly, um the the the new domain name is up. Everything should work, but let me know if something doesn't. So,
Pete Rango: Yeah, everything's been working on my end. I also went and changed Instagram and Twitter to music nerdnet.
Carl Tydingco: sweet.
Pete Rango: So, we're live.
Carl Tydingco: All righty. That sounds great.
Pete Rango: Cool, guys. Uh, I'm in today, so I'll just be working on on all these stuffs. Um, I'll have everything ready for tomorrow.
Carl Tydingco: Great. All right,
Pete Rango: All right,
Carl Tydingco: have a good one.
Pete Rango: guys. Have a good trip.
sweetman eth (sweets): Have a great deal. Bye.
Pete Rango: See you.


Transcription ended after 00:12:34

This editable transcript was computer generated and might contain errors. People can also change the text after it was created.
```
