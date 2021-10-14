---
title: To single sign out or not to?
date: 2017-02-27T07:40:50+01:00
author: Jan Hajek
permalink: /2017/02/27/to-single-sign-out-or-not-to/
image: /wp-content/uploads/2017/02/aad_signout-1200x650.png
categories:
  - Microsoft
  - Microsoft Azure
tags:
  - ADFS
  - Azure AD
  - Single Sign On
  - Single Sign Out
  - SSO
---

<p>When building a Line Of Business (LOB) application, you are usually better off with implementing the customer's current Identity Provider (IdP) which could be ADFS, Azure AD or some others. The benefits are clear - users use a single account for all the services, authenticate through a central point, can be more protected by conditional access policies and as a great benefit, you can leverage the existing data through Microsoft Graph for example. So while it is obvious why to use Single Sign On in your application, a little bit less discussed topic is about Single Sign Out (SLO).</p>

<!--more-->

<p>So while the benefits of using Single Sign On are obvious and there many articles about it, it way less discussed topic is Single Sign Out - the process of signing out the user from all web application which use the same IdP.</p>

<p>This, of course is most applicable with LOB applications, with most of the consumer applications, it would be a lot confusing - you sign in to Feedly with Facebook, then logout from Feedly - should you be signed out from Facebook as well? Or when you sign out from Facebook, should you be signed out from Feedly? Most of the users in consumer scenarios don't expect that.</p>

<h1>Basic single sign out</h1>

<p>With business applications, this is different. Take Office 365 for example. When you sign out from Exchange Online (OWA), you automatically get signed out from SharePoint Online and other Office 365 related services.</p>

<p>Now when you are making an LOB application, it should follow the same principle - when the user signs out from the application, he should be automatically signed out from Office 365 and other 3rd party applications. Achieving single sign out from your application and Office 365 (and AAD of course) is fairly simple, you simply redirect the user to a signout URL like this (specified as <em>end_session_endpoint</em> in the&nbsp;<a href="https://login.microsoftonline.com/common/.well-known/openid-configuration">OIDC metadata</a>):</p>
<pre class="wp-block-preformatted">https://login.microsoftonline.com/&lt;tenant or common&gt;/oauth2/logout?post_logout_redirect_uri=&lt;optional_uri&gt;</pre>
<p>which signs them out from Azure AD (and delete the application cookies or session as well, so the user gets logged out from your application too) or simply call something like this from your ASP.NET code in the logout method:</p>

```csharp
await HttpContext.Authentication.SignOutAsync(OpenIdConnectDefaults.AuthenticationScheme);
await HttpContext.Authentication.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
```

<p>This is the very basic method of single sign out - user signed out from both your application and the IdP. This however doesn't get the user signed out from other 3rd party applications.</p>

<p>One of the nice examples of how SLO should be done is Visual Studio Team Services logout page, which logs you out from all possible instances:</p>
<div class="wp-block-image"><figure class="aligncenter"><a href="/uploads/2017/02/vsts_slo.png"><img src="/uploads/2017/02/vsts_slo-300x163.png" alt="" class="wp-image-210"/></a></figure></div>
<p>This is achieved through something called front-channel SLO (I will write about it later).</p>

<p>Honorable mention for SLO implementation is SAML protocol, where for example Azure AD event <a href="https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-single-sign-out-protocol-reference">implements the support as well</a>. However, I don't want to spend much time with SAML and we will focus on modern authentication protocols - especially OpenID Connect, because that's where all the action's gonna be.</p>

<h1>OpenID Connect Options (RFCs)</h1>

<p>OpenID Connect itself currently presents us with three options for how the single sign out can be handled: front-channel, back-channel and session managament. I will go over all of those briefly below.</p>

<h2>Front-channel</h2>

<p>The front-channel (<a href="http://openid.net/specs/openid-connect-frontchannel-1_0.html">RFC</a>) is a method which you would use when you have a regular server-side backend (in PHP, ASP.NET and similar). When editing your application's settings, you add a Logout URL which then gets embedded to the signout page of the IdP (usually by <em>iframe</em>). This is what happens when logging out from VSTS as well. This allows your server to delete the cookies set on client, delete the session etc.</p>

<p>You could for example handle it by simply calling in your controller for ending the session:</p>

```csharp
await HttpContext.Authentication.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
```

<p>Note that you don't sign out OpenID Connect middleware, because the IdP has already performed the signout.</p>
<blockquote class="wp-block-quote"><p>It is usually called an endsession route, since it only terminates the session at the server and doesn't redirect the user to the IdP logout.</p></blockquote>
<p>Additionally, the request should also contain the session ID so you can make sure that the call is really valid and ment for the current user's session.</p>

<p><strong>Update (November 2017):</strong> When using ASP.NET Core OIDC middleware, you don't have to create a custom route where you handle the Sign Out, but you can point the server to <em>/signout-oidc</em> path, which will get picked up by the middleware and the sign out will be handled for you (including session validation). You can take a look into the <a href="https://github.com/aspnet/Security/blob/bd07f8b683ce793490d108b2310fa6112953d172/src/Microsoft.AspNetCore.Authentication.OpenIdConnect/OpenIdConnectHandler.cs#L91">source for reference</a>.</p>

<h2>Back-channel</h2>

<p>The back-channel (<a href="https://openid.net/specs/openid-connect-backchannel-1_0.html">RFC</a>) is quite similar like the front-channel, except it doesn't get called by the client from the logout page of the IdP. This means, that the IdP calls your endpoint and provides it with a JWT which you then <a href="https://openid.net/specs/openid-connect-backchannel-1_0.html#Validation">validate</a>&nbsp;and from the information provided, you invalidate the specified session.</p>

<h2>Session managament</h2>

<p>Last but not least is the session management (<a href="https://openid.net/specs/openid-connect-session-1_0.html">RFC</a>). This was designed to be mostly used with Single Page Applications hence it uses JavaScript to validate the current session. You simply it&nbsp;the from the <a href="https://login.microsoftonline.com/common/.well-known/openid-configuration">OIDC metadata</a>. Inside the&nbsp;<em>iframe</em> a check is performed against user's session at the IdP and if it has changed (user logged out, logged in as another user, ...), your code gets notified back by <em><a href="https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage">postMessage</a></em>, they should be sent to the&nbsp;<em>end_session_endpoint</em> from the metadata as well. This should be done periodically (the RFC sample has interval of 3 seconds). It is also worth noting, that this usually works alongside with the front-channel logout as well.</p>

<h1>Doing this in Azure AD</h1>

<p>The above is the explanation for what the OIDC RFCs specify, however let's take a look at how we can leverage this with Azure Active Directory:</p>

<p>At the time of writing this article, the best way of handling SLO in your application is by using the session management. That means that in every single page you render&nbsp;on the server, you include a tiny bit of JavaScript code and an iframe which in case of change redirect the user to the end session endpoint of your application.</p>

<p>While you can specify a Logout URL for your application, it doesn't seem to have any effect on the sign out process - it doesn't get triggered by either front-channel or back-channel calls.&nbsp;<strong>However</strong>, when you look into the code of the Azure AD logout page (<strong>CLICKING THIS WILL LOG YOU OUT:&nbsp;</strong><a href="https://login.microsoftonline.com/common/oauth2/logout">https://login.microsoftonline.com/common/oauth2/logout</a>), there is some JavaScript code which suggests support of the front-channel coming to us (no idea when tho). Also note the highlighted line which sets the constant result to success :).</p>

```javascript
function TryCompleteSignout() {
    var signoutComplete = true;
    if (signoutComplete) {
        CompleteSignout();
    }
}
function CompleteSignout() {
    var statusSuccess = true;
    CompleteSignoutRender(statusSuccess);
}
function CompleteSignoutRender(signoutSuccessful) {
    signoutSuccessful = signoutSuccessful && true;

    if (!signoutSuccessful) {

        RenderSignoutFailure();

    } else {
        RenderSignoutSuccess();

        setTimeout('InitiatorRedirect()', 1000);
    }
}
function RenderSignoutSuccess() {
    User.UpdateLogo('', "You signed out of your account");
    var signoutStatusMessage = $('#SignOutStatusMessage');
    signoutStatusMessage.text("It\u0027s a good idea to close all browser windows.");
    signoutStatusMessage.show();
}
function RenderSignoutFailure() {
    User.UpdateLogo('', 'Hmm... we\u0027re having trouble signing you out.');
    var signoutStatusMessage = $('#SignOutStatusMessage');
    signoutStatusMessage.text("You may still be signed in to some applications. Close your browser to finish signing out.");
    signoutStatusMessage.show();
}
function WriteSignoutFailedCookie() {
    document.cookie = "SOS" + "=1; path=/";
}
function InitiatorRedirect() { }
```

<p>So this is it, many happy single sign outs! Also if you are looking into implementing the SLO to your ASP.NET application, the <a href="https://github.com/Azure-Samples/active-directory-dotnet-web-single-sign-out">official sample</a> might come in handy.</p>
