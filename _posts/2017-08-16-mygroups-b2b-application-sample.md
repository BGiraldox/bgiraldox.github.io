---
title: 'MyGroups: B2B application sample!'
date: 2017-08-16T17:39:55+02:00
author: Jan Hajek
permalink: /2017/08/16/mygroups-b2b-application-sample/
categories:
  - Microsoft
  - Microsoft Azure
  - Open Source
tags:
  - ASP.NET Core
  - Azure AD
  - Azure AD B2B
  - Microsoft Graph
  - Office 365
  - Office 365 Groups
format: aside
---
Based on my <a href="https://hajekj.net/2017/07/24/creating-a-multi-tenant-application-which-supports-b2b-users/">previous post about B2B guest access to application</a>, I made another sample called <a href="https://github.com/TheNetworg/MyGroups">MyGroups</a>. I think it demonstrates practical usage of both B2B guest access, Office 365 Groups and Microsoft Graph.

MyGroups can be used to display all Office 365 Groups to which the user has been added and additionally list direct links to the group's SharePoint site, which is something we have been in need of internally within our <a href="https://thenetw.org">company</a>.

In the <a href="https://github.com/TheNetworg/MyGroups/blob/master/MyGroups/Controllers/HomeController.cs#L38">HomeController</a>, you can find the call which is being made to Microsoft Graph's groups endpoint to get the group's site information - it is being made in parallel to make the request shorter for the user - generally, on average, it took about 1 second to get the site details of each group.

If you would like to use the code, just go ahead and <a href="https://github.com/TheNetworg/MyGroups"><strong>grab the source from GitHub</strong></a>!