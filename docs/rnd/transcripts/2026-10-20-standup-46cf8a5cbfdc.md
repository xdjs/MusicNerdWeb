# Music Nerd Stand Up — 2026-10-20

Meeting start: 2026-10-20T11:00:00-04:00 (America/New_York).

Source: https://docs.google.com/document/d/16HZ0fCgoQVVojDZCxv4NBy7uC1ZdBJ1hJslGShxaVU4/edit (original requires Google access).

Verbatim text from the Google-generated Transcript tab. Transcription errors may be present.

```text
Oct 20, 2026
Music Nerd Stand Up - Transcript
00:00:02

Pete Rango: All right. How are we feeling? How are you, sweet?
sweetman eth (sweets): Good. And got the popup deleted.
Carl Tydingco: See?
sweetman eth (sweets): Research is now running as a Versell workflow. So it's totally decoupled from the front end. It's our first thing running as a durable workflow in Versell workflow. Um, we can show it actually and it would be good to show it. Peter, are you able to drive screen so that my computer doesn't just shut down from doing normal screen sharing?
Pete Rango: Yeah. Yeah. Where do you need me to go?
sweetman eth (sweets): Um, I'm going to tell uh we we'll be going to two places. We'll go to Verscell and we will go to um your artist profile. I'm going to work on deleting your profile right now.
Pete Rango: Okay. Sig. Yeah. How do you uh did you implement that already where it's like an easy way to delete a profile?


00:01:03

sweetman eth (sweets): Uh that is something that's my first priority for today. That way we're not Right now I'm going to use Superbase MCP to manually delete it, which is the red flag Carl flagged on Thursday. Um now that I've got this up, I'll be doing that ancillary API.
Pete Rango: Okay.
sweetman eth (sweets): Please delete Pete's artist profile so he can test load the MN dev skill.
Carl Tydingco: Oh my gosh. The leading Pete.
Pete Rango: Let's go.
sweetman eth (sweets): Deleting Pete manually through the Superbase MCP.
Carl Tydingco: Goodbye, Pete.
sweetman eth (sweets): Yeah,
Pete Rango: Bye-bye.
sweetman eth (sweets): my agent asked me how we want to do off for that endpoint because we'll have it publicly documented. Do we just want it to be admins only? And I said it should be the claimant or any admin. That way the claimment number of profile if for some reason they decide they want to wipe their profile they they can and then admins obviously okay I believe it should be in the API codebase can you select API there and then select uh let's scroll down on the left


00:02:05

Carl Tydingco: What did you do?
sweetman eth (sweets): side and find workflows
Pete Rango: visitors. That's probably our agent's going crazy. All right, let's go.
sweetman eth (sweets): this this is just a demo data it's not real on the
Pete Rango: Oh, okay. You said to go where? All right.
sweetman eth (sweets): left sidebar scroll down to workflows. So these workflows are any these are the workflows that um are run and we can get obser observability in them. Let's for just to check change last 12 hours to last 24. Let's see if we see anything on prod.
Carl Tydingco: Okay.
sweetman eth (sweets): So these are clean build workflows and then we can click in any of these workflows and see the details.
Carl Tydingco: Excellent.
sweetman eth (sweets): It looks like on average they run less than 30 seconds. And then inside of here, each of these is a step. So with workflows, what you get is you have steps. If an error happens, you can retry a step and it'll go back to the previous step in the workflow, preserving the state, and then rerun it.


00:03:05

sweetman eth (sweets): So that's one of the benefits of having a durable versell workflow. You label a function call as a step. That way, if for some reason it fails, it goes back to the previous checkpoint and then it reruns the rest of the workflow from those steps forward.
Carl Tydingco: And where do we define the workflows? Is it in code or is it in this some UI somewhere?
sweetman eth (sweets): It's in code. So we have wrapped our next config with with workflow.
Carl Tydingco: Mhm.
sweetman eth (sweets): the entire next app. now has and it's only our API codebase that this applies to. We only need it in backend API workflows. The entire next config is wrapped with the width workflow and then on each step that you want um you then define use step at the top of that function. And so here on the left side all these little green HTML tags you see read claim build step build claim profiles build claim sources build claim about.
Carl Tydingco: Mhm.


00:03:54

sweetman eth (sweets): Each of those are functions in our codebase where at the top of the file I've defined use step. If we decide we want more granularity on other functions, all that we need to do is add in text quotes use step and that tells because we again we wrap the entire app in workflow that tells the this is a step whenever it gets run in a workflow. So you define a workflow which is the um the claim build workflow you start a workflow and then inside of workflow there's steps. So two places in our code we need to define whenever we want a new workflow. One start the workflow and then each step within that workflow um define the step. Let me make
Carl Tydingco: Do we have a skill that will build workflows?
sweetman eth (sweets): versel has workflow skills.
Carl Tydingco: Okay.
sweetman eth (sweets): We could inside of our mm dev skill link to it. That would be the best thing I'd recommend is is hey inside of the mm dev skill use this.


00:04:42

Carl Tydingco: Okay.
sweetman eth (sweets): Pete, you've been reset.
Carl Tydingco: Okay.
sweetman eth (sweets): If you would like we can go back to your profile and uh and test unless you had more questions or
Pete Rango: Okay.
Carl Tydingco: No.
sweetman eth (sweets): comments.
Carl Tydingco: No. Let's go. Thank you.
sweetman eth (sweets): I'm getting into fully wiping. So, same thing.
Pete Rango: Sick.
sweetman eth (sweets): Now, it's not attached to your profile or your your session. So, if you refresh, if you leave the page, if you lose your internet connection, this this is running on Versell workflow, not attached to your client. So, it's much more and durable.
Carl Tydingco: Sweet.
sweetman eth (sweets): Um, so this is the same. Nothing's changed here. Also, if you then go back to Verscell workflow, you'll see a pending workflow over there. And now that workload's finished, but two places,
Pete Rango: Give me one second. I'm trying to get back. Um,
sweetman eth (sweets): you'll need to re right now. You've got environment staging flagged.


00:05:43

Carl Tydingco: All right.
sweetman eth (sweets): There we go. Again, just clear that in 46 seconds ago. Right there. The top one took 21 seconds to run the research pipeline. And then you you can also click into these steps. So we can add logging into these if you click on like the read claim build step. Yeah.
Carl Tydingco: Mhm.
sweetman eth (sweets): You see the inputs and outputs. And so we can expand those. Um so it gives us just much more observability into all this.
Carl Tydingco: And are are there any thresholds as far as like how long these processes can run?
sweetman eth (sweets): No, these can run infinitely.
Carl Tydingco: Okay.
sweetman eth (sweets): And I actually use them in I just started using these in recoup as well for scheduled actions. So, for example,
Carl Tydingco: Okay.
sweetman eth (sweets): I want to schedule my podcast clip to go out every single day at 8 a.m. I have scheduled um five episodes to go out a day.


00:06:33

sweetman eth (sweets): I use a Verscell built a Verscell workflow for each of those. As soon as I schedule the post, it creates the workflow. That workflow then sleeps until the date that I've set. We don't get charged.
Carl Tydingco: Mhm.
sweetman eth (sweets): No computation is running. That sleep finishes, the workflow runs. That work that run could be a year in advance.
Carl Tydingco: Okay.
sweetman eth (sweets): Um and so we can schedule with this and sleeps don't charge us any money.
Carl Tydingco: Uhhuh.
sweetman eth (sweets): And then these also can run forever. As you know,
Carl Tydingco: Okay.
sweetman eth (sweets): virtual API is a limit of, I believe, eight minutes.
Carl Tydingco: Yep.
sweetman eth (sweets): The workflow allows multiple of those to be run and stacked together for infinitely long workflows.
Carl Tydingco: Okay. So, each workflow step is limited to 8 minutes of runtime.
sweetman eth (sweets): Cor um an API endpoint has a has a lifetime of eight minutes. A workflow has an infinite lifetime.


00:07:21

sweetman eth (sweets): So API, if it's going to be a longunning task, trigger a workflow and then have that API return.
Carl Tydingco: Mhm.
sweetman eth (sweets): Um,
Carl Tydingco: Mhm.
sweetman eth (sweets): but the workflow itself has an infinite lifetime and each step I don't a step might have an 8 minute lifetime. Um, that I'm not sure about. If a step gets too large, we would just break it down into multiple steps.
Carl Tydingco: Sure.
sweetman eth (sweets): That way we wouldn't hit that that limit anymore.
Carl Tydingco: Sure. I'm I'm curious. Is there how would we know if we have a workflow that's been running longer than expect or just a long running workflow? Basic is is there a way to detect zombie workflows or zombie
sweetman eth (sweets): Um,
Carl Tydingco: steps I guess?
sweetman eth (sweets): I I I recommend manually right now. So,
Carl Tydingco: Okay.
sweetman eth (sweets): just once in a while going onto the workflow page and if we see something that's still stuck pending, that's what I see on the recoup side is we have long running agentic tasks and I'll go in there.


00:08:13

sweetman eth (sweets): I'm like,
Carl Tydingco: Okay.
sweetman eth (sweets): why has this been running for 25 hours? and then I'll click in and it's either it's either expected that that workflow runs like that or it's not.
Carl Tydingco: Okay.
sweetman eth (sweets): Um we can set programmatic checks in place that that check I you can have
Carl Tydingco: Got it. Okay, cool.
sweetman eth (sweets): one workflow like looking and analyzing monitoring another workflow. Um but for now I recommend we do it manually until we see something that jumps out. Like right now it's everything's running less than 30 seconds.
Carl Tydingco: Okay.
sweetman eth (sweets): If we see stuff running for multiple minutes then we can take a deeper look at it.
Carl Tydingco: Cool. It is very cool. Good.
sweetman eth (sweets): That's uh so that's what I built out yesterday. Um pop-ups deleted. That was 3,000 lines of code removed from the web codebase.
Carl Tydingco: Yes.
sweetman eth (sweets): Um now I am putting in that reset endpoint so that I don't need to do what I just did to reset Pete.


00:09:01

sweetman eth (sweets): Um once I finish that today, I believe I'm moving on to API migrations, but everything's updated in the project uh on GitHub. So if you if I'm not clear, the project is up to date. That's it for me.
Carl Tydingco: Cool.
Pete Rango: sick. That's awesome,
Carl Tydingco: Let's
Pete Rango: man. Thank you. Um, also I went and took care of the um the pink on the loading for
Carl Tydingco: see.
Pete Rango: the profile builder. So,
sweetman eth (sweets): Thank you.
Pete Rango: so I did that And you'll see it our brand pink when it's on light and you'll see
Carl Tydingco: Freaking
Pete Rango: it uh the blue the same blue that the add button uh uses for when it's in dark mode. Um so that's that's taken care of.
sweetman eth (sweets): Nice.
Pete Rango: Um I had my agent working yesterday while I was out. Um man,
Carl Tydingco: man.
Pete Rango: it's been like just going crazy. we it's like so I had it reduced to 10-second responses but we kept running into like issues where it just wouldn't it wouldn't use all the data available to it within the lore like I don't know repository right um so that's like the issue I'm kind of like running into right now is like how to best uh optimize this so it doesn't take like 50 to 60 seconds you know like it's just ridiculous that a chatbot would take that long to just like pull information.


00:10:31

Carl Tydingco: Mhm.
Pete Rango: Um, also because we have the uh the Verscell AI gateway, it's now able to like try out multiple AIS. So, that's been cool. Um, so right now I'm having it run some loops testing different AIs and different flows. So, hopefully today we'll have a better flow. Um, a couple of bugs.
Carl Tydingco: of course.
Pete Rango: I'm working on uh let me pull them up. One of them is where is it? Okay, so the one thing was I already m working on the um the bug where an artist's website will show up as two pills.
Carl Tydingco: Mhm.
Pete Rango: So I've created uh you know just like a pretty generic um web icon, right? like a kind of little mini globe or whatever, grided glo uh globe. So, that should be up today. Um, and then I'm working also on CY's request for like that generated thumbnail. Um,
Carl Tydingco: Okay.
Pete Rango: the generated thumbnail will be mostly for artist profiles. So, when you share an artist profile, it'll look something here.


00:11:48

Pete Rango: I can show you where I'm at. Uh, where is it? Here. So, it'll look somewhat something like this. Uh, I'm kind of fixing the branding right now because the pink is not the pink that we use. Um, we don't need the website here. I'm moving the logo over to the right side. Um, and then I'm playing with this idea of like if you share an artist's uh uh link, it'll have a little bit of their bio within here to see if that works.
Carl Tydingco: Okay, great.
Pete Rango: Um, yeah. I'm still like on the fence as to like if the bio would be the best text to use here or if it's just like the artist name and music nerd. you know, so I do like the idea of the about showing up. So, um, so I think I'm going to go around with that way.
Carl Tydingco: Yep. Maybe one thing to consider for as far as tax is some sort of call to action to try to incentivize the the recipient to tap through


00:12:48

Pete Rango: Okay. Um, yeah, if we go that route, like what do you imagine? Because like if we go that route, I'd probably get rid of the about because it's just like so much text in here.
Carl Tydingco: Yeah. Yeah. I I I think that that's kind of like what you're going to kind of have to you're you're going to AB test it, right, in a sense on yourself,
Pete Rango: Yeah.
Carl Tydingco: but but that that is really I mean I think that that is a goal for this, right? Is to get someone to to tap through
Pete Rango: Yeah. Um, there's other stuff I was playing with with like discover this artist and it would probably have their logo and then like name or something. Um, but yeah, I haven't I haven't played too too much with it. I just started working on it this morning. So, I'll keep playing with it and then see what we can do. Um, what else uh is on the docket? My agent was going crazy yesterday.


00:13:47

Pete Rango: I was like,
Carl Tydingco: love it.
Pete Rango: "Yeah,
Carl Tydingco: Crazy agents.
Pete Rango: need a chill.
Carl Tydingco: I noticed that there are three issues in the project that have no status and I'm curious like are the do we not schedule are they not did we not um take them in for this iteration or we just didn't put them into to do
Pete Rango: You're talking about in issues or
Carl Tydingco: uh I'm just looking at the project board and and you know there's like um
Pete Rango: here. Can you show me which ones?
Carl Tydingco: uh Can you scroll all the way right?
sweetman eth (sweets): all three on the left. Oh, all the way right is the archive.
Carl Tydingco: Oh, okay. Okay.
sweetman eth (sweets): I created archive last night for so that way we can measure easier. I was like, do we delete them when we finished with a project? And I was like, you know what? Let's keep done for what's been done in the last seven days. And anything else,


00:14:35

Carl Tydingco: Uh-huh.
sweetman eth (sweets): we move over to archive. That way, it's still associated with the project, but it doesn't clog us up on Thursdays.
Carl Tydingco: Okay. Love it. Um, it this is just an issue with the uh mobile GitHub app which is really horrible.
Pete Rango: the um these Oh my god, I can't even see that.
Carl Tydingco: Yeah. Yeah. You don't want to see us.
Pete Rango: U so just so you know, these were like really old issues that I saw on the board.
sweetman eth (sweets): Yep.
Carl Tydingco: Mhm.
Pete Rango: Um so I just went and archived them when I saw Mhm.
Carl Tydingco: Okay. Okay.
Pete Rango: Uh but yeah, everything else um should have an owner.
Carl Tydingco: Okay. Cool.
Pete Rango: Yeah, that I know.
sweetman eth (sweets): I also personally I was also wondering if we can get rid of to-do bonus and on deck and make no status our to-do
Pete Rango: Yeah.
sweetman eth (sweets): column or rename on deck to blocked if if that is the
Carl Tydingco: Oh.


00:15:30

Pete Rango: What is on deck to you?
Carl Tydingco: Oh. Oh, I'm sorry. That if you scroll all the way left, that was what I had a question about is the no status.
sweetman eth (sweets): the no status.
Pete Rango: Oh, so the I mean the way that I was viewing no status was just kind of like our to-do. So like if we want to just get rid of no status and throw them into do that's better for
Carl Tydingco: Yeah. I I Yes. All this is open. So they like we need to figure out how this works best for for y'all, right? And so it would be like I think conceptually you should have an I like looking at the board should give you an idea of like what's not been started, what's started, what's done and and then how however you want to slice and dice
Pete Rango: Yeah. Can we get rid of Can we get rid of on
Carl Tydingco: that. Um I I think Sure.
Pete Rango: deck? Okay.


00:16:25

sweetman eth (sweets): I'm done.
Pete Rango: Because what what would on deck mean to you guys
Carl Tydingco: So that originally was a status that the interns wanted for they were, you know, there's a a story that's in progress and then they hit a blocker and they're waiting for that blocker to clear. And so they're picking up another story and working on that while they're waiting for the blocker to clear on the the other story. So they would move that story out of in progress into on deck and then they'd go work on something else. Totally. I think get rid of it and then if we need this status then we would just bring it back, right?
Pete Rango: All right, cool.
Carl Tydingco: Yeah.
Pete Rango: I'm al I'm also down to get rid of bonus.
Carl Tydingco: Yeah. Yeah. Yeah.
Pete Rango: Um,
Carl Tydingco: Totally.
Pete Rango: okay.
Carl Tydingco: Just delete. Don't need to hide,
sweetman eth (sweets): Yeah,
Carl Tydingco: right?
Pete Rango: Oh s***.
sweetman eth (sweets): I think you hit it.
Carl Tydingco: Yeah.


00:17:17

Carl Tydingco: Always always delete.
Pete Rango: Hold on.
Carl Tydingco: We can bring things back or just re reinvent them.
Pete Rango: How do I I mean, I don't even know how to unhide.
sweetman eth (sweets): Yeah,
Pete Rango: Oh,
sweetman eth (sweets): might as well have deleted it.
Pete Rango: it's with this. Hold on. If I clear this. Okay, I got you. Hold on. Let me delete.
sweetman eth (sweets): You did it. Nice.
Pete Rango: Delete. Cool. Oh,
Carl Tydingco: I love it.
Pete Rango: some Why do you keep Why do you keep coming back?
Carl Tydingco: Oh no,
sweetman eth (sweets): Why?
Carl Tydingco: it's back.
Pete Rango: bonus.
Carl Tydingco: It's like don't kill me.
sweetman eth (sweets): Look at that. Don't need to scroll anymore.
Carl Tydingco: I want to live.
sweetman eth (sweets): This is great.
Pete Rango: Yeah, this looks better.
Carl Tydingco: Okay, sweet. I like it, too.
Pete Rango: Okay, cool. Um, this one's in progress right now. All right. Um, anything else?


00:18:06

Pete Rango: Oh, yeah. I've man I'm still kind of like on the fence if I need to use Reream because like Reream's just like a little pricey. Um and was looking at like I could use Riverside. It's just that like the only downside is that if somebody uses like wants to join through mobile then they have to
Carl Tydingco: Uh-huh.
Pete Rango: download the Riverside app. I was looking into reream.
Carl Tydingco: Okay. I I I would say that that's a non-starter.
Pete Rango: I don't think Yeah. Right.
Carl Tydingco: Yep.
Pete Rango: Like it just sucks.
Carl Tydingco: Yep.
Pete Rango: Um,
Carl Tydingco: Yep.
Pete Rango: okay. I think uh reream if I sign up for it. Um, there's the Creator Plus. Are you in Creator Plus? Suite.
sweetman eth (sweets): I downgraded when you mentioned it to me. One thing I forgot to check that I was debating after you were talking the other day is if I lost high definition.
Pete Rango: Yeah.
sweetman eth (sweets): Do one of the tiers increase to being able to be 1080p.


00:19:04

sweetman eth (sweets): Do you have the pricing page up?
Pete Rango: Yeah, I have it up here. um just doesn't really say.
sweetman eth (sweets): Uh it does not say in lower. It doesn't say anything either. Does it? Is there a table down below? No. Um,
Pete Rango: Um I I think you're right though. And hold on. I think I have it on um on one of my chats. One second. Recording platform. Um
sweetman eth (sweets): I I need HD as well. I don't want it to drop down to 720p being the the highest. I need 1080p. So, I'm going to be in a similar place as you. I don't nobody joins mine on well I guess C.Y.joins mine on mobile but him and I will probably move over to Google meets.
Pete Rango: Yeah.
sweetman eth (sweets): I don't identify as a streamer. I'm I'm noticing that there is a big streamer class. I I'm more of a a video maker.


00:20:05

Pete Rango: Well, I mean, the only reason I wasn't like super sold on just going straight to reream was because like I made the decision that I don't need to stream this. And even the comment that C.Y.made yesterday was like,
Carl Tydingco: I'm subscribing.
Pete Rango: "Yeah, like I don't want people to feel pressure because they feel like this is live and I'd rather if like I don't know if they want me to edit something out, I could or something." Um,
Carl Tydingco: Okay.
sweetman eth (sweets): You need professional plan or higher for 1080p on on reream.
Pete Rango: yeah, I just saw I was looking it up over here.
sweetman eth (sweets): So that looks like it's 39 per month build annually, which is what I paid. So 39* 12. I think I was paying like close to 500 a year. That matches 468.
Pete Rango: Yeah.
sweetman eth (sweets): So I I was paying that. I just downgraded, but I still have it until that runs out. But I'll need to I'll need to decide if I go back up to the around 500 or what it would be for me to go over to Riverside or just look at other tools.


00:21:00

sweetman eth (sweets): Um
Carl Tydingco: Okay,
Pete Rango: Yeah.
Carl Tydingco: Pete. So, you said that uh you and Pete or you and C.Y.talked about not doing a live stream.
Pete Rango: Well, yesterday when we were talking about it,
Carl Tydingco: Yep.
Pete Rango: he said just to consider the pressures of doing something live.
Carl Tydingco: Okay.
Pete Rango: And he said he's gotten used to it,
Carl Tydingco: Uh-huh.
Pete Rango: but like some of these guests aren't necessarily I mean the goal isn't really to have a lot of re uh reappearing guests. So, like it's not like you can just get used to it,
Carl Tydingco: Mhm.
Pete Rango: you know,
Carl Tydingco: Right.
Pete Rango: and and I want people to be vulnerable and and not have to worry about it, you know?
Carl Tydingco: So I would propose then um like let's not live stream do the next one bring up live streaming to see if that's something people are interested in or if you well actually like do you want to live stream this thing if you do then
Pete Rango: No, I No,


00:21:56

Carl Tydingco: let's let's try it right
Pete Rango: no, I really not. The idea wasn't to live stream to be honest. It was just to record these
Carl Tydingco: okay then then if live streaming's off the table then that's not a requirement and and just figure out what tool works best for the the thing that you want to do.
Pete Rango: Yeah, there was um I've been looking at there's other tools out there, but just you know, they're just so new and this seems vibe coded and like there's just like there's there's things that I'm like h but like for example like this one uh for the for the pricing And for what it comes, uh, it's like not too bad. Um, I'm I'm okay with HD, like 1080. Like, I don't think I need 4K, especially if it's just going to go on socials. Like, I'm not pressed on it being 4K. Um, but this one's saying it's like around 19 a month and it's unlimited transcriptions,
Carl Tydingco: That's what
Pete Rango: unlimited audio, um, whatever. Uh, I think it does individual recordings, too, which is another thing I wanted to make sure it had.


00:22:59

Pete Rango: But anyways, um I I'll look into it and just figure out which one it is. I'm trying to keep it so we're not on the more expensive side of Reream, which is like you said 39 a month or something.
Carl Tydingco: Okay. Okay.
Pete Rango: Yeah.
Carl Tydingco: Um and and too like we can always I mean there's like zero switching costs, right? So, it's sort of like I I think like just pick the one you think is looks best for now and then if we need to change or it turns out to be a piece of junk then we'll change.
Pete Rango: Yeah. So then I'll take that as I should just try something for a monthly fee and then eventually switch to yearly once we settle on one.
Carl Tydingco: Yep.
Pete Rango: Okay, cool. Sounds good. Um yeah, that's all for me. Um I'll send you guys any updates if anything.
sweetman eth (sweets): f***.
Carl Tydingco: Cool.
Pete Rango: Um, sweet man, you're not still blocked on what you messaged me on, are you? I think I had Okay,
sweetman eth (sweets): No blockers.
Pete Rango: cool. Sounds good. Well, I'm in today and uh hit me up if you anything.
Carl Tydingco: All right. Thanks everybody.
Pete Rango: All right, have a good one.


Transcription ended after 00:24:20

This editable transcript was computer generated and might contain errors. People can also change the text after it was created.
```
