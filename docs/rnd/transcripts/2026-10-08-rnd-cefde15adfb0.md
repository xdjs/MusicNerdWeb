# Music Nerd R&D — 2026-10-08

Meeting start: 2026-10-08T13:00:00-04:00 (America/New_York).

Source: https://docs.google.com/document/d/1WoeZfr_kDkuqsbi2hD8IH0-okXidAaxK8nr35-AbU2E/edit (original requires Google access).

Verbatim text from the Google-generated Transcript tab. Transcription errors may be present.

```text
Oct 8, 2026
Music Nerd R&D - Transcript
00:00:00

sweetman eth (sweets): Is that a Baltimore shirt that has a pocket sewn over the O?
Pete Rango: Yeah. So, um I have a production company with like one of my childhood best friends. Um it's called DeadSet FC and uh yeah,
sweetman eth (sweets): Okay.
Pete Rango: he made these shirts for the crew.
sweetman eth (sweets): So, is it supposed to just say Bolton?
Pete Rango: Yeah, it's just like a design choice.
sweetman eth (sweets): Interesting. Okay.
Pete Rango: Like you you would know what it says if you're like from Baltimore. You're like, "Oh,
sweetman eth (sweets): Yeah,
Pete Rango: yeah." Yeah.
sweetman eth (sweets): yeah, yeah, yeah, yeah. Easy to tell what it says.
Pete Rango: Yeah. Um Okay, cool. How are you feeling, man?
sweetman eth (sweets): Feeling good. Got uh the Insichu is all live. So, if we want to test that, we can test that right now. And terms and conditions is up in a PR. I've not checked it out,
Pete Rango: Okay.


00:00:50

sweetman eth (sweets): but I'm going to check it out during this call. Um, so I've got a lot to demo. I don't know if we want a demo now or if you want to talk about what's going on on your side.
Pete Rango: Um, yeah. So, um, I pretty much went through as much of the issues that I had up, closed everything up, did all the PRs. Um, had a few issues last night because, um, yeah, things were just like ahead. So, I was just trying to like make sure everything lined up. Um, and then it was funny. I was trying to create this this morning. I was trying to see if I could get it to create a demo that would walk us through all the changes that we made over the last week just to see if it would do it.
sweetman eth (sweets): Mhm.
Pete Rango: Um, and that was interesting. I mean, it did it well,
sweetman eth (sweets): Like a video.
Pete Rango: not a video. Most of like a web experience where we could just like click through and like have it run through everything that we did.


00:01:46

sweetman eth (sweets): Okay.
Pete Rango: Um, I can show that. it um it it ended up me going through like is this really what sweet did for the onboarding? I don't think so. And it definitely like was like no I kind of created my own onboarding. I was like all right like Yeah.
sweetman eth (sweets): a lot of hallucinations.
Pete Rango: Yeah. So I was like all right let me like leave that alone. And then as I was doing that I then just started playing with like the profile uh creation. Um but that's just like me messing around locally and I didn't want to push this because I know you're kind of in the middle of working that. So, I didn't want to like mess it up. Um,
sweetman eth (sweets): ever once messed me up. There's there's yet to be a time when you've done something that has impeded my workflow at all.
Pete Rango: okay. Good, good, good. Um, yeah, if you want to start off, um, go for it.


00:02:32

Pete Rango: I'm going to see if I pull up the agenda. Uh, let me see.
sweetman eth (sweets): Okay, this is I know you had created the issue for terms of service and privacy policy and I think the first step was to get your approval and I was just like ah he I'm just going to write the code and he can approve the terms and service once they're up they're not linked anywhere. Um,
Pete Rango: Okay.
sweetman eth (sweets): so we've got terms of service at forward slash terms. Sections include the main top section, your account, what you contribute, artist profiles and claims, information on music nerd, the API, acceptable use, no warranty changes, and contact.
Pete Rango: Okay, cool.
sweetman eth (sweets): Any call?
Pete Rango: I think the contact we would just want to change for now. Um, uh, I would leave the devxdjs.com email for now.
sweetman eth (sweets): So, the contact name's changed to devs xdjs.
Pete Rango: No, I think it's just dev without the s.
sweetman eth (sweets): devxdjs.com.
Pete Rango: Yeah. Yeah, let's just do that for now.


00:03:46

sweetman eth (sweets): Okay. Uh, anything else here on the terms so far?
Pete Rango: Uh, no, I think it looks good. Can you Yeah, scroll up here real quick.
sweetman eth (sweets): Let me just send you the link.
Pete Rango: Um,
sweetman eth (sweets): It'll probably be easier if you can
Pete Rango: yeah, let's do that.
sweetman eth (sweets): send. There's the link.
Pete Rango: Okay, cool. I'm opening up.
sweetman eth (sweets): If you wanna if you could share screen I can take better notes while you if you're like hey change this Thank you.
Pete Rango: Cool.
sweetman eth (sweets): Thank you.
Pete Rango: Yeah, I mean overall this seems good.
sweetman eth (sweets): Is it okay while while you're doing this I'll reset a profile? Um, can I reset Pete Rango on production so you can see the NC2 loading?
Pete Rango: Yeah. Yeah.
sweetman eth (sweets): Cool. Get that started. If you have no notes on this page,
Pete Rango: He's
sweetman eth (sweets): if you scroll up to the top, there should be a link to the privacy policy.


00:05:32

Pete Rango: there. Scroll to the top. Okay, I see it.
sweetman eth (sweets): Same thing here, right? Uh, the contact here should also be changed from hello music nerd to devxDjs.
Pete Rango: Yeah.
sweetman eth (sweets): Copy
Pete Rango: Is this correct here? for for AI model providers cuz it
sweetman eth (sweets): Yeah.
Pete Rango: blotch.
sweetman eth (sweets): Who's pro? So is a bullet point in who processes our data. AI model providers, Tavali, Spotify, Apify. We're we're sending them requests. We're sending them API requests. So they will get anything we pass in the form of input pars.
Pete Rango: Sorry, I I guess I read it as these are the AI models provide us service. So I might Yeah, I just wasn't used to reading it like that.
sweetman eth (sweets): The five the five points up top are more explicit. It's like these are the five and then the last point is just like here's everything else. Just kind of a catchall so that if someone finds that music nerd data goes to those sites, we're not liable for it.


00:07:12

Pete Rango: Okay. Okay. Yeah. Cool. Your choices as well. Um,
sweetman eth (sweets): Which one was a weird choice? Oh. Oh, the the email.
Pete Rango: so yeah,
sweetman eth (sweets): Yeah.
Pete Rango: just email here and here. Um, but yeah, other than that, looks good. Um, let me just go back to I had one thing I wanted to check. What was the license thing? Where was that at? Here we go. Yeah. Okay, cool. This looks good.
sweetman eth (sweets): Okay, Pete Rango should be reset on prod. Would you mind going to prod your artist page and let's see if the how the insitu loading looks to you?
Pete Rango: Columbbo added to the repo. Let's go.
sweetman eth (sweets): So there's your insitu loading. You see the loading status up top. The about is being written. So you've got a skeleton there. Links is going in right now.


00:08:25

sweetman eth (sweets): So if you scroll down to links, you'll see that coming in. There's the links that it found. All the ones with the pink highlight are the brand new ones that it was able to add. Now as now it's done. And I think it's on to lore and lore might have just finished.
Pete Rango: Yeah.
sweetman eth (sweets): Looks like it might not have found anything new for lore. And then the about is what it's on right now.
Pete Rango: Okay, cool.
sweetman eth (sweets): And then once it finishes, it then drops you into the normal onboarding flow.
Pete Rango: Okay, cool. I'm going to skip this for now. Um, this looks good. Um, I think this is the only thing that showed up that's kind of weird.
sweetman eth (sweets): the I think this is the first time I'm seeing those things. Is this uh new to you too? Is something you've never seen before?
Pete Rango: Yeah. I mean, I wonder if this might have gotten pushed when I was trying to get it to whenever I find Bport links or Apple Music links to like include it in the link section.


00:09:24

Pete Rango: Um, that might have been my bad. Um, so I'll fix this. Let me see. Yeah. Okay. I'll fix that. Um, no, this looks good. I think the only thing when I was running this was thinking this was like the prototype that I was working on earlier this morning. So, um I know that we said that like moving as things are generated feels a little jarring sometimes.
sweetman eth (sweets): Mhm.
Pete Rango: I was wondering if if there's a way to do it so that if they wanted to follow, they could follow, you know,
sweetman eth (sweets): Yes.
Pete Rango: um or or have a way so that like it just it slowly cuz like do you get what I'm saying? it starts then like you're seeing this generate but you don't really like you you know it's progressing but you don't know to like scroll down to see it.
sweetman eth (sweets): Right.
Pete Rango: So even if it was like cool, it it found the links then like it moves you slowly to here because I feel like the rest of it is like cool lore and whatever, you know?


00:10:37

Pete Rango: So like if anything, you know, each one of these highlights, I don't know. I just feel like there's there's something to like be able to show them that that things are evolving. Um I I can take a stab at it.
sweetman eth (sweets): Mhm.
Pete Rango: Um because this is more of like Yeah.
sweetman eth (sweets): My first thought is page land on on page land it auto does the it starts the research and without you needing to do anything. So default behavior I think have it scroll. So if you keep your hands off the keyboard, it is scrolling and it's following along with the research. If you manually scroll, you're breaking away from the audio guidance and then you get to do whatever you want on the page and we don't reforce you to go anywhere. That way if you just refresh the page and you're like, "Okay, I don't know what's going on here." We are automatically moving you around the page and if you do decide to you're like, "I want to do my own thing. I'll break away." Um then we stop the autofollow.


00:11:28

sweetman eth (sweets): What do you think of that UX?
Pete Rango: Yeah, that's perfect.
sweetman eth (sweets): Okay, I'll add that then. Um, so in situ is more or less done. I'm doing this little feedback that you've got. I think I'm going to remove that top part of your page is ready. Um, mostly because see what we found just scrolls you down to the about section kind of hardcoded and I'm just like uh
Pete Rango: that that and it it should just kind of automatically start the wizard once it's done and it just runs you through each section,
sweetman eth (sweets): Yeah.
Pete Rango: you know.
sweetman eth (sweets): Yeah. So, I'll do the the auto scroll follow like you were saying and then I'll also remove this top your page is ready section.
Pete Rango: Cool. Let me uh take note of this.
sweetman eth (sweets): So, I've got terms and privacy up in a PR. Just got your kind of verbal approvement approval on that. So, I'll review the code.


00:12:42

sweetman eth (sweets): Um, but then I'll get that shipped. I know you have not done the footer yet. If you want, I can take over the footer. If not, um, the pages are forward/privacy and slash terms and so and your agent can find it to link it in the footer. Do you have a preference on you shipping that versus me shipping that the footer?
Pete Rango: Um, if you want to do the footer, I'll go and do the about.
sweetman eth (sweets): Perfect. I'll get the footer then.
Pete Rango: Yo, give me one second. Somebody's knocking crazy on my door. One second.
sweetman eth (sweets): Take your time.
Pete Rango: That was a lot. All right. Um,
sweetman eth (sweets): taking pictures or what?
Pete Rango: no. No. This guy just wants to cut the grass.
sweetman eth (sweets): Ah, urgent matters. Okay. So,
Pete Rango: Yeah.
sweetman eth (sweets): I'll take the spirit. You take the about page. Insitu.


00:14:02

sweetman eth (sweets): Did you have any other feedback other than those two points of be your pages ready up top and then the auto scroll to follow the research. Anything else on because once I finish up in situ I'm going to move on to API endpoint migration. So I want to make sure this has a bow and you're happy with the updates. When we started we had a popup with three little text lines that highlighted. Now we've got new items showing up with skeletons. Took me a couple of
Pete Rango: Yeah, you're good, bro. This looks great.
sweetman eth (sweets): Okay, cool. So, that's everything for me.
Pete Rango: All
sweetman eth (sweets): Wrapping up in situ doing a little side quest of terms, service, privacy, policy in the footer, and then moving on to the API endpoints, getting those migrated so that our third party clients like uh Sleaveenote use the new API and we can get those out of the web codebase once and for all.
Pete Rango: right. Awesome.


00:14:56

Pete Rango: Um, let me see one thing. Okay, cool. So, for me, what I got done, Tik Tok X and Instagram context is now landing. Um, all of that is being stored in the database through the API. Now, um, answers are linked to original sources in the chat. Um, there's also like a clear notice now that it'll pop up when research goes outside of lore. So, if somebody asks a question that's not in the lore, it can't find, it's going to do a tavly call and try to find the answer. And if it can't find the answer, then it'll say it can't. Um, the other thing that I started working on, let's see if I can share. One second. Let me go to my profile. See if it landed. Yep. Okay. So, this is the other thing I've reworked. So, lore section now has these three sections. Lore, questions, and bios. Right? My thinking behind this was okay, we'll leave the regular lore section, which is where you can add lore.


00:16:16

Pete Rango: and you can see any lore that has been found or approved. Um, the other thing was questions. So, basically what I wanted to do is have the interview questions in here stored so that if you wanted to edit the response, you could edit them. And then the other thing was if somebody goes and asks a question uh in here and there wasn't context that it would log that question in there as something that you could give more context to.
sweetman eth (sweets): Okay.
Pete Rango: Right.
sweetman eth (sweets): Yeah.
Pete Rango: Um so that is now live. And I also just went and added this saved bios. I'm kind of still on the fence as to how useful this could be. Um, my thinking originally was like your story evolves, things change, you might want to update this as things are changing. Um, you might like previous language and you wanted to save that, you know. So, I left it there for now. Um, we can decide later if it's useful or not. Um,


00:17:20

sweetman eth (sweets): Okay.
Pete Rango: but yeah, so all that stuff is now live. Um, what else? Um, let's do a test with like Latasha real quick. Oops, wrong Latasha.
sweetman eth (sweets): Me.
Pete Rango: Okay, so as we can see, there's something about the PPN uh E New York music visualizer. So, it talks about this visualizer. Cool. I mean, it it does say, you know, who did what, but just to test who created the PPNE NYC music visualizer. So it should reference the information.
sweetman eth (sweets): This is using uh Gemini Flash or Gemini Pro the default model.
Pete Rango: Yeah.
sweetman eth (sweets): Okay.
Pete Rango: Um, as you can see, it pulled the information. It also hyperl to people's profiles. So I can click that. It'll take me there.
sweetman eth (sweets): Okay.
Pete Rango: Um, and then also it provides the source and then it can you can read the passage as to where it pulled the information from.
sweetman eth (sweets): Ah, nice. Wow.
Pete Rango: Cool.


00:18:44

Pete Rango: Um, what else did I do? Um, any any thoughts or comments on anything so far?
sweetman eth (sweets): I like all the links. Uh, it seems very cohesive across the chat and what I see there. That's great.
Pete Rango: Okay, cool. Um, what I will be focusing on over this next week is it seems like we're at a good place with everything. Um, so I think now it's kind of moving more into user testing. Um, so I'll be scheduling calls with artists, running them through claiming their profiles, collecting information as to like what they like, what they don't like, anything like that. Um, I know this hasn't been priority, but you know, figuring out how if another artist from in process lands on here, if it can find their in process link, which I think it's an issue we have somewhere open. Um,
sweetman eth (sweets): Yeah.
Pete Rango: not not a super priority, just just mentioning it. Um, so I'll do that. I'll also be testing the new interview flow that I've created um for lat using Latasha and Sound of Fractures.


00:19:55

Pete Rango: Um, I don't need them to be a part of it. I'm just going to like test out to see what are the questions that it's pulling for those artists. Um, and then I'm going to follow through creating the about page on the menu. Um, you are going to do the footer.
sweetman eth (sweets): Yep.
Pete Rango: Um and then um yeah, that's pretty much it. Um yeah,
sweetman eth (sweets): Awesome.
Pete Rango: feeling good. Um let's go ahead. Um if you don't have anything else, we can get into retros.
sweetman eth (sweets): I'm curious if you know why the data is so high on Burell. Um like compared to recoup's numbers, this site gets a lot of traffic. Have you checked out the the Verscell analytics?
Pete Rango: No. Um, not not anytime recently. Do you want to share?
sweetman eth (sweets): Do you mind?
Pete Rango: Oh, I can do it,
sweetman eth (sweets): I can share.
Pete Rango: too.
sweetman eth (sweets): Which do you prefer?
Pete Rango: You go for it.


00:20:55

Pete Rango: You go for it.
sweetman eth (sweets): Okay. Um, I mean on a low today's a low day and we're at seven. This week, five days ago we were at 103 unique visitors on the site.
Pete Rango: Huh?
sweetman eth (sweets): Like a lower day is 19, Monday was 55, Tuesday was 43,
Pete Rango: When was the peak?
sweetman eth (sweets): 23 on the peak was on Saturday the 3.
Pete Rango: The third.
sweetman eth (sweets): this past Saturday.
Pete Rango: Let's see.
sweetman eth (sweets): But like all these numbers look great to me. They look consistent. They they do drop, but they drop to like 19, which is phenomenal.
Pete Rango: Well, here here's what I will say is that prior to me coming in, there wasn't a lot of traffic on socials promoting Music Nerd in different ways. And it's not like we're doing super consistent stuff on social media, but we have been sharing more. and my community is starting to notice that I'm working more on Music Nerd. So,
sweetman eth (sweets): Mhm.


00:22:03

Pete Rango: there could be more curiosity. Um, I know also in general CY is having more conversations with people about Music Nerd and getting them to to rally. So, that that could be something that's happening. Um, I've also seen a lot more. I mean, we've grown the um the substack from it was when I first started it was like at 90 or something and that was not even that that substack was just like emails I put in from like their, you know, their past, you know, so it was kind of fresh. But almost every other day we get somebody that's been signing up to the substack also.
sweetman eth (sweets): Okay.
Pete Rango: So that that could also be something driving. Um, yeah. That's awesome.
sweetman eth (sweets): Yeah, I'm just pleasantly surprised. It's It does seem like Google, just like people search for it on Google, 44 visitors. So, it's not nothing close to the it's not even 10% comes from Google. Instagram, you're right, is 13. So, that's but that's less than 10%.


00:23:05

sweetman eth (sweets): Um,
Pete Rango: Yeah.
sweetman eth (sweets): and a lot of people are going to the artist page. And then claims, we've had we've had 10 people claim profiles over the past seven days.
Pete Rango: Yeah. There's there's definitely a lot of people that I've noticed trying to claim profiles of bigger artists.
sweetman eth (sweets): Oh, yeah.
Pete Rango: Yeah. Like if if you uh let me see if I'll go to the admin profile. Um like if you go to artist
sweetman eth (sweets): I'll stop sharing.
Pete Rango: claims. So this is Columbbo. So like let's see if Columbbo uh sent us a I mean I know that's him. I'm just going to double check if he sent us something.
sweetman eth (sweets): Wait.
Pete Rango: Let's see. Yep. He sent us something and that was 23 hours ago. So, I'm going to go ahead and approve. Um, but yeah, like Pesopluma, bro. Pez Puma is like a huge artist, you know, and I really have no way of knowing if this is them or not other than they have to send the reference code from their account.


00:24:04

sweetman eth (sweets): And they and they didn't.
Pete Rango: So this and they didn't Yeah.
sweetman eth (sweets): You don't have another deal. Okay.
Pete Rango: So you know one thing that we could do is that could be automated right like if it's detected on Instagram that we got that same code and it's coming directly from their Instagram then like we could automate that process.
sweetman eth (sweets): Right. Yeah, we we don't have the traffic right now to to justify it. Um just just curious, pleasantly surprised about the traffic uh on Music Nerd and I hope it continues.
Pete Rango: Yeah, for sure. Um, no, that's awesome. I had uh one artist that gave us this feedback. They said, I mean, they claimed their their profile. They loved it. They said it was sick. And then I asked them to give us some feedback and it said it was pretty straightforward. would love to have the whole process within the site so I don't have to bounce between different apps and sites to claim it, but it was still fairly easy.


00:25:02

Pete Rango: Um, I don't know how to get around that because we have to we have to verify, you know.
sweetman eth (sweets): Yo, what was their email? Do you know what that account's email was?
Pete Rango: Well, that's still it. We can't rely on email. Um, mainly because we have to know that it's that artist, right?
sweetman eth (sweets): Yeah.
Pete Rango: So, the only like even if they had an email that said pessoblum@gmail.com, we still can't know it's them.
sweetman eth (sweets): What if it's not a Gmail? What if it is an actual domain?
Pete Rango: Yes. I I just I think if we're optimizing mostly for underground artists right now, you know what I mean?
sweetman eth (sweets): Yeah.
Pete Rango: Like it's just like the the odds of them having a domain name with their bro most of artists don't Yeah.
sweetman eth (sweets): Yeah, understood. They don't know. No domain.
Pete Rango: Yeah.
sweetman eth (sweets): Okay.
Pete Rango: Um so
sweetman eth (sweets): Yeah. Not not not a big problem.


00:26:00

sweetman eth (sweets): If that's the biggest point right now is them jumping between apps, that's that's intended behavior.
Pete Rango: not a huge deal. Yeah, it's fine. It's just like for safety anyways. Um cool. Um, I think we could automate though somehow this process. Um, I could look into that. Like just trying to figure out how we could do that with Instagram. Um, I mean I could just have like a running task with my dot and then have it so like every day just checks claims and it just, you know, does some flow to check the information, but
sweetman eth (sweets): That'd probably be best for now. Keep it keep it as like a local thing and not not invest too much engineering time in it.
Pete Rango: yeah. Yeah. Yeah. I think I might just do like a recurrent task like that and have it access to the Instagram because I think I can log in the dot into the Instagram. Okay. Um, one is left. One thing that has evaded me that I have not really checked is that it feels like there's still like um some automated thing going on.


00:27:14

Pete Rango: Um as far as artists either being added or something. I mean, I guess I haven't really noticed it lately. Um let me see what this is. But you know, one thing to to to figure out is like this artist right here was added, right? Added to directory.
sweetman eth (sweets): What did
Pete Rango: If it was added to directory, we should just trigger a research flow. Right now, we're not we're not doing it until the profile is claimed. But I feel like it might be good enough to just trigger the research flow and then have it like at least find these links.
sweetman eth (sweets): Yeah. Yeah. Do do you want it to be a different research flow like only running the link step but not running the about and the lore or do you want it to run the full research from someone searching
Pete Rango: I have been very on the fence as to like about being gen AI generated. Um,
sweetman eth (sweets): without artist approval?
Pete Rango: yeah, you know, so like I think that could make sense where if somebody adds an artist, it could automatically just at least find their latest releases and their links or whatever.


00:28:30

Pete Rango: Um, and that could be fine for now.
sweetman eth (sweets): and then just keep luring about empty.
Pete Rango: Yeah. I mean, one thing that we could do is that if it does add that, it'll be empty on the background, but if when they go claim, it'll surface.
sweetman eth (sweets): because it'll run the full research flow.
Pete Rango: Yeah. In the back, you know.
sweetman eth (sweets): Yep.
Pete Rango: Do you have any strong opinions about this?
sweetman eth (sweets): My personal preference on all UX is the the more I can automate, the better. If I can fill in about and lore, I'd do it. However, I appreciate you taking more of the artist perspective of thinking, what does an artist actually want to autopop populate and not? I'm more on the tech side of like the best UX is no UX and everything just loads in automatically.
Pete Rango: I feel it. I feel it. Okay. Um I think let's make the the decision that if somebody adds an artist to the database, it'll run the research flow.


00:29:34

Pete Rango: It'll populate latest links. Um, but then it'll leave all the lore in the background so that whenever a artist claims, they can see all of that already.
sweetman eth (sweets): Perfect. Got it.
Pete Rango: Cool. Um, I'll I'll do that as an issue and I can do that pretty easy. Um, All right man um looking through all right let's go through our retros so
sweetman eth (sweets): Feeling
Pete Rango: previous commitments was the API web responsibilities which we have done we have split API and web uh and our flows are working well so that's been dope my anxieties what I
sweetman eth (sweets): okay for you? Your anxiety. What?
Pete Rango: said my anxieties of splitting it and then messing it up while you were doing this are gone because it was really Easy. So,
sweetman eth (sweets): Excellent.
Pete Rango: shout out to the agents and the skills that you created. Um, the drafts,
sweetman eth (sweets): Quick pause on the skills.
Pete Rango: what's up?
sweetman eth (sweets): I would uh quick pause on the skills.


00:30:40

sweetman eth (sweets): I've noticed well I I put the skills inside of the music nerd web repo. Um to I feel like I'm doing a lot of like architecture and I don't know if this is too much of me trying to do stuff. I was thinking of splitting skills out into its own repo so that it doesn't live in web just like API. That way they can live independently. And additionally, um, I was thinking about making a mono repo. So, a repo that just holds git modules to each of the others. So that way I just install a mono repo and any new dev that comes in just downloads the monor repo and then each of those links to it links to the webgget, it links to the API git, it links to the skills git and then your agent pulls it all. It knows how they all connect. we have read going across it and instead of needing to know, oh yeah, we were actively using this repo but not that one over there and this one.


00:31:29

sweetman eth (sweets): Um, those are the two repos I was thinking of doing. Do you have any push back on me doing those
Pete Rango: No, that sounds sick. Um, you have way more experience doing this, so like I think it sounds like it would streamline a lot. Um, and I like the idea of having the skills somewhere else. Uh, I even had somebody asking me about like the marketing skill. They're like, "Yo, how did you guys make this video?" was like, "Oh, it's one of our agents skills that that uh that sweet did." So then I just pointed them to the to the repo and to that one specific file, but like having all the skills in one repo would be sick.
sweetman eth (sweets): Thank you.
Pete Rango: Yeah. Yeah, for sure.
sweetman eth (sweets): Didn't mean to interrupt you.
Pete Rango: Um Oh, no.
sweetman eth (sweets): You were you were talking.
Pete Rango: You're good. You're good. You're good. Um so cool. API web done. Uh drafts PR, are you um good with that still?


00:32:20

sweetman eth (sweets): The skill is updated. So now anything my agent opens a PR, it's always in draft mode. So I don't know if Have you checked?
Pete Rango: Same same with mine.
sweetman eth (sweets): Have you noticed?
Pete Rango: Like it'll just stay in draft and then whenever I'm ready to like merge it, it switches it to merge and then I can squash and merge.
sweetman eth (sweets): So, you didn't need to add any extra commits. You just noticed that the workflow changed automatically.
Pete Rango: Yeah.
sweetman eth (sweets): Awesome.
Pete Rango: Yeah, that was sick. Um, informal brown bag sessions. We haven't done one yet. Um, so we'll see if we can try one out soon. Um, useful GitHub issues. isues. Uh, let me see. What's this? Yeah, that's what we just talked about. The drafts kind of cleared and I got rid of a bunch of issues and closed out a bunch of stuff. Um, there was one specific one. Let me see if I can pull it up.


00:33:15

Pete Rango: Uh, I have to dive into this, but this I I guess this goes into like what we just talked about to be honest. It was the source bios for unclaimed artists. So, I think that that answers that. Um, let me scroll through to see there was all these other end.
sweetman eth (sweets): Massive issue.
Pete Rango: Yeah, polish. I think this was fixed. Yeah, this is just like a cluster that happened between all these changes that we've been making. Build BIOS from clean. Okay, so this one is the one that we can like X Close the inventory. Finish admin public presentation. Yeah, this is like a big uh issue that I saw last night when I was reviewing everything and I was like, damn, what is this? started going through it and it had so much stuff. Um, so I'll take a look at this and um I'll close out whatever I can. Uh, it seems like there was a bunch of stuff that I closed off. Um, but there's still a bunch of that I'm like, "Bro, what is this?" Yeah.


00:35:13

sweetman eth (sweets): Yeah, it's really big.
Pete Rango: Yeah. Again, this is probably like from all the work that we've been doing over the last week or two, and it was just like creating it as we go. Um, okay, cool. Um, I'll take care of reviewing that and closing that out. Um, okay. So, let's do uh our keep fix try. You want to go
sweetman eth (sweets): keep uh keep giving me high quality feedback. the video. that went out this week seems to be liked by the artists in the community. We got comments, we got likes. It felt very organic the engagement. I'll be posting another video today. Um, keep keep telling me if the content's s*** or it feels like Uncanny Valley or I'm using AI in a way that doesn't feel authentic. That was I come from the tech side, so I appreciate your your artistic background. um fix I'd like the domains in uh in versel.


00:36:28

sweetman eth (sweets): It'll give us easier capability to ma manage it whenever like I I can't add docs.mmusicnerd.net. I need Carl to do that and I don't want to bug Carl. So it would just be better if the domains lived inside of ourselves so that you and I can manage them and spin up subdomains without needing to take Carl's time. Um, keep fix try.
Pete Rango: Cool.
sweetman eth (sweets): Feel like we're trying every single thing that I've spit out so far. I'm I'm I'm h I don't know that there's anything I want to say on try this week. You
Pete Rango: Yeah. Um I say let's keep it going, man. It's been great working with you to be honest. Um the um one comment on the uh the domains. I think the idea is that once it once it expires on Squarespace, we're going to move it elsewhere. Um, so maybe that's kind of what we're also waiting on. But, um, I'll make sure we'll make sure we touch base with Carl about that uh, tomorrow.


00:37:36

Pete Rango: Um, because yeah, that would make sense. I've been having a blast using Cloudflare for my stuff and just creating subdomains for all the stuff I do now. It's so easy. Um, okay, cool. And then um for one comment also on uh the the videos. So I this is maybe like more of like a side question for you and recoupable because I think there was a shift on recoupable where you were and then where you're going right now. And this is nothing to do with music, but I'm just more curious as to like where your head headspace is at since like, you know, you stopped working with with Sydney, where you're at now. At some point there was also seems like there was a push to push artists about creating videos on the platform where from from somebody who saw recoup where it was and then it moved into a space of like more like analytics in some ways uh and and and data to like now like pushing video creation like can can you just tell me a little bit of like your thought process through all that?


00:38:48

sweetman eth (sweets): clarify. I still work with recoup the the the shift.
Pete Rango: Well, I I know I know you do.
sweetman eth (sweets): Okay.
Pete Rango: I think it was just like with Sydney you're not working necessarily with or he pulled funding.
sweetman eth (sweets): It's the contract went down before he was at the from the start of this year till June. He was paying me seven just about $8,000 a month. And then in June, we went back to the contract I had last year, which is a little over $3,000 a month. So, my contract was cut in half. So, I then filled in that time with with Music Nerd. Um the the shift we are going through right now is we do still have the platform Our main focus is on uh music rights holders, small mediumsiz catalog owners. So, and they uh we've got two of those. We've got Rostrom who pay Rostrom Records pays us $2,000 a month and then Seeker is our Secret Music is our main uh label and they pay us $10,000 a month.


00:39:48

sweetman eth (sweets): Um, so those two companies pay us and that's how we focus the site now is if you go to music, if you go to recoup.recoupable.dev, um, it's very much focused on we build your tech and we build the whole stack and we're focused more on getting people getting music rights holders to pay us $2 to $10,000 a month to build out their custom tech. They own it in their own GitHub repo. Uh, it's built for their custom workflows. They can tell their board that they own it and they're not renting it from us. they can have they get their own superb basease. We build their backend. We build all their workflows. So mostly targeting teams that don't already have a dev team. Um and so where the videos uh are focused, the last thing I was building on the platform side was music video generation. Um the platform's still there. People still use it. You you go to app.recoupable.dev to go to that platform.


00:40:41

sweetman eth (sweets): It's been updated with the new branding. But if you were on recoupable.dev, You can notice it's kind of harder to get to the platform. It's not our main focus right now. We're keeping it there as like the free offering and I think we have a subscription tier for people that want higher limits, but our main focus is on white really white glove like being the tech team um doing that work. And so where my focus is on making videos for recoup is we have decided on the funnel of podcasts and then from podcasts into a quote and then from in that quote being hey based off the podcast these are the things that it seems like your label your team could use on the tech side. We build up trust during the podcast. We give them free content. We give them free discoverability on all of our channels. um we show them the quality content that we can make. So those are the interviews that have been going out.


00:41:38

sweetman eth (sweets): I'm trying to do one episode a week. I did Vicky Nommen this week. Vicky Nommen. Um so I did the full episode that went out on Monday on Spotify, Apple Music, YouTube. Uh and then every day there's a little clip that goes out and I've already got uh three others that have been recorded. So, that one will go next week and then the next week of and then I think I I'm trying and record two episodes a week. So, I've got uh Exa that goes out and finds people that are part of small and medium-sized cataloges and Exa gives me their email and their LinkedIn profile and then I send 10 cold outreaches a day saying, "Hey, we think we'd love to talk have you on our podcast talking about X," which is the research that Claude found that is like their domain specialty. And then that's my new top of funnel for finding clients. Um, does that answer your question on kind of where we're building and how I'm doing videos with recoup?


00:42:31

Pete Rango: Yeah, a a little bit. I think where I think my disconnect was at some point was that it seemed like making music videos is now a feature in Recupable. You know what I'm saying? So,
sweetman eth (sweets): Yeah.
Pete Rango: like I think um what what I'll do too is like I'll just go back to Recupable um to look more through like what has been the evolution through the content because I might have probably like just missed stuff and most of the things that I
sweetman eth (sweets): Is are you interested because you want to make videos using the recoup stack or what?
Pete Rango: No, no, to be honest is mostly I was trying to I think you telling me the way that you just told me about where Recubable is going and where you are makes more sense than some of the things I had seen whether it's on X or Instagram at some point. And I think it was like more that I started seeing a lot of videos of like here's a here's a music video or here's a music video that an artist made and all stuff when I feel like a lot of what you're catering to now are like labels and how to how to build stacks for them and stuff like that.


00:43:33

Pete Rango: You know what I mean? So I was just trying to understand where in the plan that was
sweetman eth (sweets): That was the last transition. During that time, I was shipping features for the platform and then Sid came back and gave me this like we need to be building, we need to pivot and build for customers that can pay us thousands of dollars. And so that was the last feature I was building before I went heads down on um where we're going now. So it is a feature. If you're interested in doing it, I recommend doing it on your own and not necessarily going through the the platform. I think you you're you especially have your own agent and you can get a lot more done with your own agent than going through the recoup platform.
Pete Rango: Yeah, cool. Cool. No, thanks for the clarity. Um, all right. And then try one change that we should test next week. I think for me, we're we're getting to this good place where things are are feeling good.


00:44:37

Pete Rango: So, I think I'm moving I'm going to try to now move into as I close out this next week on these issues. I'm trying to get these issues just closed up with everything. Um so that I can now focus more on interviewing uh and um and uh on boarding of artists to the platform. Um, also had a conversation with Amaya from Turntable FYI and uh, she is starting to get CI vision of like incorporating different things cuz she was telling me that they use Brave Search and some other and M music brains and discogg and stuff for what they're doing. Um, I haven't been able still to log in to turntable. So, so I'm waiting on on them to like let me in uh to check it out to see what they're doing because like I'm curious as to what it is that they're using that stack because they could just use our stack and plug us in and see how it makes sense. So, um, at some point we'll we'll be scheduling a call with Amaya's team and her dev team.


00:45:48

Pete Rango: um if you're available, I'll just invite you to that so that we can just figure out um if there's synergy or like how to plug in or if we need to create a new API for them or something. Um but yeah, that that'll be coming soon. And um yeah, I think you have inspired me to try to do this kind of like podcast type vibe. Um, so I think you know earlier this year I had um done this like very short Instagram live uh video live feed where I would bring artists on and just let them it's it was like a free artist development um consultation but live. Um and through that process it was cool because the artist got to ask me questions. I got to give them um value back live because I feel like I'm much better at doing that than like sitting in front of a camera and like telling you about the things. Um, so I wanted to bring that back in some capacity and like now as I heard you talk about what you're doing with recoup, I'm like, okay, maybe there's something that we can do in this capacity with Music Nerd where we invite artists in some sort of cadence to hop on uh Riverside, have a conversation with them, uh, and then have them claim their profile or something, you know?


00:47:04

sweetman eth (sweets): I think that's a great idea because then it gets more content on our page which drives more traffic to the site. It so far the goal I've been hearing from CY and Carl is get more people to claim a profile. So, if we invite artists on, artists like seeing other artists, your idea sounds great. And that mixes in well with the content I'm doing of the products that I'm shipping on my side. So, mine's more like here's a feature. And then your idea is more like here's a human artist and how they actually use the tools and how it fits into what they're doing.
Pete Rango: Yeah. Yeah. And it would be cool as we're having these convos with them, they get to promote themselves or whatever they got coming up and they get to ask us questions or suggest features or whatever and then we can implement the the the um the feature change if if we so choose to and then promote that together in some way. Um so yeah.


00:47:54

sweetman eth (sweets): and you can probably get more yeses. I'm sure more artists for you saying like, "Hey, do you time to try out this product is going to be different from hey do you have time to go live on my channel like one you're offering them distribution the other you're trying to ask for their time to like try the product so I'm sure you'll get more yeses and you can probably reach higher for people that might not have had time before someone and now you can probably reach bigger people with if you're offering discoverability and free content
Pete Rango: Yep. Yep. I'm going to do that. Um, are you pretty happy with Riverside?
sweetman eth (sweets): I've never used Riverside I use I use reream.
Pete Rango: Oh, that's what it was. I don't know why I thought it was Riverside, but yeah. Reream's cool.
sweetman eth (sweets): I love it. It works really well with Opus. Um, have you seen the the videos I've put out on YouTube?
Pete Rango: Uh, I don't know if I've seen the full YouTube ones, just the clips.


00:48:46

sweetman eth (sweets): Let me I'm I'm feeling really proud about it. Um,
Pete Rango: Yeah, let's see it.
sweetman eth (sweets): let me send you the video and just like skip through the first little bit. There's the video. I just sent it in the thread. That's the first full one.
Pete Rango: Okay.
sweetman eth (sweets): Just kind of like jump through to see the vibe.
Pete Rango: Yeah. Yeah. I'm going to share my screen.
sweetman eth (sweets): Okay.
Pete Rango's Presentation: really taken music into the back.
Pete Rango: I'm going to go uh to the front.
Pete Rango's Presentation: It was four years of waste, complete wasted efforts because you cannot stop technology. You can help shape it, but in order to help shape it, you have to engage. Today I'm chatting with Vicky Nommen, the founder and CEO of Crosser Works. They offer advisory and consulting services to help navigate the complex digital music landscape.
Pete Rango: is um what's going on here in the share screen? Are you creating these and then sharing your Green.


00:49:54

sweetman eth (sweets): that that this is what I wanted to share is um what I do in our reream. It's just me and her. So all that it is is our photos. You don't see any of the t stuff up top, none of the stuff down bottom. It's a very basic reream screen. At the end of the reream, I download both of the videos individually. So, her video and my video get downloaded individually. And both of our audios get downloaded individually. And then I tell, okay, opus, all of the videos and the audios in my downloads folder. I want you to produce it. Um, and then it adds all this other stuff in. So, the chapter title in the top right, the logos in the top left, the little like these dropin medias that you see that take it up, moving it out to the side like Bloomberg style. I It was like, which which format do you prefer? Do you prefer like a diary of a CEO having like two people at a table or do you prefer like a Bloomberg?


00:50:39

sweetman eth (sweets): And I was like, I want it like a Bloomberg. I want it to feel like the news. I want us to feel professional. I want it to throw in content up on the main screen. And so it Opus does all of this. Um Opus does all of it. Um like Yeah. And I I love these little two things. It's just it's much more engaging than I I found any of the other music podcasts being out there right now and it doesn't take me a lot of
Pete Rango: No, this looks good. Um I think the uh two pieces of feedback I had um one is not about this one was about um I the most recent video that I saw on Instagram and your your sounds. Uh, I think I'm just like a sound design w****, bro. So, like, so it's good. I think what was happening mostly is that the mixing of them, like levels wise, I think could just use like a hair more care.


00:51:32

Pete Rango: So, like there's one um I'll see if I can pull it up and send it to you, but there's like a a white noise sound that like comes up when it's swiping or something. I can't remember what it was, but it was like super loud and jarring. So like I'm watching this in the middle of the night like scrolling and then I get to yours I'm like oh a sweet man video and then all of a sudden I was like yo. So so I would just say you know next time because I'm I'm sure it's opus or something creating the sounds and like just adding them to them. So I would just try to have a one pass on focused mixing on the sounds so that the sounds aren't like so jarring
sweetman eth (sweets): Mhm.
Pete Rango: sometimes. But Um,
sweetman eth (sweets): You're talking about on the music nerd video.
Pete Rango: it might have been Music Nerd video. Yeah, let me like pull it up. I think it might have been that. Let me see.


00:52:22

Pete Rango: Uh, it was definitely one of the videos from you. Let me see. Uh, let me pull up. Sweet. Music nerd is already writing your lore for your real links.
sweetman eth (sweets): that one. Okay, I heard it. Cool. So, you you recommend kind of decreasing those those audios.
Pete Rango: Yeah, like basically like sound effects just like lower them. Anything that's like white noise especially. So like the thing is if if I was doing sound design on this, I would have cut like the low end of that uh of that white noise, right? And then from there decide if I need to turn it up or down because what happens with white noise is white noise has the whole frequency spectrum. So like when you're using it for this type of stuff, you kind of want to get rid of a lot of the low end. And then you also want to decrease it because like white noise especially is one of those sounds that like is loud already at a very low volume, right?


00:53:22

Pete Rango: Like with the Fletcher munch uh munching uh curve. So like it's one of those things where like you really have to be mindful with at least white noise. Um that was like the one thing. And then on this specific video, one second.
Pete Rango's Presentation: Today I'm chatting with Vicky Nommen the It was four years on which side of the Today I'm chatting with Vic Today I'm chatting with Vicky Nommen the founder and CEO of crossber works they offer
Pete Rango: Wasn't there sound somewhere or like music?
Pete Rango's Presentation: advisory it was four years of waste complete wasted efforts because you
sweetman eth (sweets): Yeah. Yeah. Yeah. Right. But right before
Pete Rango's Presentation: cannot stop technology you can help shape it but in order to help shape it you have to engage
sweetman eth (sweets): Yes.
Pete Rango: I would just fix the fade.
Pete Rango's Presentation: today. I'm
Pete Rango: The fade is Yeah.
sweetman eth (sweets): Fix the
Pete Rango: Then yo, sweet. Take this with a grain of salt.


00:54:12

Pete Rango: I'm just like being like the picky music artist, sound design guy.
sweetman eth (sweets): I need this. You're transcribing this. So, I I'm going to ask Claude like, "Hey, find the Pete notes from from the call today and like update my skill to do it." This This is something I couldn't be paying for, so please keep it coming. So, you're saying on the fade in it like starts too loud and it should be a more gradual fade in.
Pete Rango's Presentation: order to help shape it,
Pete Rango: Yeah. Yeah.
Pete Rango's Presentation: you have to engage.
Pete Rango: Here. Let me let me hear. The way they came in was fine. It's mostly how it fades out.
sweetman eth (sweets): Fades out too fast.
Pete Rango: Yeah. Yeah.
Pete Rango's Presentation: Today I'm chatting with
Pete Rango: It should be a little bit The slope should be a little bit more uh longer.
sweetman eth (sweets): Okay.
Pete Rango: Yeah.
sweetman eth (sweets): Yeah, I couldn't pay for this feedback. Thank you.
Pete Rango: Yeah, of course, man. No, just appreciate you. I learned so much from you, too. So, I' I'd love to like return the favor.
sweetman eth (sweets): Thank you.
Pete Rango: All right, man. Well, um I think that's all for today. We have no uh CM AMA, so we'll wrap up here. Uh I appreciate you so much. Um, one thing that would be cool as like a last thing is if you are going to create this skills um, uh, repo is to add that repo for the podcast because I'll be I'll be definitely starting the music nerd podcast here soon.
sweetman eth (sweets): We'll do that.
Pete Rango: Appreciate you, man.
sweetman eth (sweets): Have a great day, Pete.
Pete Rango: You, too,
sweetman eth (sweets): Bye.
Pete Rango: bro. Take care.


Transcription ended after 00:55:36

This editable transcript was computer generated and might contain errors. People can also change the text after it was created.
```
