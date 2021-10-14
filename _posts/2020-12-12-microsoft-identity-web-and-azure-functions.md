---
title: Microsoft.Identity.Web and Azure Functions
date: 2020-12-12T16:30:00+02:00
author: Jan Hajek
categories:
  - Microsoft
  - Microsoft Azure
tags:
  - Azure Functions
  - Azure AD
  - Microsoft Graph
  - Identity
  - MSAL
  - Authentication
---

I [recently run](https://twitter.com/hajekj/status/1336666527513403398) into an interesting situation with authentication. Since serverless and Azure Functions are gaining more and more traction, I wanted to see if it's possible to make use of Microsoft.Identity.Web library from within Azure Functions... and it worked!

Initially, my requirement was to support both Azure AD and static API key authentication for the same endpoints. In ASP.NET Core, this is done simply by setting up a policy scheme via `.AddPolicyScheme`, with Azure functions, it is slightly different.

First off, Azure Functions don't have any concept of middlewares, except for [filters](https://www.c-sharpcorner.com/article/do-you-know-azure-function-have-function-filters/) which are at the time of writing in [preview](https://github.com/Azure/azure-webjobs-sdk/wiki/Function-Filters), so this is probably not really something you want to go with.

Azure Functions however support regular [dependency injection](https://docs.microsoft.com/en-us/azure/azure-functions/functions-dotnet-dependency-injection), so you can add your custom services. One of the services for example is `AddJwtBearer` brought to you by [Microsoft.AspNetCore.Authentication.JwtBearer](https://docs.microsoft.com/en-us/dotnet/api/microsoft.extensions.dependencyinjection.jwtbearerextensions.addjwtbearer?view=aspnetcore-5.0) package. Instead of using playn JwtBearer middleware, we are going to use [Microsoft.Identity.Web](https://docs.microsoft.com/en-us/azure/active-directory/develop/microsoft-identity-web) (MIW). The cool thing about MIW is, that it simplifies most of the common actions and operations you need to do. It also makes usage of [Microsoft Graph](https://github.com/AzureAD/microsoft-identity-web/wiki/1.2.0#you-can-now-specify-scopes-and-app-permissions-for-graphserviceclient) or calling [any other API](https://github.com/AzureAD/microsoft-identity-web/wiki/1.2.0#comfort-methods-for-idownstreamwebapi) super simple!

So in order to add it, all you need to do is to create a `Startup.cs` file which looks like this:

```csharp
[assembly: FunctionsStartup(typeof(FunctionsAuthentication.Startup))]
namespace FunctionsAuthentication
{
    public class Startup : FunctionsStartup
    {
        public override void Configure(IFunctionsHostBuilder builder)
        {
            // This is configuration from environment variables, settings.json etc.
            var configuration = builder.GetContext().Configuration;

            builder.Services.AddAuthentication(sharedOptions =>
            {
                sharedOptions.DefaultScheme = "Bearer";
                sharedOptions.DefaultChallengeScheme = "Bearer";
            })
                .AddMicrosoftIdentityWebApi(configuration)
                    .EnableTokenAcquisitionToCallDownstreamApi()
                    .AddInMemoryTokenCaches();
        }
    }
}
```

Don't forget to add [Microsoft.Identity.Web](https://www.nuget.org/packages/Microsoft.Identity.Web/) package and configure your `local.settings.json` (it should probably end up looking like this):

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet",
    "AzureAd:Instance": "https://login.microsoftonline.com/",
    "AzureAd:Domain": "<your_domain>",
    "AzureAd:TenantId": "<your_tenant_id>",
    "AzureAd:ClientId": "<client_id>",
    "AzureAd:ClientSecret": "<client_secret>"
  }
}
```

Now we have to make a little `HttpContext` extension, I will explain what it does below:

```csharp
public static class FunctionsAuthenticationHttpContextExtension
{
    public static async Task<(bool, IActionResult)> AuthenticateFunctionAsync(this HttpContext httpContext, string schemaName)
    {
        var result = await httpContext.AuthenticateAsync(schemaName);
        if (result.Succeeded)
        {
            httpContext.User = result.Principal;
            return (true, null);
        }
        else
        {
            return (false, new UnauthorizedObjectResult(new ProblemDetails
            {
                Title = "Authorization failed.",
                Detail = result.Failure?.Message
            }));
        }
    }
}
```

This extension method is going to be called whenever the Function is invoked, because you can't make any direct use of regular `[Authorize]` [like in ASP.NET Core](https://docs.microsoft.com/en-us/aspnet/core/security/authorization/introduction?view=aspnetcore-5.0). This extension method does three things:

* Attempts to authenticate the principal via the provided `schemaName`
* If authentication succeeds, it populates `HttpContext.User` with the principal information like claims (it will also make `User.Identity.IsAuthenticated` work etc.)
* If authentication fails, produces an `IActionResult` with the error message (see [Problem Details](https://docs.microsoft.com/en-us/aspnet/core/web-api/handle-errors?view=aspnetcore-5.0#client-error-response) for more information).

Thanks to `HttpContext.User` containing correct principal, you can also make use of [`VerifyUserHasAnyAcceptedScope`](https://github.com/AzureAD/microsoft-identity-web/wiki/adding-call-api-to-web-app#in-the-controller-acquire-a-token-and-call-the-api) to easily validate the scope passed in the token.

Next we proceed with the function. First, make it a regular non-static class, so we can make use of `ITokenAcquisition` (will need it for later). Next, make sure the function's [authorization level](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-trigger?tabs=csharp#api-key-authorization) is set to anonymous (`[HttpTrigger(AuthorizationLevel.Anonymous, ...]`), otherwise you will run into following issue: Azure Functions use [multiple authentication services](https://github.com/Azure/azure-functions-host/blob/9ac904e34b744d95a6f746921556235d4b2b3f0f/src/WebJobs.Script.WebHost/WebHostServiceCollectionExtensions.cs#L44) and authorization level triggers them, so you would end up with errors like missing scheme or similar.

Next, you simply call the `AuthenticateFunctionAsync` with the schema name, the default is `Bearer` (from [`JwtBearerDefaults`](https://docs.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.authentication.jwtbearer.jwtbearerdefaults.authenticationscheme?view=aspnetcore-5.0)), but you can replace it with your own policy's name. The extension method returns a [tuple](https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-tuples), first value is a boolean - whether authentication was ok or not and second is the desired `IActionResult` which you can return if the authentication failed.

If you plan to use the [on-behalf-of flow](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-on-behalf-of-flow) to obtain a token for another service with the current user's token (eg. Microsoft Graph) you also want to inject `ITokenAcquisition` into the constructor (this is another reason to populate `HttpContext.User` since `ITokenAcquisition` uses the principal for token caching). In the code above, we called `AddInMemoryTokenCaches` which you may argue is ineffective for Functions, since it's just in memory and not shared. That's true, you can opt-in to move to [distributed token cache](https://github.com/AzureAD/microsoft-identity-web/wiki/token-cache-serialization) in a single line of code (there are [implementations for Redis, SQL, Cosmos](https://github.com/AzureAD/microsoft-identity-web/wiki/token-cache-serialization) and [Table Storage](https://github.com/StefH/DistributedCache.AzureTableStorage)). The rest is just as easy as to call `GetAccessTokenForUserAsync` on `ITokenAcquisition` and if the scopes have been granted correctly, you will get a token (try calling it again and diffcheck the token, to check if token caching works). If you add the [Microsoft Graph](https://www.nuget.org/packages/Microsoft.Identity.Web.MicrosoftGraph) package, you can easily call the `GraphServiceClient` as well.

And now, the function code itself:

```csharp
public class Function1
{
    private readonly ITokenAcquisition _tokenAcquisition;
    public Function1(ITokenAcquisition tokenAcquisition)
    {
        _tokenAcquisition = tokenAcquisition;
    }

    [FunctionName("Function1")]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = null)] HttpRequest req,
        ILogger log)
    {
        var (authenticationStatus, authenticationResponse) = await req.HttpContext.AuthenticateFunctionAsync("Bearer");
        if (!authenticationStatus) return authenticationResponse;

        var token = await _tokenAcquisition.GetAccessTokenForUserAsync(new string[] { "https://graph.microsoft.com/.default" });

        log.LogInformation("C# HTTP trigger function processed a request.");

        string name = req.HttpContext.User.Identity.IsAuthenticated ? req.HttpContext.User.Identity.Name : null;

        string responseMessage = string.IsNullOrEmpty(name)
            ? "This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response."
            : $"Hello, {name}. This HTTP triggered function executed successfully.";

        return new OkObjectResult(responseMessage);
    }
}
```

So far, I found this to be quite fulfilling, since it doesn't seem to lack many things I am used to from ASP.NET Core (except for the attributes). Give it a try and see for yourself!

~~Also, please note, that like [Christos mentioned](https://twitter.com/ChristosMatskas/status/1336685982947528704) MIW wasn't made to work with Functions, so it's not likely to receive any official support.~~

**Update:** Thanks to [jennyf19](https://github.com/jennyf19) for [confirming](https://github.com/AzureAD/microsoft-identity-web/pull/795#issuecomment-743909991), that the team is interested in the scenario and will help out with any issues you may encounter along the way! Simply create an [issue](https://github.com/AzureAD/microsoft-identity-web/issues) in the repo if needed.