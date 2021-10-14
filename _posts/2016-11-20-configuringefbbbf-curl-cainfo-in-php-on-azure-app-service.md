---
title: Configuring﻿ curl.cainfo in PHP on Azure App Service
date: 2016-11-20T14:00:31+01:00
author: Jan Hajek
permalink: '/2016/11/20/configuring%ef%bb%bf-curl-cainfo-in-php-on-azure-app-service/'
categories:
  - Microsoft
  - Microsoft Azure
tags:
  - Azure Web Apps
  - Certificate Authority
  - PHP
---

<p><a href="http://php.net/manual/en/intro.curl.php">cURL</a> is one of the most common ways to make HTTP requests from PHP code. When you make regular http:// calls everything is alright, but when you decide to go with https://, you need to configure few things on App Service manually for it to work correctly.</p>

<!--more-->

<p>So what is it that you need to be able to call remote server over https://? Usually, you need a CA certificate to be able to verify the remote server's identity. In some cases, people tend to disable <em>CURLOPT_SSL_VERIFYPEER</em> option, which can be good for debug or testing, however, <strong>do not ever do this in production</strong> (unless of course, you don't give a damn about security).</p>

<p>There are tutorials how to set this up (for example in <a href="https://docs.microsoft.com/en-in/azure/app-service-web/web-sites-php-configure#how-to-change-the-built-in-php-configurations">Azure docs</a>), however beware of this very bit - the path:</p>

```ini
; Example Settings
curl.cainfo="%ProgramFiles(x86)%\Git\bin\curl-ca-bundle.crt"
```

<p>The path is referring to the web&nbsp;instance's filesystem, based on the CURRENT image and version of Git which is installed on the instance. In short, this means that if something changes on the instance, like a new version of git is installed, where certificates get stored into <em>%ProgramFiles(x86)%\Git\usr\ssl\certs\ca-bundle.crt</em>, your application is going to stop working and you may have a hard time figuring out what is wrong.</p>

<h1>Why am I writing this?</h1>

<p>Because it actually happened. I was relying on the certificate which is distributed with Git - because I thought&nbsp;- "<em>hmm, if I upload my own, I will have to maintain it, so I am going to use the one distributed with Git, because Microsoft will be keeping it up-to-date</em>" - and that is exactly what happened. While I was relying on the path shown in the example, the instances were upgraded with a new version of Git, which stores the CA certificate in a different path - and things obviously&nbsp;started falling apart.</p>

<h1>Conclusion</h1>

<p>So I would say that it is a good practice to distribute a CA certificate when deploying your application to Azure - this can be achieved by plugging the task into the release definition in VSTS or deployment script, and it is going to always keep the certificate up to date, and you will be the one having control of it. So the advice is - do not rely on anything which is not distributed with your application (except the default configuration of the runtime and its settings).</p>
