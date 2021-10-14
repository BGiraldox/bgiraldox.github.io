---
title: Microsoft.Identity.Web Sneak Peek
date: 2020-03-25T09:00:00+02:00
author: Jan Hajek
categories:
  - Microsoft
  - Microsoft Azure
tags:
  - Azure AD
  - ASP.NET Core
---

About a year ago, I posted about [Microsoft Authentication Graph Helpers](/2018/12/17/microsoft-authentication-graph-helpers/). While it set an example on how to standardize identity setup in ASP.NET Core projects, Microsoft has done a way better job - by creating [Microsoft.Identity.Web](https://github.com/AzureAD/microsoft-identity-web).

Microsoft.Identity.Web has been around for quite a while (roughly 7 months at the time of writing) as part of [samples](https://github.com/Azure-Samples/active-directory-aspnetcore-webapp-openidconnect-v2/tree/master/Microsoft.Identity.Web). Recently, it has been moved to a [separate repository](https://github.com/AzureAD/microsoft-identity-web) and the commit messages in the sample actually [hint](https://github.com/Azure-Samples/active-directory-aspnetcore-webapp-openidconnect-v2/commit/d5166bb96f7e8f961fcc84fd9ce9c202117e2545) that it is soon to be released as a NuGet package which we all can make use of easily.

Generally, it focuses on the following issues:
- Easily add authentication via Azure AD or B2C to your application
- Easily protect your API with Azure AD or B2C
- Streamlined token caching (includes in-memory, session and distributed memory cache implementations which is super cool)
- Fully built on top of MSAL
- They include scope based authentication attributes which can be used in controllers
- Shortcuts for calling the On-Behalf-Of flow
- Support for conditional access from down stream APIs (yay, this is super cool too!)

What I love about this the most is that it covers most of the scenarios which you can encounter with Azure AD authentication in your web app.

Once it gets released as NuGet, I plan to port some of the functionality which I had in the Graph Helpers (the `AzureAdAuthorization` attribute for group-based/role-based authentication and `MicrosoftGraphFactory`) and try to have it as an extension to the Microsoft's package, since for example in our apps, we use group-based authorization quite heavily.

I really can't wait to see how this will evolve, especially if there are any plans to make the entire flow more friendly with Azure Functions.

Once Microsoft releases it as a NuGet package (v1), I plan to cover this library more deeply and post some experiences I had with moving existing applications to it.