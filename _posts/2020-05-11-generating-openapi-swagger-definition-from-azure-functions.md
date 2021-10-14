---
title: Generating OpenAPI / Swagger definition from Azure Functions
date: 2020-05-11T10:00:00+02:00
author: Jan Hajek
categories:
  - Microsoft
  - Microsoft Azure
  - Open Source
tags:
  - Azure Functions
  - Swagger
  - OpenAPI
---

When you build a regular web app in ASP.NET Core, you can easily hook [bunch of tools](https://docs.microsoft.com/en-us/aspnet/core/tutorials/web-api-help-pages-using-swagger?view=aspnetcore-3.1) to it in order to be able to generate OpenAPI definitions. With Azure Functions, this is slightly more complex and challenging.

At the moment there doesn't appear to be any official release and recommended guidance form Microsoft on how-to generate OpenAPI definitions from Azure Functions. There are many contributions from the community ([1](https://devkimchi.com/2019/02/02/introducing-swagger-ui-on-azure-functions/), [2](https://medium.com/@yuka1984/open-api-swagger-and-swagger-ui-on-azure-functions-v2-c-a4a460b34b55)) which make it much easier, but I ended up hitting some incompatibilities between Function runtimes - especially lack of support for V3. Some time ago, I stumbled upon [Microsoft's OpenAPI implementation](https://github.com/microsoft/OpenAPI.NET) which is also used by Swashbuckle for example.

Along with that library, Microsoft has a very nice project called [OpenAPI.NET.CSharpAnnotations](https://github.com/microsoft/OpenAPI.NET.CSharpAnnotations) which allows you to generate the definition from [annotation XML](https://docs.microsoft.com/en-us/dotnet/csharp/codedoc). And guess what you can annotate? Yes, Azure Functions as well!

I decided to build a small sample in Azure Functions inspired by the [Swagger Petstore](https://petstore.swagger.io/) sample. You can find the [functioning code on my GitHub](https://github.com/hajekj/azure-functions-openapi-demo).

Basically I annotated all the methods and model objects, so that an XML definition gets generated. Along with that, I added a method which generates the OpenAPI document at run-time and serves it to consumers:

```csharp
[FunctionName("swagger.json")]
public static async Task<HttpResponseMessage> RunSwagger([HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = null)] HttpRequest req, ILogger log)
{
    var input = new OpenApiGeneratorConfig(
        annotationXmlDocuments: new List<XDocument>()
        {
            XDocument.Load(@"AzureFunctionsOpenAPIDemo.xml"),
        },
        assemblyPaths: new List<string>()
        {
            @"bin\AzureFunctionsOpenAPIDemo.dll"
        },
        openApiDocumentVersion: "V1",
        filterSetVersion: FilterSetVersion.V1
    );
    input.OpenApiInfoDescription = "This is a sample description...";

    var generator = new OpenApiGenerator();
    var openApiDocuments = generator.GenerateDocuments(
        openApiGeneratorConfig: input,
        generationDiagnostic: out GenerationDiagnostic result
    );

    return new HttpResponseMessage(HttpStatusCode.OK)
    {
        Content = new StringContent(openApiDocuments.First().Value.SerializeAsJson(OpenApiSpecVersion.OpenApi2_0), Encoding.UTF8, "application/json")
    };
}
```

You can then use this generated `swagger.json` file to consume it in [Swagger UI](https://petstore.swagger.io/), [Swagger Editor](https://editor.swagger.io/), [API Management](https://azure.microsoft.com/en-us/services/api-management/) or service of your choice.

![Generated definition by Azure Function!](/uploads/2020/05/openapi-functions.jpg)

So how to get started on an existing project? First off, decide when you want to generate the definition - design-time, build-time or run-time. Obviously design-time doesn't make much sense (because at desing-time, you make the definition even before you write your code). My sample is going with run-time, but build-time is much more suitable for use with [Azure API Management](https://docs.microsoft.com/en-us/azure/api-management/import-and-publish) for example.

Next, enable *XML documentation file* output in your project, either via GUI or in your *.csproj* file:

```xml
<PropertyGroup>
    <TargetFramework>netcoreapp3.1</TargetFramework>
    <AzureFunctionsVersion>v3</AzureFunctionsVersion>
    <DocumentationFile>AzureFunctionsOpenAPIDemo.xml</DocumentationFile>
</PropertyGroup>
```

After that a new file should pop in your project folder - make sure to add it to *.gitignore*, since it is something that is generated and shouldn't probably be part of your repository (I included it into the repo, so you can take a look at it online).

Then you just either create the endpoint I shown above or generate the definition at build time with this awesome [DevOps extension](https://marketplace.visualstudio.com/items?itemName=ms-openapi.OpenApiDocumentTools) provided by Microsoft. It does not only build the definition for you, but it also can publish it into another Git repo seamlessly, so you can run another process from that.

One thing which I miss is having an out-of-box method to convert `IFormCollection` to my desired model, but I am sure everyone can come up with some nice way (we use JSON for most of the things anyways in here).

All in all, I see this as the most viable solution for quick use with Azure Functions at the moment, since it is very likely that it will work with Azure Functions vNext and onwards.