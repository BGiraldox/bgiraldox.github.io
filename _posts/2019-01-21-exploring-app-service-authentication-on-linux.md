---
title: Exploring App Service Authentication on Linux
date: 2019-01-21T09:00:43+01:00
author: Jan Hajek
categories:
  - Microsoft
  - Microsoft Azure
tags:
  - App Service on Linux
  - ASP.NET Core
  - Authentication
  - Azure Web Apps
  - Docker
  - EasyAuth
  - Single Sign On
  - SSO
---

<p>A while ago, it <a href="https://blogs.msdn.microsoft.com/appserviceteam/2018/05/07/linux-auth/">has been announced</a> that App Service on Linux has gained the ability to make use of Authentication / Authorization as well. Originally, I wanted to publish the article earlier, but I got to finish it just now. This article is going to walk you through how the Authentication / Authorization works in App Service on Linux and might give you few hints how to make some more use of it.</p>

<!--more-->

<p>When you setup an App Service on Linux site you get the ability to enable Authentication / Authorization (also called EasyAuth internally at Microsoft). Honestly, this feature has fascinated me since the second I saw it. It basically allows you to protect your site or Azure Function in seconds. I have always wanted to run this feature on my own on-premise server as well - just for experiments - everything that goes in production must be running in Azure, and ideally on top of its platform services.</p>

<p>I am not going to describe how it works generally, because this has been already done by its author - <a href="https://cgillum.tech/category/easy-auth/">Chris Gillum on his blog</a> (I recommend reading it if you want to know about the internals).</p>

<p>Since we know, that App Service on Linux is Docker based, the EasyAuth cannot be easily hooked into the image just like it is built into the IIS pipeline in App Service on Windows. This basically gave me two ideas - either Microsoft developed their own nginx/apache module which they run on top of the App Service on Linux's proxy or there is another container.</p>

<p>Just a sidenote, <a href="https://github.com/cloudflare/nginx-google-oauth/">Cloudflare has actually built</a> a very nice clone to EasyAuth for Nginx and Google's OAuth2. It doesn't have that many features like EasyAuth but it is very nice.</p>

<p>Since I have moved my blog to Microsoft Azure, I have been <a href="https://github.com/hajekj/hajekjnet-php">running it in a Docker container</a> which was heavily inspired by App Service on Linux's containers. All of App Service's containers <a href="https://github.com/Azure-App-Service">reside on GitHub</a> and hold your hats... <a href="https://hub.docker.com/u/appsvc">Docker Hub</a>. I would have hoped for Microsoft to use Azure Container Registry instead, but anyways, lets continue.</p>

<p>Thanks to all of the images being on Docker Hub, I discovered a very special image called <a href="https://hub.docker.com/r/appsvc/middleware">middleware</a>. When you <a href="https://microbadger.com/images/appsvc/middleware">explore the image</a>, you won't notice anything out of the ordinary - ASP.NET Core Docker container, but the entrypoint is calling  <em>MiddlewareLinux.dll</em>. When I saw that, I already knew I have found what I was looking for.</p>

<p>So it turned out that Microsoft is using an <a href="https://docs.microsoft.com/en-us/azure/architecture/patterns/ambassador">Ambassador Pattern</a> which uses the Middleware container as a proxy which does all the EasyAuth magic for Docker.</p>
<figure class="wp-block-image"><img src="/uploads/2019/01/ambassador-1024x292.png" alt="" class="wp-image-822"/><figcaption>Original: https://docs.microsoft.com/en-us/azure/architecture/patterns/_images/ambassador.png</figcaption></figure>
<p>Now having the ability to pull the image, the next obvious thing to do is to explore its contents. If you want to try it yourself, simply go to <a href="https://training.play-with-docker.com/docker-images/">Play with Docker</a> for a full Docker browser experience.</p>

<p>And there, in one of the layers, you can find the afformentioned DLL - <em>MiddlewareLinux.dll</em> along with other DLLs (located in <em>/app</em> directory in one of the layers). You can then zip all the files and use <a href="https://transfer.sh/">transfer.sh</a> (or an <a href="https://github.com/dutchcoders/transfer.sh/issues/116">alternative solution</a>) service to upload it from the bash and move it to your PC. Unfortunately, due to the <a href="/uploads/2019/01/AppServiceMiddleware-License.pdf">license included with the source code</a>, this article has to end here. However, you should have sufficient information by now about how EasyAuth works in App Service on Linux. I have not been able to determine, whether this additional container is running on the same instance as your application (and thus eating your resources, which is very likely to be honest) or running in some other tier placed in front of the worker roles. Aditionally you can read more about the general <a href="http://itnerd.space/2016/11/02/azure-app-service-architecture-3-app-service-on-linux/">App Service on Linux architecture on IT Nerd Space</a> - it has been described really well.</p>

<p><strong>Please note:</strong> The purpose of this article is to provide insight and more understanding about how this software works, rather than create harm or break any license terms which might apply.</p>
