---
title: Cookie size and cookie authentication in ASP.NET Core
date: 2017-03-20T07:40:03+01:00
author: Jan Hajek
permalink: /2017/03/20/cookie-size-and-cookie-authentication-in-asp-net-core/
categories:
  - Microsoft
  - Open Source
tags:
  - ASP.NET Core
  - Authentication
  - Cookies
  - Safari
---
When I was writing a web application with ASP.NET Core with Azure AD and Microsoft Graph, I ran into a very interesting issue - the identity cookies would get really large (8 kB or more in chunked authentication cookies) and therefore all the requests to the site would contain this much data in headers. This was bearable because it just "worked" but then I tried accessing the site from Safari on a MacBook or an iPhone and the server would return errors when trying to rebuild the user's identity.

<!--more-->
<h1>ASP.NET Core Cookie Authentication</h1>
I will briefly explain how the authentication works with ASP.NET Cookie Authentication which is quite essential for understanding both core issue and solution.

When user signs in (or is signed in using for example <a href="https://www.nuget.org/packages/Microsoft.AspNetCore.Authentication.OpenIdConnect/">OpenIdConnect</a>) or simply by calling <em>HttpContext.Authentication.SignInAsync</em>, new ticket, containing specified claims, properties and some more info (see <a href="https://docs.microsoft.com/en-us/aspnet/core/api/microsoft.aspnetcore.authentication.authenticationticket"><em>AuthenticationTicket</em></a> for more information) is created, serialized, encrypted, split into multiple cookies and sent to the client.
<h2>Cookie serialization</h2>
In order to understand the problem correctly, we have to dive a little bit deeper. When a ticket is serialized and encrypted (so it cannot be tampered with on client side), it is then by default passed into <em><a href="https://github.com/aspnet/Security/blob/dev/shared/Microsoft.AspNetCore.ChunkingCookieManager.Sources/ChunkingCookieManager.cs">ChunkingCookieManager</a></em> which then splits the encrypted and serialized ticket into multiple parts (chunks, each is a single cookie) so we don't hit the <a href="http://browsercookielimits.squawky.net/">cookie limits in browsers</a> and appends it as a cookie to the response.
<h2>Active Directory Authentication Library</h2>
This looks really nice and generally works. In the intro, I also mentioned that I am using Azure AD for authentication (through OpenIdConnect middleware) and then call Microsoft Graph with the access token we get for the user. In order to easily work with tokens (which currently the OpenIdConnect middleware doesn't provide) like refreshing the token when expired, I am using <a href="https://www.nuget.org/packages/Microsoft.IdentityModel.Clients.ActiveDirectory/">Active Directory Authentication Library</a> (ADAL) which handles the tokens after OpenIdConnect middleware signs the user in. ADAL is using token cache (read more <a href="https://docs.microsoft.com/en-us/azure/architecture/multitenant-identity/token-cache">here</a>) to store the tokens - the store can be for example Redis, SQL server, Table Storage, session, cookies etc. In my case, the token cache is implemented to use <em>AuthenticationProperties</em> (part of <em>AuthenticationTicket</em>) for the token store. This was done because we didn't want to have to maintain any other storage while keeping the application completely stateless (thanks to cookies). So while implementing the token cache to store the information to somewhere else

This results in the ticket containing both access and refresh tokens and additionally some related metadata. In the end, the ticket is split into 3 chunks, altogether around 10 kB.
<blockquote>Similar issue would occur if you simply saved the tokens (<i><a href="https://docs.microsoft.com/en-us/aspnet/core/api/microsoft.aspnetcore.builder.remoteauthenticationoptions#Microsoft_AspNetCore_Builder_RemoteAuthenticationOptions_SaveTokens">SaveTokens</a> = true</i>) directly from the OIDC middleware, except that you will have harder time working with the token (refreshing, use of multipurpose refresh token and so on).</blockquote>
<h2>Making the AuthenticationTicket smaller</h2>
So in order to reduce the size of the ticket (at that time, I wasn't aware of the Safari related issue - more on that later), I decided to transform the claims and remove some of those, which are not used. When using OIDC middleware, the claims are populated from the <em>id_token</em> which can contain both useful and useless information (not really useless, but useless for having them stored in the claims) - so you simply create a claims transformer which executes <em><a href="https://docs.microsoft.com/en-us/aspnet/core/api/microsoft.aspnetcore.authentication.cookies.cookieauthenticationevents#Microsoft_AspNetCore_Authentication_Cookies_CookieAuthenticationEvents_OnSigningIn">OnSigningIn</a></em> event of Cookie Middleware. Second reduction can be done by shortening the claim names. Most of the claim names are in format of a long URL like <em>http://schemas.microsoft.com/identity/claims/tenantid</em> which I suppose is from the XML age. So when for example transforming above claim name, you could have the result as <em>TenantId</em> which will save you 45 characters from the ticket.
<h1>Why does the cookie size matter?</h1>
Whenever you send a cookie to the client, it is going to be sent to the server with every request until you remove the cookie or it expires. With small cookies, everything is fine, but when your cookies have 10 kB in size, it makes the request grow quite fast. On cable or Wi-Fi connections, this may be fine but when you are on your phone, it might have negative effect on user's FUP limit or the request time.
<h2>nginx and maximum header length</h2>
Second issue is that certain web servers (like <a href="http://nginx.org/en/docs/http/ngx_http_core_module.html#large_client_header_buffers">nginx</a>) limit the maximum length of headers sent to the server and if there are too many large cookies, the server will simply refuse the request and return an error.

[gallery type="slideshow" link="file" columns="2" size="large" ids="251,252"]
<h2>Safari issue</h2>
Third issue is that certain browsers (so far I know that Safari is doing this) will simply omit some the cookies if the request gets too large which can cause a lot of issues which might be hard to troubleshoot.

To clear this up, the browser accepts the cookies, you can see them in the developer tools, but some of them are omitted from the request.
<blockquote>At the time of writing, Safari on OS X, iPhone and Chrome on iPhone seem to be affected by this issue. When using Chrome on OS X everything works fine.</blockquote>
While writing this article, I sort of realized that this behavior might be in place to prevent nginx (and possibly other web servers) from throwing header length related errors - still, I wasn't able to find out any sort of documentation about this behavior of Safari.

I currently have a <a href="https://bugs.webkit.org/show_bug.cgi?id=169173">ticket open</a> about this issue.

<strong>UPDATE 19JUN2017:</strong> Apple seems to have fixed this issue in iOS 11 beta.
<h3>What does the RFC say?</h3>
<a href="https://tools.ietf.org/html/rfc6265#section-6.1">HTTP State Management RFC</a> doesn't have any specific number or size of cookies, but instead it provides a recommendation of how many cookies should be accepted. By doing simple math (50 cookies * 4096 b each) the browser should be able to work with cookies of total ~200 kB which doesn't happened in this case.
<h1>Solution</h1>
So while I think this is a bug in Safari (WebKit rather) it might take some time to have this fixed (if it ever gets accepted as a bug and fixed) since it could break current sites running on nginx. However, since Chrome and Edge users don't experience similar issues what is there to loose? We still wasn't our application to work no matter if WebKit does something about this or not.

The first idea that popped up was to implement ADAL's token cache to store the tokens to a store different from the authentication ticket. This however brings up couple of issues - the token store is decoupled from the session, so whenever the user clears their cookies or simply the cookies expire, there would need to be a sort of "garbage collector" deleting old entries from the token cache. Second issue is that if the token cache got wiped, all users would have to reauthenticate which would mean implementing some more logic into the login process, more specifically the validation. So this appeared rather complicated to me so I was on the hunt for something more simple.
<h2>Sessions</h2>
I knew exactly what I was looking for - from my experience in PHP - where it is very common to use sessions for logins and much more, I was on the way to look for a solution in this direction. The general issue with sessions is that it makes your application stateful - that means that you need to have some sort of storage where the sessions will be saved (in-memory cache, SQL, Redis, Table Storage, file system, ...). When I looked into <a href="https://docs.microsoft.com/en-us/aspnet/core/fundamentals/app-state">session documentation</a>, I discovered that docs don't advise to use cookies (see the big red warning in the docs).

This looked like the only viable solution - so I tried to figure out what it would take to implement this - and I was quite surprised - I would have to basically reimplement the Cookie Authentication to use the session store, which seems probably even harder than decoupling the token cache from the authentication ticket. This wasn't the way I really wanted to handle this.
<blockquote>Stateful vs. Stateless - there are a lot of discussions about what is better and what should be used when. Generally, I think that if you write a stateful application with scalable storage, you shouldn't run into many issues even if your application goes really popular and big.</blockquote>
<h2>SessionStore</h2>
Luckily, when I was digging through the source code of <a href="https://github.com/aspnet/Security/tree/22d2fe99c6fd9806b36025399a217a3a8b4e50f4/src/Microsoft.AspNetCore.Authentication.Cookies">Cookie Authentication</a>, I discovered that <em>CookieAuthenticationOptions</em> have a property called <a href="https://docs.microsoft.com/en-us/aspnet/core/api/microsoft.aspnetcore.builder.cookieauthenticationoptions#Microsoft_AspNetCore_Builder_CookieAuthenticationOptions_SessionStore"><em>SessionStore</em></a>. <strong>Bingo!</strong> This property does exactly what I have been looking for - it allows you to implement <em><a href="https://docs.microsoft.com/en-us/aspnet/core/api/microsoft.aspnetcore.authentication.cookies.iticketstore">ITicketStore</a></em> interface and then stores the actual ticket into it while sending only a "session id" to the client in an encrypted cookie.

On the topic of numbers, the cookie sent to the client now has about 350 bytes and the rest is stored on the server, so Safari can open the page with no issue.

An example implementation using <a href="https://docs.microsoft.com/en-us/aspnet/core/performance/caching/memory">memory cache</a> can be found in the official <a href="https://github.com/aspnet/Security/blob/22d2fe99c6fd9806b36025399a217a3a8b4e50f4/samples/CookieSessionSample/MemoryCacheTicketStore.cs">GitHub samples</a>. Now you can implement your own authentication store very easily and drastically cut the amount of cookies you are sending to the client. It also has a great feature compared to using a separate token cache - it allows you to set an expiration, so when the cookie should've expired on the client the session data will be removed as well.