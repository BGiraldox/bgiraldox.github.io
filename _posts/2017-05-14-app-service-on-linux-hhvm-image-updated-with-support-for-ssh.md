---
title: 'App Service on Linux &#8211; HHVM image updated with support for SSH'
date: 2017-05-14T09:00:43+02:00
author: Jan Hajek
permalink: /2017/05/14/app-service-on-linux-hhvm-image-updated-with-support-for-ssh/
categories:
  - Microsoft
  - Microsoft Azure
  - Open Source
tags:
  - App Service on Linux
  - Docker
  - HHVM
  - SSH
format: aside
---
During <a href="https://channel9.msdn.com/Events/Build/2017">Build 2017</a>, Microsoft announced <a href="https://azure.microsoft.com/en-us/blog/see-whats-new-for-azure-app-service-on-linux-preview/">bunch of new features for App Service on Linux</a>. One of those features announced was support for <a href="https://docs.microsoft.com/en-us/azure/app-service-web/app-service-linux-ssh-support">SSH support</a> directly into the web worker instance. Based on my previous article about <a href="https://hajekj.net/2016/12/25/building-custom-docker-images-for-use-in-app-service-on-linux/">building a custom image for ASL</a>, I have updated the HHVM image both on <a href="https://github.com/TheNetworg/appsvc-hhvm/">GitHub</a> and <a href="https://hub.docker.com/r/thenetworg/appsvc-hhvm/">Docker hub</a> to have SSH support as well.

<!--more-->
<blockquote>At the moment App Service on Linux is going to have an issue with connecting to the SSH due to the worker's IP address being unknown to Kudu in certain image scenarios. The ASL team has been made aware of this issue and already have a fix ready, so it is probably just a matter of days until it is deployed and works completely.</blockquote>
Enabling your image is really simple, you just have to follow the <a href="https://docs.microsoft.com/en-us/azure/app-service-web/app-service-linux-ssh-support">steps they provide</a> and you are all set.