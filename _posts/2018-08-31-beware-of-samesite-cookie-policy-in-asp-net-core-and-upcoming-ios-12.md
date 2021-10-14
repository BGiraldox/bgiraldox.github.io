---
title: Beware of SameSite cookie policy in ASP.NET Core and upcoming iOS 12
date: 2018-08-31T08:00:11+02:00
author: Jan Hajek
permalink: /2018/08/31/beware-of-samesite-cookie-policy-in-asp-net-core-and-upcoming-ios-12/
categories:
  - Microsoft
  - Open Source
tags:
  - ASP.NET Core
  - Authentication
  - Cookies
  - iOS
---

<p>I have recently stumbled across a bug in iOS 12 preview which sort of breaks existing sites which make use of OpenID Connect middleware in ASP.NET Core 2.1.</p>

<!--more-->

<p>As iOS is coming closer to release, I decided to install it on my iPad for testing. After trying to access some our company's internal sites I always ended up in a redirect loop - basically AAD &gt; site &gt; AAD &gt; site etc. - unending.</p>

<p>After doing some research and borrowing my friend's MacBook for debugging the browser in iOS - I noticed that the browser was not persisting cookies from our site. After going a bit further, I also tried other sites - Microsoft's <a href="https://admin.teams.microsoft.com">https://admin.teams.microsoft.com</a> for example which ended up with the same issue.</p>

<p>After that, I have done some research with the cookie configuration and the result has surfaced - the <a href="https://www.owasp.org/index.php/SameSite">SameSite policy</a>&nbsp;in Cookie Authentication middleware! The default configuration of Cookie Authentication's cookie is setting it to&nbsp;<em>lax</em> which means that the browser will not accept cookies from the site if it was redirected by POST request to it.</p>

<p>SameSite policy is another measure at the browser's level to fight <a href="https://cs.wikipedia.org/wiki/Cross-site_request_forgery">CSRF attacks</a>. So now since we have the root cause, what can we do about it?</p>

<p>In order for your ASP.NET Core 2.1 application to work with iOS 12, you need to configure&nbsp;<em>CookiePolicyOptions</em> along with the&nbsp;<em>Cookie.SameSite</em> policy as well:</p>

```csharp
services.AddAuthentication(AzureADDefaults.AuthenticationScheme)
     .AddAzureAD(options => Configuration.Bind("AzureAd", options))
     .AddCookie(options => options.Cookie.SameSite = SameSiteMode.None);
// ...
app.UseCookiePolicy(new CookiePolicyOptions
{
   MinimumSameSitePolicy = SameSiteMode.None
});
```

<p>After that, your site is going to work again on iOS 12 again. I went to make some research and found out <a href="https://caniuse.com/#feat=same-site-cookie-attribute">that other major browsers implement</a> the SameSite cookie policy as well, however I couldn't reproduce the same issue there. Which made me wonder whether they are doing some sort of magic there or something is broken in iOS 12 so I went ahead and <a href="https://bugs.webkit.org/show_bug.cgi?id=188165">submitted a bug report to WebKit</a>. After couple of hours of waiting, Apple engineers reachead out and I provided them with credentials to reproduce the issue.</p>

<p>So far, I haven't heard back from them yet, however this issue is still present in iOS 12 Developer Preview 11 as of now. I am going to update this post if new info becomes available.</p>

<p><strong>Update 28SEP2018:</strong><br>You can alternatively set the response mode to send the response in the query instead of the post body like so:</p>

```csharp
.AddOpenIdConnect("AzureAD", options => {
    ...
    // Set response type to code and response type to query
    // to avoid the default response_mode=form_post
    // which causes issues with WebKit's handling of samesite=lax for the session cookie
    options.ResponseType = OpenIdConnectResponseType.Code;
    options.ResponseMode = OpenIdConnectResponseMode.Query;
};
```

<p>Just beware that with this solution you won't receive the user's id_token directly and if you are using ADAL to redeem the authorization code for tokens, you might run into issues.</p>
