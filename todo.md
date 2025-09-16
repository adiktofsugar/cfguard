# TODO

## Improve security

User passwords _could_ have a salt, so that access to R2 doesn't immediately mean total compromise. To do this, I'd need to:

- add salt / seed to env
- make password generation a server call
- rate limit api call to prevent brute force-ing the salt

## Make storybook-like preview

I want to make a single "app" that just has a bunch of stories. This app should _also_ output the actual files we run.

So, assuming we output a single page app, I want 2 entry points:

- app.js (the actual JS we generate for the pages)
- preview.js (the storybook preview manager)

I don't like that I always have to configure storybook / cosmos with a different build system just so it can find the stories and put them in iframes. I'd prefer to basically just make those async chunks that I load in the iframes.

...the problem is that there's no way to just find the stories without the build part. Maybe we just make helpers for all of them?

Thinking about how to do this with esbuild, we have some options...

### Build story files and main statically

add a helper to find all the .story files and auto inject a static "main.js" file that will query a json file to to load them.

the problem with this is that

- new files aren't picked up
- the json file only changes when we find new files

That said, using esbuild directly like this is a super not normal thing to do, but if I wanted to do this I could just add a watcher for the directory and call `rebuild`, so...this _is_ valid, but it's making another build ecosystem that's built on esbuild...which might actually be what I want

### Cosmos way - auto-generate main file

The cosmos way works really well, but it's messy. You basically just have a generated file that comes from a separate process that's watching for a glob, and that generated file is the file you build, so any changes to that file are picked up by basically any build system.

One big issue with this is that, since it's multiple processes, it's super hard to work with. You have to start the cosmos (or whatever) process first, in the background. If you don't do that, you can't make the initial file. You could make a "not-cosmos-exec" that calls whatever command you give it after it makes the initial file and starts the background process, I guess...?
