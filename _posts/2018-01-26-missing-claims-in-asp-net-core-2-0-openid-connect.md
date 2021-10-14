---
title: Missing claims in ASP.NET Core 2.0 OpenID Connect
date: 2018-01-26T10:00:53+01:00
author: Jan Hajek
permalink: /2018/01/26/missing-claims-in-asp-net-core-2-0-openid-connect/
categories:
  - Microsoft
  - Microsoft Azure
  - Open Source
tags:
  - .NET
  - ASP.NET Core
  - Authentication
  - Azure AD
---

<p>We have been migrating couple of projects to ASP.NET Core 2.0 recently. Amongst the major changes in ASP.NET Core 2.0, probably the biggest change has been done in the Authentication. I have written an article about <a href="https://hajekj.net/2017/03/20/cookie-size-and-cookie-authentication-in-asp-net-core/">cookie size in ASP.NET Core</a>&nbsp;which explains the basic issue with too many claims in the identity. ASP.NET Core 2.0 OIDC addresses this by removing some of the token values from the identity on the background.</p>

<!--more-->

<p>Honestly, I wouldn't have noticed this issue unless the project used <a href="https://hajekj.net/2017/03/06/forcing-reauthentication-with-azure-ad/">reauthentication with Azure AD</a>. After migrating to ASP.NET Core 2.0, the reauthentication basically stopped working and was constantly prompting for authentication again, again and again in a loop. After a while of debugging I noticed that the&nbsp;<em>auth_time</em> property is missing from the claims!</p>

<p>After looking through the JWT token's claims, I was sure that the issue was in the middleware itself. Going through the <a href="https://github.com/aspnet/Security/">source code on GitHub</a>, I found that some of the claims are being automatically removed including&nbsp;<em>auth_time</em>. You can see the code <a href="https://github.com/aspnet/Security/blob/dev/src/Microsoft.AspNetCore.Authentication.OpenIdConnect/OpenIdConnectOptions.cs#L58">here</a>.</p>

<p>So the solution? Quite simple, in the OIDC configuration, just specify which claims you want to keep or additional claims to remove, like so:</p>

```csharp
.AddOpenIdConnect(options =>
{
    ...
    options.ClaimActions.Remove("auth_time");
    ...
});
```

<p>By using this method, you can include other token values which would have been otherwise omitted by the default configuration. Those include:</p>

<ul><li>nonce</li><li>aud</li><li>azp</li><li>acr</li><li>amr</li><li>iss</li><li>iat</li><li>nbf</li><li>exp</li><li>at_hash</li><li>c_hash</li><li>auth_time</li><li>ipaddr</li><li>platf</li><li>ver</li></ul>
