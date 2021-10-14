---
title: Creating a multi-tenant application which supports B2B users
date: 2017-07-24T09:00:20+02:00
author: Jan Hajek
permalink: /2017/07/24/creating-a-multi-tenant-application-which-supports-b2b-users/
image: /wp-content/uploads/2017/07/aad-b2c-multitenant_1.png
categories:
  - Microsoft
  - Microsoft Azure
tags:
  - ASP.NET Core
  - Azure AD
  - Azure AD B2B
  - Identity
  - Multi-tenant
---

<p>Since Microsoft's Azure AD got the Business-to-Business (B2B) functionality, it has enabled a broad variety of new scenarios to be developed. It for example makes sharing various resources and information within applications much more easier. Today we are going to investigate the way to build an application which is not only a multi-tenant one, but also supports the user to be member of multiple directories.</p>

<!--more-->

<p>Say we have a following scenario: Company A and Company B are both provisioned for the Application (just a sample application, a practical use case will be published soon as a commercial solution) which is multi-tenant. The Application allows users to collaborate on projects and share some sort of information within a team which is represented by an Office 365 Group. After some time, company A requires an employee from company B to work on the same project, so they are added to the Office 365 Group (provisioned as B2B guest), which allows them to access data stored on SharePoint, conversation in e-mail and also <a href="https://microsoftteams.uservoice.com/forums/555103-public/suggestions/16911109-external-access-and-federation">Microsoft Teams in future</a>. However, the guest user can only see the data of his home organization - company B.</p>

<h1>Obtaining list of organizations the guest user is member of</h1>

<p>The first example of how this should work which came to my mind was the <a href="https://portal.azure.com" target="_blank" rel="noopener">Azure Portal</a> and <a href="https://myapps.microsoft.com">Microsoft's My Apps portal</a>. All these portals allow the user to switch the tenant once they get signed in. Both these portals call their own API in order to obtain these information. You can find out more at <a href="https://stackoverflow.com/questions/45235572/getting-all-b2b-directories-user-is-member-of">this Stack Overflow thread</a>.</p>

<p><a href="https://stackoverflow.com/users/325697/philippe-signoret">Philippe</a>&nbsp;found an API available and supported by Microsoft -&nbsp;<a href="https://docs.microsoft.com/en-us/rest/api/resources/tenants"><em>https://management.azure.com/tenants</em></a>, which returns the&nbsp;<em>tenantIds</em> of those, which you are member of. Unfortunately, you are unable to obtain the tenant's name like from the endpoint below, so in order to get the name you would probably have to query graph on behalf of each directory and get its name which is too complicated in my opinion.</p>

<p>We are going to go with calling the Azure Portal's endpoint:&nbsp;<em>https://portal.azure.com/AzureHubs/api/tenants/List</em> - please note, like I already mentioned in the Stack Overflow's thread, it is an internal endpoint which isn't really documented or supported by Microsoft publicly, so you shouldn't use it in production applications. In order to call it, we have to authenticate (using ADAL) with Azure Service Management API (in preview) and then send HTTP POST request to the endpoint. It is then going to return data in following format:</p>

```json
{
    "failure": false,
    "tenants": [
        {
            "id": "67266d43-8de7-494d-9ed8-3d1bd3b3a764",
            "domainName": "thenetw.org",
            "displayName": "TheNetw.org s.r.o.",
            "isSignedInTenant": false
        },
        {
            "id": "40c29545-8bca-4f51-8689-48e6819200d2",
            "domainName": "hajekj.net",
            "displayName": "hajekj",
            "isSignedInTenant": true
        },
        {
            "id": "8026f5b9-c636-4dc9-9ad1-bb30a080c651",
            "domainName": "b2c.hajekj.net",
            "displayName": "hajekj-b2c",
            "isSignedInTenant": false
        }
    ]
}
```

<p>Now once we are able to list all the tenants the user is member of, we can now easily integrate this into our application. We now would go and create a similar selector to the one in Azure Portal.</p>

<h1>Switching between tenants</h1>

<p>Since the application is multi-tenant by nature, each organization should perform a sign-up (to grant the <a href="https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-devhowto-multi-tenant-overview#understanding-user-and-admin-consent">admin consent</a> if needed, create the application's instance etc.). Each information which we store organization-wide should contain a reference to the organization's tenant, preferably the organization tenant's ID (a GUID).</p>

<p>In order to distinguish, which user belongs to which organization, we then use the&nbsp;<em>tid</em> claim from the <a href="https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-token-and-claims#idtokens">id_token</a> issued by AAD (it is accessible in the ASP.NET Identity). Please don't use the organization's domain name (and if so, use the <em>*.onmicrosoft.com</em> one, since domains can change over the time, but the tenant id will stay).</p>

<p>A standard multi-tenant application redirects the user to the&nbsp;<em><a href="http://www.cloudidentity.com/blog/2014/08/26/the-common-endpoint-walks-like-a-tenant-talks-like-a-tenant-but-is-not-a-tenant/">common</a></em><a href="http://www.cloudidentity.com/blog/2014/08/26/the-common-endpoint-walks-like-a-tenant-talks-like-a-tenant-but-is-not-a-tenant/"> endpoint</a>, signs the user in and then validates the id_token's issuer, in this case, the&nbsp;tenant's id will always be the user's home tenant.</p>

<p>So how do we force the AAD to switch the tenant? We instruct the AAD to sign the user in with the correct tenant instead of the common endpoint! After that, the token will be issued by the correct tenant and we will be able to access the application (and also the directory, Microsoft Graph, etc.) of company A as a user from company B.</p>

<h1>Code sample</h1>

<p>So in order to show you a working sample, instead of just writing about it, I made a <strong><a href="https://github.com/hajekj/aad-b2b-multitenant" target="_blank" rel="noopener">sample which is available on GitHub</a></strong>. I will walk you through some of the code parts.</p>

<h2>Registering the application</h2>

<p>The very first thing which you need to do is <a href="https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-integrating-applications#adding-an-application">register the application with Azure Active Directory</a>. After that, you need to assign it permissions - for this specific sample, you need to assign permissions for&nbsp;<em>Windows Azure Service Management API</em>&nbsp;and also&nbsp;<em>Microsoft Graph</em> (sign in and view user's profile, read all user's basic profiles).</p>
<div class="wp-block-image"><figure class="aligncenter"><a href="/uploads/2017/07/aad-b2c-multitenant_2.png"><img src="/uploads/2017/07/aad-b2c-multitenant_2-300x102.png" alt="" class="wp-image-496"/></a></figure></div>
<p>Little bit more detailed information about registering the application is available in <a href="https://github.com/hajekj/aad-b2b-multitenant/blob/master/README.md">README of the project</a>.</p>

<h2>Listing user's tenants</h2>

<p>After we sign the user in, we need to obtain a token for the Azure Service Management API and query it for the tenant information, we parse the JSON returned into a model and then list all the available tenants. A note here - you should only display the tenants which have provisioned your application and granted the consent, otherwise the user will face errors during the sign-in, since the application is not going to be in the directory.</p>

<p>Code for obtaining the tenant list is <a href="https://github.com/hajekj/aad-b2b-multitenant/blob/master/aad-b2b-multitenant/Helpers/AzureServiceManagement.cs#L30">here</a>, I don't think it requires any comments.</p>
<div class="wp-block-image"><figure class="aligncenter"><a href="/uploads/2017/07/aad-b2c-multitenant_1.png"><img src="/uploads/2017/07/aad-b2c-multitenant_1-300x142.png" alt="" class="wp-image-487"/></a></figure></div>
<h2>Redirecting to the correct tenant</h2>

<p>By default, we sign in the user through the&nbsp;<em>common</em> endpoint. Later, if the user decides to switch the tenant, we call the <em>SignInAsync</em> again, but we pass in the tenant's id.</p>

```csharp
public async Task TenantSelect(Guid id)
{
    var state = new Dictionary<string, string> { { "tenantId", id.ToString() } };
    await HttpContext.Authentication.ChallengeAsync(OpenIdConnectDefaults.AuthenticationScheme, new AuthenticationProperties(state)
    {
        RedirectUri = Url.Action("TenantSelection", "Home")
    }, ChallengeBehavior.Unauthorized);
}
```

<p>After that, we catch the tenant id in the&nbsp;<em>OnRedirectToIdentityProvider</em> event and adjust the redirect URL accordingly. We also save the tenant id into the <em>state</em> which is passed along in the request, so that when the user is returned into the application. The <a href="https://github.com/aspnet/Security/blob/23da47617624cfed065cd1cdd552d34e5ea5b821/src/Microsoft.AspNetCore.Authentication.OpenIdConnect/OpenIdConnectHandler.cs#L220">state is encrypted</a> so it cannot be tampered with.</p>

```csharp
OnRedirectToIdentityProvider = (context) =>
{
    string tenantId;
context.Properties.Items.TryGetValue("tenantId", out tenantId);
    if(tenantId != null)
    {
        context.ProtocolMessage.IssuerAddress = context.ProtocolMessage.IssuerAddress.Replace("common", tenantId);
    }
    return Task.FromResult(0);
},
```

<h2>Accepting the response from AAD</h2>

<p>Like already mentioned above, we then have to handle the token validation on our own since the application is multi-tenant. We are going to pull the tenant id from the authentication token (or&nbsp;<em>tid</em> from the&nbsp;<em>id_token</em>, upon validating its signature) and compare it the desired issuer which we saved into the&nbsp;<em>state</em>. If the state is empty, we treat it as if the user has signed in through the&nbsp;<em>common</em> endpoint, so we only validate whether the organization exists.</p>

```csharp
OnTokenValidated = (context) =>
{
    string tenantId;
context.Properties.Items.TryGetValue("tenantId", out tenantId);
    if(tenantId != null)
    {
        string userTenantId = context.Ticket.Principal.FindFirst(AzureAdClaimTypes.TenantId)?.Value;
        if (userTenantId != tenantId)
        {
            throw new Exception($"You signed in with wrong tenant, expected: {tenantId} but got {userTenantId}");
        }
    }
    // You would validate whether the organization exists in the system etc.
    return Task.FromResult(0);
}
```

<h2>Beware of Token Cache</h2>

<p>When you use ADAL for authentication, you need to have some sort of Token Cache to persist the tokens and be able to request tokens for other services. The token cache samples usually use user's object id as cache identifier, which won't do any good when you switch tenants. You either need to change the identifier to also contain the tenant (eg.&nbsp;<em>tenantId_userId</em>) or for example in this example's case, when storing tokens in the Session, you simply separate them by&nbsp;<em>tenantId</em>.</p>

<h1>Summary</h1>

<p>And we are done. The user can now use the application as B2B guest with having the option to choose between the tenants which they want to use the application as.</p>

<p>Yet there is another scenario which comes to my mind - what if organization B didn't have the multi-tenant application provisioned? You would then need to sign the user in from the organization B and prompt him for tenant selection. It could require the need for the admin consent to be granted on behalf of organization B if you require some special permissions for Graph or other APIs (and if user permissions are not enough), however you would just bounce all the other users away with a tenant selection prompt which would be empty in their case since they wouldn't have access to any of the organization's instances.</p>

<p>For single tenant applications, B2B is going to work just fine since all the users are signed in directly with the correct Azure AD instance which then gives you correct token.</p>

<p>Alternative approach to listing user's tenants would be to give the user an option to specify the tenant which they want to authenticate to. All the user would have to know is the domain of one user who they are collaborating with, because then, you can <a href="http://www.cloudidentity.com/blog/2016/12/12/from-tenantid-to-domain/">get the tenant id from that domain</a>. After that, you just verify whether the tenant has signed up for your application, optionally verify whether the user is present in the directory before redirecting them (by using client credentials call to Graph) and if everything goes fine, you just redirect the user to proper AAD instance. However, it will probably be rather confusing for the user than just choosing from a simple dropdown.</p>

<p>I hope you will now have a better understanding of B2B usage in your multi-tenant applications. If there's something unclear about this approach, please let me know in comments or <a href="https://hajekj.net/about-me/">contact me directly</a>.</p>

<p>Lastly, you can expect one commercial application enabled with this functionality very soon! Stay tuned!</p>
