# Music Nerd Stand Up — 2026-10-14

Meeting start: 2026-10-14T11:00:00-04:00 (America/New_York).

Source: https://docs.google.com/document/d/1vj9nA-lHMIQvym5rxIc2UewShrP7XoAVmOeLENaVRdg/edit (original requires Google access).

Verbatim text from the Google-generated Transcript tab. Transcription errors may be present.

```text
Oct 14, 2026
Music Nerd Stand Up - Transcript
00:00:00

sweetman eth (sweets): until your stuff's up and after yesterday I'm like I shouldn't depend on next recording to do my work. So I'm I'm just going to record them on my set.
Pete Rango: Cool. Cool. Sounds good. All right. Well, we're recording. Hopefully, this makes it. Um, so just some updates on my side. Um, I started working on Oh, well I deployed the about page.
Carl Tydingco: There's
Pete Rango: Uh, I got the edits that CY had. Um, so those are in. Um, just to show you guys real quick what that is. I mean,
Carl Tydingco: that.
Pete Rango: it's not that much different from yesterday, but I'll just show you guys. I also added the little glasses here for the about icon. Um, and then yeah, so a few changes was the four fans, for artists, for nerds. Um, what else?


00:00:53

Pete Rango: And all the socials are working. I noticed that when I had first put it, it had some of our old socials. So those are up todate now.
Carl Tydingco: Nice.
Pete Rango: Um, the other thing is I worked on um the chat. Man, I've I've just kind of been trying to make sure this chat is good because I keep running into issues here and there. And I noticed that and this is actually like the same pattern I had when I first started working on
Carl Tydingco: Just
Pete Rango: um just music nerd chats in general uh in the past where it would just we'd work on it, work on it, work on it and like it just would get more and more restricted. So um so I worked on loosening that up uh creating tools for the chat to pull information from music API.
Carl Tydingco: Yeah.
Pete Rango: So, um, the test passed, so it should be better now. It should respond with more like what's latest or what what more, you know, and like things like that. So, it should be ready.


00:01:46

Pete Rango: I'm working on pushing that to production, so we should have those up. Um, I have two other I have API number 40, which improves selection and avoids unnecessary research, which is kind of what I was touching on.
Carl Tydingco: Heat.
Pete Rango: Um, and the web 5101 U are the issues that I'm going to be or the PRs that I'm going to be pushing today. So, those should be good. I just needed I want to do a couple more tests outside of like Latash and Duchy, which are the only ones that I've tested. Um, and those should be good to go. Um, but yeah, those are my updates. I also have to review uh I was reading through my writing for uh the feed forward and I just want to edit a little bit more and then I I'll push it out today.
Carl Tydingco: Sweet.
Pete Rango: Um, yeah. So, I'll turn it over to Sweet when he comes back.
Carl Tydingco: speed rage quit. It's like, damn it, Pete. Oh, see, do I have any updates?


00:02:48

Carl Tydingco: Um, what's going on? Oh, no. Sweeten's back. I I don't have to uh We thought you rage quit, Sweden.
sweetman eth (sweets): I did. I was so upset by what Pete's working on that I just decided I'm never going to again. My computer froze up and so sometimes I need to just shut the lid and open it again and that locked me out.
Carl Tydingco: Uh harderwise,
sweetman eth (sweets): And I've got a MacBook
Carl Tydingco: what's your daily driver?
sweetman eth (sweets): Pro. Um, I think it's a 12 in and I bought it back in 2020. I had my battery swapped in February down here in Colia and a month later it started to be so that the battery didn't even last 30 minutes off the new battery. And so I I'm right now going through the guar the warranty because they gave me a warranty and they said that the battery is in. So hopefully the battery is going to be improved, but I'm starting to realize it's probably getting towards the end of the laptop's life.


00:03:43

sweetman eth (sweets): So, I'm going to start putting money aside to start buying a new one. I think MacBook that I'm looking at is like $3,000. So, I'm probably going to start putting aside like 500 a month and then 6 months from now buy a new
Carl Tydingco: Uhhuh. Yep.
sweetman eth (sweets): one.
Carl Tydingco: Yep.
Pete Rango: We'll be at like M7 by then.
Carl Tydingco: Yep.
sweetman eth (sweets): Yeah. Yeah. I'm on the Intel.
Carl Tydingco: I I Yeah.
sweetman eth (sweets): I'm on the last uh before they swapped over their own chip.
Carl Tydingco: Oh, yeah. You need to move because didn't they end of life Intel? There's no more OS updates for Intel, right?
sweetman eth (sweets): Uh I still get a that might be right.
Carl Tydingco: Yeah.
sweetman eth (sweets): I can't remember the last time I've gotten an OS update.
Carl Tydingco: Yeah. Yeah. Um, you know, I I will say like if you're amenable to it, I always get um I always get reverbs out of the Apple store.


00:04:27

sweetman eth (sweets): You mean like return your laptop or No,
Carl Tydingco: No, no, I mean like buy refurbs.
sweetman eth (sweets): you buy a refurbished one.
Carl Tydingco: Yeah,
sweetman eth (sweets): Really?
Carl Tydingco: I buy I buy the Apple refurbs that come out of the Apple store.
sweetman eth (sweets): Yeah.
Carl Tydingco: They have a section at the You scroll all the way down and it says refurbish and you click there and it'll just give you like all their refurbs that they have available. I mean, it's it's like brand new basically and you have all the Apple warranties and all that crap.
sweetman eth (sweets): Really? You haven't had any issues with this?
Carl Tydingco: Yeah.
sweetman eth (sweets): Okay. Okay. Interesting. I did that with the the phone because I I've always been an Android guy. Um,
Carl Tydingco: Yep.
sweetman eth (sweets): but then now now that I live abroad, like a screen breaks and I want it to get fixed and I was on the Google Pixel and people around here don't have Google Pixel screens and but anywhere you go in the world they can fix an iPhone screen,


00:05:10

Carl Tydingco: Oh, yep.
sweetman eth (sweets): they can fix an iPhone battery and so it's it's fixing it and like maintaining a device is easier.
Carl Tydingco: Yep. Yep. Yep.
sweetman eth (sweets): So I bought the I bought a 12 200 bucks on Amazon. I'm like $200 for a phone.
Carl Tydingco: Yep.
sweetman eth (sweets): I can't even buy a good a good like Android for that price. And it's almost lasted me a year.
Carl Tydingco: Uhhuh.
sweetman eth (sweets): I bought it December of last year and the battery needs swapped out, but I'll swap it down here. I'll go to the bus terminal and someone over there will flop it out and it'll be like 20 bucks to get a new battery and it'll probably last me
Carl Tydingco: Yeah.
sweetman eth (sweets): another year. So, I don't need much.
Carl Tydingco: So,
sweetman eth (sweets): So, if the same thing works with the laptop,
Carl Tydingco: you're Yeah.
sweetman eth (sweets): I'll I'll look at the refurbished. Do you know how much that'll save?


00:05:45

Carl Tydingco: Yeah. Um, you know, it's not like spectacular savings. It depending on the hardware, it's 10 to 14% off list.
sweetman eth (sweets): Okay,
Carl Tydingco: If you really want Yeah.
sweetman eth (sweets): that's what you do.
Carl Tydingco: If you really want to optimize for savings, Best Buy open box.
sweetman eth (sweets): Best Buy.
Carl Tydingco: I always do that.
sweetman eth (sweets): You go to Best Buy and they open the What's that?
Carl Tydingco: So, so it's like, you know, they Best Buy gets returns, right?
sweetman eth (sweets): Right.
Carl Tydingco: And and um they they will do, you know, they they'll they'll clean up the things that they just call their return the the stuff that they get returns on and that they re and clean up and resell. They call it open box.
sweetman eth (sweets): Okay.
Carl Tydingco: Yeah. And that h it's it's on their so they have that inventory available on their website. I I I don't remember the last time I physically walked into a Best Buy, but yeah, I do that. Who walks into stores anymore?


00:06:43

sweetman eth (sweets): Yeah.
Carl Tydingco: Yeah.
sweetman eth (sweets): Losers.
Carl Tydingco: I didn't say No, it No, I remember like years ago a bit flipped in my head and I remember I was standing in line and I had like a, you know, a big pack of toilet paper with me and I'm like, "This is dumb. Like, you know, toilet paper should just get shipped to my house, right? Just like what am I doing? Anyways, I I think I've sufficiently derailed stand up. Please continue.
sweetman eth (sweets): Did you already finish, Pete?
Pete Rango: Yeah. Yeah, I finished.
sweetman eth (sweets): Okay. What? I got up yesterday. Um, I waited a couple hours to see when the transcript come up so that I could do the feedback. Transcript never came back.
Carl Tydingco: Sure.
sweetman eth (sweets): I don't remember what the feedback was on the um in situ.
Pete Rango: You want to do it again?
sweetman eth (sweets): So, for we we can either talk through it again now that I'm recording or we can uh Okay, we can talk through it again then.


00:07:46

Pete Rango: Nuke me.
sweetman eth (sweets): Make sure I got in.
Carl Tydingco: But we rebuild you better,
sweetman eth (sweets): Um um you know what I'm not ready.
Carl Tydingco: faster, stronger, Pete.
sweetman eth (sweets): You mind if we do it tomorrow just so that I'm not wasting time trying to get my cloud session open and stuff?
Carl Tydingco: Sure.
sweetman eth (sweets): Okay.
Carl Tydingco: Yes.
sweetman eth (sweets): So what I what I did end up working through yesterday is I started progressing the sleeve note API migration. So I'll share what the docs are here.
Carl Tydingco: Cool.
sweetman eth (sweets): That's one of the three. The other two were found in the navbar adjacent to that one.
Carl Tydingco: Okay,
sweetman eth (sweets): Um,
Carl Tydingco: let's take a look.
sweetman eth (sweets): and so I've got it on my screen. Can you all see? We've got three down here in the artist lookups are the three end points that Sleeve Note needs. Find an artist by Spotify ID, find an artist by Instagram handle, and find an artist X handle.


00:08:34

sweetman eth (sweets): The first two are looking up an artist um by an ID. The second one is given an artist, give me the the Twitter handle for it.
Carl Tydingco: Yeah.
sweetman eth (sweets): So it defines the the input and output. These match exactly what production does. I verified it multiple times.
Carl Tydingco: Sweet.
sweetman eth (sweets): Um I've also already shipped all three endpoints in the API. The uh flag that happened is on staging it all worked great.
Pete Rango: Oh goodness.
sweetman eth (sweets): Going up to production. It seems that the there's a difference in the databases that cause these endpoints to return 500s on production. So I've already got a new PR up to fix it.
Carl Tydingco: Oh,
sweetman eth (sweets): I have not tested it yet. So, I need to test it, review that code, and get it shipped. The API is on the finish line. And then once I get this shipped, I'll update the front end web today to use the new docs, I'm sorry, not docs, api.musicnerd.net.


00:09:27

sweetman eth (sweets): Um,
Carl Tydingco: okay.
sweetman eth (sweets): so that way we're we're quering the production site. And um yeah, once that's done, then I'll send you a message on Discord and I'll say, "Hey, it's ready for the sleeve cut over." and then we can talk about it or you can talk with the Sleep Note team to figure out how we want to do that. How involved you want them or if we just cut it over and see if we break their apps.
Carl Tydingco: A couple questions. One, you said that um there is drift between the production and development database.
sweetman eth (sweets): Yeah, it seems like there's two fields that uh come back or that happened processing in the back end that are missing two fields in one of the tables. If you would you like me to get you precisely what the drift is.
Carl Tydingco: Um, so at this point the development database is no longer structurally a mirror of what's in production. Okay. Okay. Um I will put up an issue to I I think I mentioned before that I wanted to rethink how we want to do um I I want to automate more the database development stuff so that I mean you know when when I see something like this it just tells me like okay because it usually becomes because things are are manual right if you if things are automated you don't tend to tend to have schema drift


00:10:53

sweetman eth (sweets): Right.
Carl Tydingco: Okay, I'll put up an issue for that and um I'll start poking around on that. Um Okay.
sweetman eth (sweets): I'll do a quick look so that I can give you precisely that way you know where to look.
Carl Tydingco: Okay. Okay.
sweetman eth (sweets): non-blocking.
Carl Tydingco: Yeah. Hey,
sweetman eth (sweets): It's not blocking me. If this is important to you,
Carl Tydingco: sure.
sweetman eth (sweets): that's great. But it is not blocking me.
Carl Tydingco: Okay. Okay. Okay. Yeah. This this is kind of like Okay. This is tech debt that needs to get paid. I I think should get paid now in instead of later where it may be more expensive. So, okay. Cool. Um the second question or not question really but more of um so I think now that API.musicner nerdnet is hosting the API service and the app is using that name right to to hit it. Okay, that's great.


00:11:50

Carl Tydingco: We've verified that the legacy APIs are up and running. Then it's just letting I think what we'll do is when you think it's it's fine to cut over, I'll just tell Chris that hey, we're cutting over to a new server. Everything should be transparent. When you have time and I'll change the redirect to forxyz to go to.net and then I'll just tell Chris whenever you have time you should just update to the real name, the new name.
sweetman eth (sweets): Copy.
Carl Tydingco: Okay.
sweetman eth (sweets): And we'll wait till he migrates and then once he does we'll update the domain to point at thexyz
Carl Tydingco: Okay.
sweetman eth (sweets): domain to point.
Carl Tydingco: Okay. Okay. Cool. Great.
sweetman eth (sweets): Question for you on DNS.
Carl Tydingco: Thank you. Yes.
sweetman eth (sweets): Um first has the domain been migrated to versell yet?
Carl Tydingco: It has not um because uh it's some weird Squarespace policy that that CY acquired the.net net uh from Squarespace. And when I initially started to um transfer that domain into Versell to be managed out of Versel, they said it's a brand new domain.


00:13:00

Carl Tydingco: You have to wait till December 1st. I don't know why,
sweetman eth (sweets): Okay, copy.
Carl Tydingco: but um yeah, when when that happens,
sweetman eth (sweets): Follow up on that.
Carl Tydingco: I Yeah, I got a reminder for that. And then when that happens, we'll do it and then everything should be okay.
sweetman eth (sweets): I remember when we were I think recoup was on GoDaddy um
Carl Tydingco: Mhm.
sweetman eth (sweets): recoupable.com and they had given us we we needed to do this migration over to Verscell back in June and they gave us a date of September and I had marked September on my calendar and one day Sid checked again like a week later and he's like oh it's already good. So they gave us a date that was like months in advance and we ended up finding that it was ready earlier.
Carl Tydingco: Okay.
sweetman eth (sweets): I don't know if that's the case with Squarespace.
Carl Tydingco: Okay.
sweetman eth (sweets): Just sharing in case that that's helpful.
Carl Tydingco: Yep. I'll double check after the call and and see.


00:13:46

Carl Tydingco: Okay. Yeah.
sweetman eth (sweets): Um, docs. In that case, if I can't go into Verscell and do it, um, right now Doc is music- nerd music nerd-docs.cell.app. Uh, could you do docs.musicnerd.x
Carl Tydingco: Yes. Okay. So, XYZ. Okay.
sweetman eth (sweets): ornet or if you want
Carl Tydingco: Okay. I will take care of that.
sweetman eth (sweets): to invite me into Squarespace, then I could go in and do it myself.
Carl Tydingco: Yep. Um, you want to just put up an issue and assign it to me?
sweetman eth (sweets): Copy. I will do so.
Carl Tydingco: Yep. Yep. That'll that'll work. Okay. Got it.
Pete Rango: Sweet. Um, from what I remember yesterday with the loadin was we decided um that something like let let me remember exactly. it was we ended up at the bottom when I clicked but when it finished the wizard window popped up but it didn't take me to the section it was talking about.


00:14:48

Pete Rango: I think that was the main issue.
Carl Tydingco: Yeah.
Pete Rango: Um
Carl Tydingco: I I I think like high level it's the wizard should always be what whatever the wizard's calling out, it should be next to that section,
Pete Rango: Mhm.
Carl Tydingco: right?
Pete Rango: Yeah. Yeah.
Carl Tydingco: Yeah. I think that there was that and then um the other thing is yeah I think that was really it right.
Pete Rango: Yeah, it was that. And um I don't remember exactly how we solved this, but we had mentioned that whenever it started creating the profile on the about it says writing about and then on the right side it said it was doing something else, right? So I think it was kind of like just unifying that so they're not uh conflicting.
Carl Tydingco: Yes. Now I remember it's Yep.
sweetman eth (sweets): that was already fixed.
Pete Rango: Okay,
Carl Tydingco: Yep.
Pete Rango: cool.
sweetman eth (sweets): The the other one that we the other one there were two points.
Carl Tydingco: Yep.
sweetman eth (sweets): There was the scroll up for the wizard and then the other one was the lore.


00:15:43

sweetman eth (sweets): The lore showed placeholder and it showed the lore that already existed.
Carl Tydingco: Yes.
sweetman eth (sweets): We decided that we wanted to to hide the lore that already exists and just show the placeholder.
Pete Rango: Yep.
sweetman eth (sweets): so that I'll get both of those fixed. That way tomorrow when we test it, we're testing it with those fixes. And I realize uh this week I get to this point where I work on a feature for a while and I'm like, "Okay, why are we still dragging on this? Let's just approve it and keep moving on." But the artist page looking at versell analytics is the most visited site other than the homepage.
Carl Tydingco: Yep.
sweetman eth (sweets): It's worth getting this right. So I appreciate having a high standard. Even though I might sound like annoyed, it is good that we have a high a high bar of what is right here. So, I appreciate both of you continuing to give feedback on how we can make it as high quality as possible.


00:16:27

Carl Tydingco: I can find this. Yeah,
Pete Rango: Yeah.
Carl Tydingco: I I I think that's something that we we should all hold each other accountable to, right? It's like it's fine how I like to make how I like to build things is get functionality working and then iterate over the details, right? To to me that's the the functionality is one thing, right? You can you once you get it working, you can quickly determine whether it's the the the right feature. Everything else, right, is fine-tuning and and that that's the that's to me that's that's fit and finish. And that that's super important.
Pete Rango: Yep, that's it. Um, okay.
sweetman eth (sweets): That's all I got on my
Pete Rango: Dope. Dope. Um I I think I had mentioned this before, but I think we're getting to this point where we're about to be in the finish line with all the work that we've been on like the API, the chat, the onboarding and everything,
Carl Tydingco: Is that
Pete Rango: the dashboards to admin, the the documents, everything.


00:17:41

Pete Rango: So, um I had mentioned uh I think Thursday when we had our stand up with with that I I want to start probably moving a little bit more into like on boarding artists, doing the interviews, um all those things. Um at some point I also had that question in the chat uh in our discord from somebody who had said let me see where was it? they had asked earlier like what's the point of like you know using music nerd in like my release strategy I believe it was Graham um and it really just had me like
Carl Tydingco: Oh, that was Graham. Yeah.
Pete Rango: thinking about that in general instead to like okay like at what point does an artist do point people into music nerd um so not something that I'm prioritizing but I'm going to be thinking about like what is a way to incentivize people to go to a music nerd you know if I align with certain artists early on,
Carl Tydingco: Mhm.
Pete Rango: um maybe they're able to upload certain things on Music Nerd that you might not be able to find anywhere, right?


00:18:44

Carl Tydingco: Right.
Pete Rango: Um so I think in that interview strategy that I'm going to be implementing,
Carl Tydingco: Mhm.
Pete Rango: I'm going to be trying to work through that as well as like, hey, cool. You're telling us about an upcoming release or whatever. What's something cool that we can upload into Music Nerd um that might not be anywhere else? Um, but yeah, it just had me thinking in general of like what what could be part of the release strategy for somebody using Music Nerd. Um, not a priority, but something I'm just going to be thinking about. Um,
Carl Tydingco: Yep.
Pete Rango: so a lot of like my work, I think, in the next few weeks is going to kind of be moving a little bit more into like doing this kind of stuff of
Carl Tydingco: Yep.
Pete Rango: like networking, getting people to claim their profiles, doing the interviews,
Carl Tydingco: Yes.
Pete Rango: uh, and things like that.
Carl Tydingco: Yep. I I think that is super important, right? Because once once we've built something, we need to figure out is it something that people want, right?


00:19:40

Carl Tydingco: That's like the most important thing. And so, yes. So what you're doing now, what you will be doing is the next most important step is finding users, getting them into the funnel, getting them to use what we spent the past few weeks making, and then hearing what they say.
Pete Rango: Yep, that's the goal. Um, so yeah, I'll be my goal over this next week is to try to get as many of these PRs and issues closed that are at least on my side. So that way I feel comfortable starting to move on to the other ones. Um, while I'm doing that though, I'm I am gonna start figuring out um the workflow. Um I I think Sweet Man, you can you remind me one more time the platform you're using? It wasn't Riverside, it was something else.
sweetman eth (sweets): I use reream.
Pete Rango: Reream. So um if if it's okay with with you, Carl, I'm thinking about getting a Reream account for XDJs and then um using that
Carl Tydingco: Okay. Okay.
Pete Rango: as the interview platform and then using the skill that Sweet Man created to create those kinds
Carl Tydingco: Okay.
Pete Rango: of videos. Um,
Carl Tydingco: Sounds great. Yep. Yep.
sweetman eth (sweets): Riverside should also work work fine for you, you know, like I it's the tool that I use, but I think they all do kind of the same thing.
Pete Rango: I'm just going to do reream if you liking it. And also reream will allow me to stream if we end up heading that way too.
sweetman eth (sweets): It does. Yeah, they got the option to either record or stream.
Pete Rango: Yeah. Yeah. Cool. Cool. Um, yeah, that's all for me. Let me know if y'all have any anything else.
Carl Tydingco: All righty. Sounds great.
Pete Rango: Cool.
Carl Tydingco: Thanks everybody.
Pete Rango: All right. Have a good one,
Carl Tydingco: Have a good one.
sweetman eth (sweets): Have a great day.
Pete Rango: guys.
sweetman eth (sweets): Bye.


Transcription ended after 00:21:35

This editable transcript was computer generated and might contain errors. People can also change the text after it was created.
```
