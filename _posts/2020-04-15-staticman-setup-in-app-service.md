---
title: Staticman setup in App Service
date: 2020-04-15T18:30:00+02:00
author: Jan Hajek
categories:
  - Microsoft
  - Microsoft Azure
  - Open Source
tags:
  - Azure Web Apps
  - Node.js
  - App Service on Linux
  - Blog
---

Few months ago, I [wrote a post](/2020/02/04/pardon-the-mess/) about moving my blog away from WordPress to GitHub pages. While the general migration to markdown has been quite smooth, setting up the comment system was a pain. Let me share my experience with that!

Since I moved the blog to GitHub, I basically lost the nice comment system in WordPress, combined with [Jetpack](https://jetpack.me) and [Akismet](https://akismet.com/) for spam protection. Since I chose [Minimal Mistakes](https://mmistakes.github.io/minimal-mistakes/) as my theme, it supports multiple commenting engines - Disqus, Discourse, Facebook, utterances and Staticman. Since I was migrating from WordPress and wanted to move the comments as well, I ended up going with Staticman, since it seems to be really simple for setup, all data are stored within the GitHub repository itself.

I could also go with Facebook or some other hosted alternative, but upon some closer look, I figured that migrating existing comments would be rather pain. For comment migration, I used [wp2sm](https://www.npmjs.com/package/wordpress-comments-jekyll-staticman) tool, which simply took the comment export from WordPress and generated the files which I then committed.

Staticman is offered in two versions - hosted one (which I started with) and self-hosted one. It's written in Node.js. Upon setting up Staticman, I set up reCaptcha to prevent spammers from doing their stuff, however it [appears](https://github.com/hajekj/hajekj.github.io/pulls?q=is%3Apr+is%3Aclosed) that they found a way around it. To this day, my only clue is that they have someone solving those captchas - which doesn't really make sense, who would pay someone to spam comments on my blog?

Since reCpatcha wasn't enough, Staticman also supports [Akismet](https://akismet.com/) - yes, the same spam filtering technology which is used by WordPress. Akismet is free for your personal blog, which makes it really attractive. The only issue is, that in order to use Akismet and Staticman, you need to be self-hosting Staticman. There is actually an [existing PR](https://github.com/eduardoboucas/staticman/pull/195) for this to be enabled, but the authors of Staticman don't seem to be too keen to merge it as of now.

So I decided, that the best way would be to run Staticman on my own. By default, Staticman has [one-click deploy to Heroku](https://elements.heroku.com/buttons/eduardoboucas/staticman), but hey! I like Azure, so let's run it there. Staticman is written in Node.js so the choice of App Service on Linux seems most obvious. So we start with creating our App Service on Linux app in the portal - I went with Node 12 LTS as the runtime image.

Next, we need to deploy the code there - using the [Deployment Center](https://docs.microsoft.com/en-us/azure/app-service/deploy-continuous-deployment), we setup deployment from GitHub - I forked the Staticman repo, and then set is as the source repository. The rest happened in App Service - [Oryx](https://github.com/microsoft/Oryx/tree/master/doc) the App Service on Linux build engine picked up the contents, built the app and put it into the storage. Nice!

Now we need to configure the app itself - this was the biggest culprit for me. Unfortunately the [documentation ](https://staticman.net/docs/api) is slightly outdated, so I ended up browsing the source code and figuring stuff on my own:

All the configuration properties are available in [config.js](https://github.com/eduardoboucas/staticman/blob/master/config.js) along with their respective Environment Variable names (App Settings in App Service).

I started with specifying `NODE_ENV` to be set to `production`, followed by the GitHub configuration. In order to setup GitHub, there are two ways - you can either setup a separate account and get a token for it (that is what their guide recommends), but I didn't like this approach. My issue with it, is that I don't want to have another GitHub account, especially when you can make use of [GitHub Apps](https://developer.github.com/apps/about-apps/), which is what the hosted Staticman is using.

First-off, you need to sign up for the [GitHub Developer Program](https://developer.github.com/program/) in order to be able to register your application. Assign it following permissions:
- Contents - Read & write
- Metadata - Read-only
- Pull Requests - Read & write

Next, you [register](https://github.com/settings/apps) the application. Once you register it, make note of the **App ID** (not *Client ID*) and generate a private key at the bottom of the page (you will get a *.pem* file). The *App ID* goes to `GITHUB_APP_ID` variable, the contents of the certificate (*.pem* file) go to `GITHUB_PRIVATE_KEY` - but again, there's a catch:

The certificate has multiple lines and when you paste it to the application setting, it will be only a single line, which is perfectly fine. What you however need to do, is to open the *Advanced edit* and replace the first and last new-line (which got converted to space) with a new-line `\n` like so (don't replace the spaces within the certificate value):

```
-----BEGIN RSA PRIVATE KEY-----\n<value>\n-----END RSA PRIVATE KEY-----
```

It needs to be done in the *Advanced edit* of App Settings, otherwise you will end up with an escaped new-line eg. `\\n` which won't work correctly and you will get errors like `[InvalidAsn1Error]: encoding too long` or `error:0909006C:PEM routines:get_name:no start line`.

The same procedure is for `RSA_PRIVATE_KEY` variable which is used for [encrypting secrets](https://staticman.net/docs/encryption). You can generate such key [in your browser](https://travistidwell.com/jsencrypt/demo/) or use OpenSSL for example.

The last step is to configure Akismet by setting `AKISMET_SITE` which should be the address of your site and `AKISMET_API_KEY` which you can get after [signing up](https://akismet.com/).

Then, you have to install your application into your repository by going to your app's public page (for my app it was: `https://github.com/apps/hajekj-staticman`). Last step is to confirm that the app can access the repo, by calling your Staticman instance at `https://hajekj-staticman.azurewebsites.net/v2/connect/hajekj/hajekj.github.io` (obviously replace with your site name and user and repo). Once it says `OK!` that means you are good to go.

Some of the configuration has to be done in the blog's repo itself [`staticman.yml`](https://github.com/hajekj/hajekj.github.io/blob/master/staticman.yml) and [`config.yml`](https://github.com/hajekj/hajekj.github.io/blob/master/_config.yml) - refer to [your theme's docs](https://mmistakes.github.io/minimal-mistakes/docs/configuration/#static-based-comments-via-staticman) for more info.

Thanks to hosting it in Azure, you can also [enable Application Insights](https://docs.microsoft.com/en-us/azure/azure-monitor/app/nodejs) directly from App Service with no code changes required!

After deploying this along with Akismet, I stopped seeing the excessive spam comments (PRs) on my blog!