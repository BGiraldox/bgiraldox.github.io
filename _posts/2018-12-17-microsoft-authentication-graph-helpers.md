---
title: Microsoft Authentication Graph Helpers
date: 2018-12-17T09:00:49+01:00
author: Jan Hajek
permalink: /2018/12/17/microsoft-authentication-graph-helpers/
categories:
  - Microsoft
  - Microsoft Azure
  - Open Source
tags:
  - ADAL
  - ASP.NET Core
  - Azure AD
  - Microsoft Graph
  - MSAL
---

<p>I initially wanted to publish this code in summer already, but in the end, I didn't have enough time to spare to do so. Do you find yourself implementing Microsoft Graph, ADAL, MSAL etc. in many projects over and over again? If so, or you just want to have less work with that, read on!</p>

<!--more-->

<p>Since most of our projects are based on Microsoft Graph, Azure AD single sign on etc. we usually find ourselves writing a lot of similar code. Sometimes, our people tend to implement things different based on the sample they find. Each of Microsoft's samples even does things slightly differently. Doing things differently is not generally wrong or bad, but I like some consistency within projects. And for me, doing repetitive things all the time is just boring.</p>

<p>I decided to put together a common pattern for our most common implementation of Microsoft Graph, ADAL and Azure AD Graph along with a token cache. The library simply allows you to just hook everything into dependency injection container and use it, without much hassle.</p>

<p>It also allows you to more easily troubleshoot authentication implementations, which if you make bunch of AAD powered apps, will make your life much easier.</p>

<p>Since I pulled it out of an existing project, I removed few things along the way - like interfaces and dependencies on our internal code. However, what I would like to do in future, is to actually put it back in, in some sort of independent and more easy way than we have it internally right now.</p>

<p>I also have plans to put back support for Data Protection (protecting the tokens inside the Token Cache), support for MSAL alongside ADAL (so you can choose whatever you want to use) and of course few other enhancements like easier support for API flows (like on-behalf-of) and few others.</p>

<p>Once the library reaches a more production-like state, I plan to publish it to Nuget so that you can include it in your existing projects more easily!</p>

<p>This project is open to contributions, so feel free to start doing the job yourself, I will be glad to accept the PR!</p>

<p><strong><a href="https://github.com/TheNetworg/microsoft-authentication-graph-helpers">See the project now on GitHub!</a></strong></p>
