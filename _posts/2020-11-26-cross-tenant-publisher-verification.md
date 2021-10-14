---
title: Cross-tenant publisher verification
date: 2020-11-26T19:00:00+02:00
author: Jan Hajek
categories:
  - Microsoft
  - Microsoft Azure
tags:
  - Azure AD
  - Microsoft Partner
  - Cloudflare Workers
---

Starting in November 2020, Microsoft [started limiting applications](https://techcommunity.microsoft.com/t5/azure-active-directory-identity/publisher-verification-and-app-consent-policies-are-now/ba-p/1257374) to which end-users can consent to. The setup is fairly simple if you use a single tenant for everything, but in case you use multiple tenants (for production workloads for example), this gets slightly more complicated.

> Thanks to [Bob German](https://twitter.com/Bob1German/status/1329127741023805440) for writing [the awesome article](https://blog.thoughtstuff.co.uk/2020/11/end-users-can-no-longer-grant-consent-to-unverified-multi-tenant-apps-what-this-means-for-you/) about what this actually means for you.

Our setup is, that we have our company's tenant (`thenetworg.onmicrosoft.com` - shortly `thenetworg`) where we have our Microsoft 365, Azure Development subscriptions, some internal production services, DevOps, agents and also Partner Center registration. Then we have other tenants (like `talxisprod.onmicrosoft.com` - shortly `talxisprod`) for production workloads - we have our production Azure Subscriptions there (for resource isolation) and also our production multi-tenant service principals. This setup is heavily inspired by what Microsoft currently does internally as well.

When publisher verification came out and we figured that it cannot be used with multiple tenants, we opened a ticket with Microsoft's Support which wasn't really much helpful, besides saying that this is something coming in future which was something, we weren't really satisfied with.

Since Microsoft uses similar setup, we knew that there had to be a way to achieve this, so we started playing with this. We initially ended with the following error:

```
The domain used to perform email verification in Partner Center (networg.com) does not match the application's Publisher Domain (prod.talxis.com) or any of the verified domains on the tenant.
```

You might also hit a message about not having MFA enabled if you are not using it (for instance becuase of B2B guest access or just because weird reasons which don't make sense eg. **just enable MFA everywhere!** - [security defaults](https://docs.microsoft.com/en-us/azure/active-directory/fundamentals/concept-fundamentals-security-defaults) are a good way to get started).

In order to get publisher verification working, you need to set a _Publisher domain_ (go to _App registrations_, select the app and select _Branding_). By default, the Azure Portal will suggest you to use one from your verified domains in your tenant but you want to do the other thing - [Verify a new domain](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-configure-publisher-domain#to-verify-a-new-domain-for-your-app). It sounds like a new domain will be added to the tenant, but it won't, it's just application level verification.

Thanks to this feature, you can set the publisher domain to any domain, even outside the tenant. It's quite simple, just choose your desired domain and create a file in path `/.well-known/microsoft-identity-association.json` - make sure it is accessible via HTTPS (because it should anyways), and that the `Content-Type` header is exactly `application/json` (it will give weird errors otherwise, which you might get anyways due to web-server and stuff, more on that later).

And use the following content:

```json
{
   "associatedApplications": [
      {
         "applicationId": "{YOUR-APP-ID-HERE}"
      },
      {
         "applicationId": "{YOUR-OTHER-APP-ID-HERE}"
      }
   ]
 }
```

Note that you can have multiple application IDs there, but the content doesn't have to stick there forever, so once you verify the domain, you can [safely remove the file](https://docs.microsoft.com/en-us/answers/questions/37272/should-we-continue-to-host-microsoft-identity-asso.html).

We use [Cloudflare](https://cloudflare.com) in front of most our public facing sites and I was really keen to try their [Workers](https://workers.cloudflare.com/) and saw this as a great opportunity. I was able to [setup a simple route](https://developers.cloudflare.com/workers/platform/routes) (whenever request hits `networg.com/.well-known/microsoft-identity-association.json`) to respond with my JSON file. You can use the code below:

```javascript
addEventListener("fetch", event => {
  const data = {
    associatedApplications: [
      {
        // Application 1
        "applicationId": "{YOUR-APP-ID-HERE}"
      },
      {
        // Application 2
        "applicationId": "{YOUR-OTHER-APP-ID-HERE}"
      }
      // ...
    ]
  }

  const json = JSON.stringify(data, null, 2)

  return event.respondWith(
    new Response(json, {
      headers: {
        "content-type": "application/json"
      }
    })
  )
})
```

So thanks to Workers, I didn't even have to modify our website to include the file.

Now that we have the domain verified, next thing which needs to be is to associate the other tenant (`talxisprod`) with our main tenant (`thenetworg`). In order to do this, navigate to [Partner Center's Tenant management](https://partner.microsoft.com/en-us/dashboard/account/v3/tenantmanagement) and simply associate the target tenant which holds the service principals. You can find more info on association of the tenant in [Microsoft's official documentation](https://docs.microsoft.com/en-us/partner-center/multi-tenant-account).

Now that we have done this, you can proceed with the [publisher verification](https://docs.microsoft.com/en-gb/azure/active-directory/develop/publisher-verification-overview) itself. Find your MPN ID (usually a bunch of numbers) and input it to the form in Azure Portal. Once you submit it, you may end up waiting for few seconds and application will end up in verified status.

![](/uploads/2020/11/publisher-verification-portal.png)

After the save, you may end up with the name displaing as `-` which is fine, it appears to be just a caching issue and after a minute and refreshing the page, it will go away.

You may also end up with a permissions error - you will get it usually when you are a B2B guest - even with full Global Administrator role. So this last step with inputting the MPN ID has to be done with an actual user homed in the `talxisprod` tenant.

So after all this struggle, your users will end up with a nice consent screen showcasing your company's name and won't have any issues granting consent.

![](/uploads/2020/11/publisher-verified-consent.png)

Personally, I believe that the publisher verification is something very useful since it will likely complicate most of the attacks via OAuth token phishing ([example](https://o365blog.com/post/phishing/)). So we obviously wanted to get ourselves verified. I am just quite unsure why it is so obscure to get this working with multiple tenants. In my opinion, it should be as easy as linking the tenant to the Partner Center.

> This is a cross-post from [NETWORG's blog](https://blog.thenetw.org/).