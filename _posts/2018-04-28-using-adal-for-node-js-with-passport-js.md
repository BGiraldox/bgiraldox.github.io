---
title: Using ADAL for Node.js with Passport.js
date: 2018-04-28T11:05:29+02:00
author: Jan Hajek
permalink: /2018/04/28/using-adal-for-node-js-with-passport-js/
categories:
  - Microsoft
  - Microsoft Azure
  - Open Source
tags:
  - ADAL
  - Azure AD
  - Node.js
  - Passport.js
---

<p>I haven't touch Node.js much lately, however, back while I have been working with it, I was always curious, how to leverage both <a href="http://www.passportjs.org/">Passport.js</a> with Azure AD and using <a href="https://www.npmjs.com/package/adal-node">ADAL for Node.js</a> together in order to have ADAL handle the tokens, refreshes, cache etc. In the end, I have come up with a solution which I am going to share below.</p>

<!--more-->

<p>So first off, you need to initialize <a href="http://www.passportjs.org/">Passport.js</a> to use the OIDC strategy from <a href="https://github.com/AzureAD/passport-azure-ad">passport-azure-ad</a> package:</p>

```javascript
passport.use(new OIDCStrategy({
    callbackURL: process.env.returnUrl,
    clientID: process.env.clientId,
    clientSecret: process.env.clientSecret,
    validateIssuer: true,
    identityMetadata: "https://login.microsoft.com/thenetw.org/.well-known/openid-configuration",
    skipUserProfile: true,
    responseType: "code id_token",
    responseMode: "form_post",
    passReqToCallback: true,
}, function verify(req, iss, sub, profile, jwtClaims, accessToken, refreshToken, params, done) {
    if (!profile.id) {
        return done(new Error("No valid user auth ID"), null);
    }

    profile.initialRefreshToken = refreshToken;
    profile.oid = jwtClaims.oid;
    done(null, profile);
}));
```

<p>Notice, that we save the&nbsp;<em>refreshToken</em> into the user's profile property as <em>initialRefreshToken</em>. This is quite important, because next, we are going to use it with ADAL for Node.js in order to exchange it for an actual access token. So next step is to initialize ADAL for Node.js:</p>

```javascript
const authContext = new AuthenticationContext("https://login.microsoftonline.com/thenetw.org", null, new MemoryCache());
```

<p>Note that we are initializing it with a <a href="https://github.com/AzureAD/azure-activedirectory-library-for-nodejs/blob/master/lib/memory-cache.js">MemoryCache</a>&nbsp;so that our credentials persist. The biggest issue with ADAL is that it doesn't cache tokens retreived by refresh token by default (maybe an idea for a <a href="https://github.com/AzureAD/azure-activedirectory-library-for-nodejs/issues/200">pull request</a>?), so we have to do a little workaround to force it into the cache.</p>

```javascript
// I suggest offloading this code to a separate .js script since it won't work with @ts-check or in TypeScript

const TokenRequest = require('./node_modules/adal-node/lib/token-request');

function obtainToken(user, resource, callback) {
    if (user.initialRefreshToken != undefined) {
        // Token has not been obtained by ADAL for Node.js, try to obtain it
        authContext.acquireTokenWithRefreshToken(
            user.initialRefreshToken,
            clientId,
            clientSecret,
            resource,
            function (error, result) {
                if (error) {
                    return callback(error);
                }
                else {
                    user.initialRefreshToken = null;
                    var tokenRequest = new TokenRequest(authContext._callContext, authContext, clientId, resource, null);
                    // Always refer to user by their objectId, this is useful when creating multi-tenant applications which support switching tenants
                    result.userId = user.oid;
                    return tokenRequest._addTokenIntoCache(result, callback);
                }
            });
    } else {
        // Token has been already obtained and is in memory cache, use it to obtain access token
        authContext.acquireToken(resource, user.oid, clientId, function (error, result) {
            if (error) {
                return callback(error);
            }
            else {
                return callback(null, result);
            }
        });
    }
}
```

<p>So how does this piece of code work? First, we have to include the <a href="https://github.com/AzureAD/azure-activedirectory-library-for-nodejs/blob/9aa56725c95981f5d8c461db5b81c7cc62884988/lib/token-request.js">token-request.js</a>&nbsp;in order to be able to access the token cache easily. Then, we take a look if this is our initial sign in - we have to exchange the refresh token for an access token and cache it or not. In case of having to create the entry in the cache, we have to&nbsp; create a <em>TokenRequest</em> object, initialize it and then call&nbsp; which does all the heavylifting. In the sample, I also slightly modify the initial token response to identify the user by their&nbsp;<em>objectId</em> within the Azure AD rather than using their&nbsp;<em>userPrincipalName</em> (note that if you are making a multi-tenant application and sharing the token cache, using&nbsp;<em>objectId</em>s or&nbsp;<em>userPrincipalName + tenantId</em> as an identifier is required for the cache to work properly). Once stored, every next request for the token goes through the cache (notice passing in the&nbsp;<em>user.oid</em> as user identifier - see explanation above).</p>

<p>The major difference between this approach and using ADAL with OpenID Connect Middleware in ASP.NET Core is that in case of Node.js the authorization code is redeemed for access and refresh tokens directly by the Passport.js (equivalent of OIDC middleware in ASP.NET Core) and then the refresh token is used to initialize ADAL where in ASP.NET Core, the authorization code redemption is already handled by ADAL. Either way, this is quite an obscure solution (yeah, accessing properties meant to be private is never good but it makes it work fine).</p>
