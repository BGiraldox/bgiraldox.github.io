---
title: Speed up your application in Azure App Service
date: 2016-11-14T12:00:31+01:00
author: Jan Hajek
permalink: /2016/11/14/speed-up-your-application-in-azure-app-service/
categories:
  - Microsoft
  - Microsoft Azure
  - Open Source
tags:
  - Azure Web Apps
  - DevOps
  - Local Cache
  - Node.js
  - PHP
  - Storage
---
There are many different articles on the internet about how to make an application faster when hosting it on Azure. This has been a real pain point with big PHP applications or applications which involve a lot if IO operations - like loading modules with Node.js. Recently, I was working with one startup and they approached me with a very interesting issue: Their Node.js application was running about 35x faster on Heroku than on Azure App Service and that is what actually made me to write this article.

<!--more-->
<h1>Persistent storage in App Service</h1>
The way storage is designed for Azure App Service is very interesting. Unlike with Heroku (or other similar providers), App Service offers a shared, persistent storage for your application. This generally means, that when one instance in a farm makes a write to the file system (<em>D:\home</em>) it will be available for all the other instances in the farm and it is going to persist even if the farm restarts or recycles.

This feature is really important for most of the "old-school" applications (well, it is kind of habit which has been overcome, right?), which use the file system for storage - like <a href="https://wordpress.org/">WordPress</a> for uploads, plugins and themes (there are <a href="https://wordpress.org/plugins/windows-azure-storage/">plugins</a> which allow you to use Azure Storage for that or even an <a href="http://projectnami.org/">entire fork of WordPress called Project Nami</a> modified to run on Azure as smoothly as possible), <a href="https://moodle.org/">Moodle</a>, <a href="https://www.joomla.org/">Joomla</a>, <a href="https://www.phpbb.com/">phpBB</a> and many more.. It allows you to rapidly migrate any existing application to Azure, leverage the scalability and many other cool features, which App Service offers.

However, modern applications usually separate the storage from the application tier and allow you to easily use CDNs and blob storage, because it allows for bigger scale and takes some load off from the application tier, so there is no need for such persistent storage since none of the instances are writing to the shared storage (assuming uploads go to Temp folder and then are uploaded to the blob storage for example).
<h2>Let's dive just a bit deeper</h2>
The storage in App Service is using Azure Storage in the background. Generally, each App Service instance has an agent called <a href="https://azure.microsoft.com/en-us/blog/beta-release-of-windows-azure-drive/">Azure Drive</a>  which emulates the file system calls from IIS and proxies it to Azure Storage along with some caching layer. If you would like to learn more about the stuff that is behind it, I suggest watching <a href="https://channel9.msdn.com/Events/TechEd/NorthAmerica/2012/AZR305">Windows Azure Web Sites: Under the Hood</a> from TechEd 2012:

https://channel9.msdn.com/Events/TechEd/NorthAmerica/2012/AZR305

The way that persistent storage is handled in App Service (and it is done in a very clever and admirable way) kind of obviously adds another layer of latency which you have to add to your requests. And it can have quite a big impact on running applications like WordPress, Moodle and similar. So, <strong>is there any solution for apps, which don't need persistent storage on the application tier?</strong>
<h1>Introducing App Service Local Cache</h1>
The answer is yes! About half a year ago, App Service team introduced a feature called <a href="https://azure.microsoft.com/en-us/documentation/articles/app-service-local-cache/">App Service Local Cache</a>. Not many people have however heard about it, which kind of surprised me and that is the main motivation for writing this article.

The Local Cache basically sort of "removes" the persistent storage from your Web App and makes the instances pre-load and cache the file system beforehand (you can find more about the impacts and features in the <a href="https://azure.microsoft.com/en-us/documentation/articles/app-service-local-cache/">docs</a>). Thanks to that, your application is going to be most likely faster.
<h2>Some numbers...</h2>
So back to my case with the startup. When their application was running without Local Cache, the server-side processing of the request took 70ms. When we enabled it, the processing time was down to 2-3ms on average - which is a HUGE improvement in my opinion.
<h2>One little fact</h2>
When using the Local Cache, you can still use Kudu or FTP to work with the files. The only difference is that when you change something there, it will not be propagated to the instances unless you restart the Web App.

This brings a challenge with deployment - when you push new change to source control, the changes will be deployed, however the instances won't pick it up unless you restart the site. So how to automate this, so you can do this in a single push? The answer is simple - make use of <a href="https://www.visualstudio.com/team-services/">Visual Studio Team Services</a> and just add the site restart as final deployment step in the build definition. You can find out more about those in <a href="https://hajekj.net/2016/10/30/creating-a-build-agent-and-definition-for-php-in-vsts/">my previous article about PHP and DevOps with VSTS</a>.
<h1>What if I still need persistent storage?</h1>
If you need to use persistent storage with your application, there are still certain steps which can be taken to make the application faster - like enabling <a href="https://www.iis.net/downloads/microsoft/wincache-extension">WinCache</a> in PHP, which basically caches the bytecode in the memory and does bunch of other optimizations.