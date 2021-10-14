---
title: 'A Christmas Present&#8230; for you!'
date: 2018-12-24T08:00:24+01:00
author: Jan Hajek
permalink: /2018/12/24/a-christmas-present-for-you/
categories:
  - Microsoft
  - Microsoft Azure
  - Open Source
tags:
  - ADAL
  - ASP.NET Core
  - Authorization
  - Azure AD
  - Microsoft Graph
---

<p>About a week ago I announced the <a href="https://hajekj.net/?p=798">Microsoft Authentication Graph Helpers</a>. Since then, I decided to publish a small, but a useful enhancement to it - <em>AzureAdAuthorizationAttribute</em>&nbsp;and <em>AzureAdAuthorizationHandler</em>!</p>

<!--more-->

<p>Imagine the following: When you are writing an Azure AD backed application, you should leverage of few following principles for authorization:</p>
<!-- wp:list -->
<ul><li>Azure AD default roles (Global Administrator especially)</li><li><a href="https://docs.microsoft.com/en-us/azure/architecture/multitenant-identity/app-roles#roles-using-azure-ad-security-groups">Azure AD groups</a> (because not everyone has Azure AD Premium)</li><li><a href="https://docs.microsoft.com/en-us/azure/architecture/multitenant-identity/app-roles#roles-using-azure-ad-app-roles">Azure AD application roles</a></li></ul>

<p>Microsoft's 1st party applications leverage the default roles - so if you are a global administrator, you will have admin access to the application, but most 3rd party apps don't. Then there is the groups vs roles. In our applications, what we do is we implement the group assignment for everyone and the application roles get assigned behind the scenes by a WebJob (I will write a post about that in the future). Groups have been and still are (and likely to be) the unified security unit, so let's leverage them.</p>

<p>At the moment, if you want to leverage group authentication - most guides tell you to have all the <a href="https://techcommunity.microsoft.com/t5/Azure-Active-Directory-Identity/Azure-Active-Directory-now-with-Group-Claims-and-Application/ba-p/243862">groups passed to you in the id_token</a>. This is great, but wait - the groups are passed as claims, that means they are likely to end up in <a href="https://hajekj.net/2017/03/20/cookie-size-and-cookie-authentication-in-asp-net-core/">user's cookies</a>! If you are dealing with a small company, it may not be a problem at all, because people will not be in more than 20 groups, but what if the customer is a large corporation where every user is member of a large amount&nbsp; groups? Not that just you will have to carry the groups either in your token or in the <a href="https://docs.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.authentication.cookies.cookieauthenticationoptions.sessionstore?view=aspnetcore-2.1">session store</a>... Or if the amount of group is just too many - are you going to pull them from Microsoft Graph (or Azure AD Graph)&nbsp;<em>_claim_source</em>&nbsp;endpoint? Do you really need to store all those group in your user's session/cookies, because the application needs like 10 groups? And last and foremost - what if the user is removed from the group while using the application - will they loose access immediatelly or will they session need to expire first and new login triggered (this can be actually mitigated by using <a href="https://docs.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.authentication.cookies.cookieauthenticationevents.onvalidateprincipal?view=aspnetcore-2.1">CookieAuthentication's OnValidatePrincipal event</a>)? Most of the answers are likely to be no.</p>

<p>So how to do it properly (this is my personal "properly" view and I am sure there are other ways too)?</p>

<p>ASP.NET Core has this great feature called <a href="https://docs.microsoft.com/en-us/aspnet/core/security/authorization/policies?view=aspnetcore-2.2#authorization-handlers">Authorization Handlers</a>. These handlers allow you to perform authorization anywhere in the code, including <a href="https://docs.microsoft.com/en-us/aspnet/core/security/authorization/views?view=aspnetcore-2.2&amp;tabs=aspnetcore2x">view-based authorization</a> which is pretty cool! So what we decided to do was to create such handler for Azure AD - the handler accepts both Azure AD groups and roles as parameters.</p>

<p><em>Sidenote:</em>&nbsp;Implementing Azure AD Roles in multi-tenant apps<br>Since every role has it's own unique ID in Azure AD, the only common identifier for the role is its&nbsp;<em><a href="https://docs.microsoft.com/en-us/graph/api/directoryrole-get?view=graph-rest-1.0">roleTemplateId</a></em>&nbsp;which specifies the template from which the role has been activated. So in order to fetch roles, you need to do three things - get all the roles in the tenant, identify the correct one by its&nbsp;<em>roleTemplateId</em>&nbsp;and then pull all role members and verify whether the desired user is a member of that role.</p>

<p>From there, we also decided to implement an attribute which you can easily use to decorate your controllers and methods, to protect them very easily.</p>

<p><strong><a href="https://github.com/TheNetworg/microsoft-authentication-graph-helpers">So once again, go to the GitHub repo and start playing with it yourself!</a></strong></p>

<p><em>Sidenote on performance: </em>At the moment, all lookups to Microsoft Graph are real-time. As we proceed further with making the library more production ready, there will be optional caching implemented by using <a href="https://docs.microsoft.com/en-us/aspnet/core/performance/caching/memory">ASP.NET Core's in-memory cache</a>.</p>

<p><em>Sidenote on roles:</em>&nbsp;For performance sake, we currently only pull the first page of role members, so in case you were pulling the the GuestMembers role etc. you would have to count-in paging.</p>
