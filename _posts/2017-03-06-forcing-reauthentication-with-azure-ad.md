---
title: Forcing reauthentication with Azure AD
date: 2017-03-06T07:40:13+01:00
author: Jan Hajek
permalink: /2017/03/06/forcing-reauthentication-with-azure-ad/
categories:
  - Microsoft
  - Microsoft Azure
tags:
  - ASP.NET Core
  - Azure AD
  - Single Sign On
  - SSO
---

<p>While working on a project, I stumbled upon an interesting issue - how to&nbsp;force the user to reauthenticate in an application - for example when accessing some sensitive information? While it may seem quite straightforward from the documentation of Azure AD, it is not that simple, and if you are using&nbsp;<em>prompt=login</em> to reauthenticate the user, I quite suggest you read on.</p>

<!--more-->

<h1>prompt=login and why it is bad</h1>

<p>So when I started solving the issue, I looked into the <a href="https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-protocols-oauth-code">Authorization Flow documentation</a>&nbsp;and found the following: when you add a&nbsp;<em>prompt=login</em> into the authorization URL, will make the user reauthenticate - so I assumed: <em>Hey! This is exactly what I need, let's use it.</em></p>

<p>However after implementing this (very simple and straightforward), I thought, let's try to be a bad user and avoid reauthentication! So when the user got forwarded to the authorization URL and prompted for their password, I removed the&nbsp;<em>prompt=login</em> from the URL, refreshed the page and believe it or not, I was signed into the application and seen the "sensitive" information!</p>

<p>It was time to dig a bit deeper into this on the token level. So after logging in with&nbsp;<em>prompt=login</em> and without it, I discovered that the tokens are basically the same. So despites the user entering their credentials, there was no way to actually authenticate whether they really did it.&nbsp;<strong>So while visually this did what you wanted the regular user to see, on the background, there were no measures to detect what happened.</strong></p>

<p>Luckily, I found solution quite quickly...</p>

<h1>Doing it the right way...</h1>

<p>So after few desperate Google searches, I took a look into the <a href="http://openid.net/specs/openid-connect-core-1_0.html">OIDC RFC</a>&nbsp;and found out, that you can append&nbsp;<em>max_age=&lt;time since password was last entered&gt;</em> to the authorization URL (or just put 0 to force password authentication at all times). So once user gets redirected to the URL, they will be presented with an information to login again:</p>
<div class="wp-block-image"><figure class="aligncenter"><a href="/uploads/2017/02/max_age.png"><img src="/uploads/2017/02/max_age-285x300.png" alt="" class="wp-image-221"/></a></figure></div>
<p>Now this looked better then just the screen with&nbsp;<em>prompt=login</em> which shown plain login screen without account selection and information about what happened which is quite important from the user prospective.</p>

<p>But this was just cosmetic, does it let us distinguish the situation on the backend?&nbsp;Yes! When the user is returned after authentication to your application, the&nbsp;<em>id_token</em> is going to contain a claim called&nbsp;<em>auth_time</em>. This claim holds the Unix timestamp of when the user entered the password last. The last thing to do was to validate this information.</p>

<h2>Validating auth_time</h2>

<p>Validation is quite simple, the RFC, specifies it like this:&nbsp;<em>check the auth_time Claim value and request re-authentication if it determines too much time has elapsed since the last End-User authentication.</em></p>

<p>Which I believe is quite clear explanation of how to do this.</p>

<h1>Pratical use with ASP.NET Core</h1>

<p>For the last part, I am going to include few code samples of how to achieve this in ASP.NET Core with&nbsp;<a href="https://www.nuget.org/packages/Microsoft.AspNetCore.Authentication.OpenIdConnect/">OpenIdConnect middleware</a>:</p>

<h2>Forcing authentication</h2>

<p>First, you are going to have to modify the&nbsp;<em>OpenIdConnectEvents</em> in order to be able to redirect the user to the correct URL. This is done by modifying context of&nbsp;<em>OnRedirectToIdentityProvider</em>:</p>

```csharp
// ...
OnRedirectToIdentityProvider = context =>
{
    if (context.ShouldReauthenticate())
    {
        context.ProtocolMessage.MaxAge = "0"; // <time since last authentication or 0>;
    }
    return Task.FromResult(0);
},
// ...
```

<p><em>ShouldReauthenticate</em> is an extension method of <em>RedirectContext</em>, which decides (based on current state, which we will set later) whether the user should reauthenticate or not:</p>

```csharp
internal static bool ShouldReauthenticate(this RedirectContext context)
{
    context.Properties.Items.TryGetValue("reauthenticate", out string reauthenticate);

    bool shouldReauthenticate = false;
    if (reauthenticate != null && !bool.TryParse(reauthenticate, out shouldReauthenticate))
    {
        throw new InvalidOperationException($"'{reauthenticate}' is an invalid boolean value");
    }

    return shouldReauthenticate;
}
```

<p>Next, you can test this by calling&nbsp;<em>ChallengeAsync</em> in your controller. Before that, you have to pass it a state information for the user to be reathenticated.</p>

```csharp
var state = new Dictionary<string, string> { { "reauthenticate", "true" } };
await HttpContext.Authentication.ChallengeAsync(OpenIdConnectDefaults.AuthenticationScheme, new AuthenticationProperties(state)
{
    RedirectUri = "/sensitivePage"
}, ChallengeBehavior.Unauthorized);
```

<p><em>Note that we are also passing ChallengeBehavior.Unauthorized</em><em> there, which results in the request not failing with Forbidden, but allows it to proceed (this took me a while to figure out, solution found on <a href="https://github.com/aspnet/Security/issues/912">GitHub</a>).</em></p>

<p>After this, you have successfully set up the redirect along with the reauthentication enforcement. Next up is the token validation, which is very important.</p>

<h2>id_token validation</h2>

<p>We are going to validate the id_token's <em>auth_time</em> claim&nbsp;within the specific controller, which in my opinion makes the most sense. We are going to achieve that by implementing&nbsp;<em>Attribute</em> and&nbsp;<em>IResourceFilter</em>, to create our own attribute filter.</p>

```csharp
public class RequireReauthenticationAttribute : Attribute, IAsyncResourceFilter
{
    private int _timeElapsedSinceLast;
    public RequireReauthenticationAttribute(int timeElapsedSinceLast)
    {
        _timeElapsedSinceLast = timeElapsedSinceLast;
    }
    public async Task OnResourceExecutionAsync(ResourceExecutingContext context, ResourceExecutionDelegate next)
    {
        var foundAuthTime = int.TryParse(context.HttpContext.User.FindFirst(AppClaimTypes.AuthTime)?.Value, out int authTime);

        if (foundAuthTime && DateTime.UtcNow.ToUnixTimestamp() - authTime < _timeElapsedSinceLast)
        {
            await next();
        }
        else
        {
            var state = new Dictionary<string, string> { { "reauthenticate", "true" } };
            await context.HttpContext.Authentication.ChallengeAsync(OpenIdConnectDefaults.AuthenticationScheme, new AuthenticationProperties(state)
            {
                RedirectUri = context.HttpContext.Request.Path
            }, ChallengeBehavior.Unauthorized);
        }
    }
}
```

<p>So now we can is it in our controller as easy as putting&nbsp;<em>[RequireReauthentication(&lt;maximum time elapsed since last authentication&gt;)]</em> above a method or entire controller class.</p>

<p><em>This code also works great with slight modifications with <a href="https://www.dotvvm.com/">DotVVM framework</a>.</em></p>

<p>And this is it. Now we have reauthentication implemented&nbsp;correctly while making sure that the reauthentication has really happened.</p>

<h1>Requiring Multi Factor Authentication</h1>

<p>Just additional update: When you want to require the user to use MFA for login session, you can modify the code above and instead of checking the authentication time you will be check for authentication method reference in the token. If it contains&nbsp;<em>mfa</em> it means that user has used Multi Factor Authentication for this session, additionally if it contains&nbsp;<em>pwd</em> it also means the user authenticated using their password.</p>

<p>In order to force MFA to be used, you have to append&nbsp;<em>amr_values=mfa</em> to the authorization URL for the user. To do this with OpenIdConnectMiddleware in ASP.NET Core, you have to do following in place for setting <em>MaxAuth</em>:</p>

```csharp
context.ProtocolMessage.SetParameter("amr_values", "mfa");
```
