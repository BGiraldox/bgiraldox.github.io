---
title: Working with certificates in Azure App Service
date: 2018-07-30T09:00:34+02:00
author: Jan Hajek
permalink: /2018/07/30/working-with-certificates-in-azure-app-service/
categories:
  - Microsoft
  - Microsoft Azure
tags:
  - .NET
  - ASP.NET Core
  - Azure Web Apps
---

<p>Recently, we had a project which required us to connect to a MySQL server from .NET Core with a client certificate authentication. While this seemed fairly trivial, we have hit some issues after deploying the application to Azure App Service.</p>


<!-- wp:more {"customText":"Read more"} -->
<p><!--more Read more--></p>



<p>We had the application tested localy with a connection string refering to a certificate within application's storage (<em>D:\home\site\certs\connection.pfx</em>). As soon as we hit the application's endpoint, we received following error:</p>


<pre class="lang:default highlight:0 decode:true wp-block-preformatted">Win32Exception: The credentials supplied to the package were not recognized</pre>


<p>We were trying to figure out what is going on, even the <a href="https://docs.microsoft.com/en-us/azure/app-service/app-service-web-ssl-cert-load#alternative-load-certificate-as-a-file">official docs</a> didn't get us any further. Than my collegue tried to upload the certificate to App Service and load it with the <em>WEBSITE_LOAD_CERTIFICATES</em> option. Suddenly, everything started to work, however it was really weird since we were still using the PFX file directly, not the certificate from the certificate store.</p>



<p>A question that must pop into your head first, is why weren't we using the certificate store in App Service to load the certificate? Simple. We were using the official <a href="https://github.com/mysql-net/MySqlConnector">MySQL connector</a> (<a href="https://github.com/PomeloFoundation/Pomelo.EntityFrameworkCore.MySql">Pomelo</a> uses it on the background) which didn't (at the time) support loading the certificate from the store.</p>



<p>After <a href="https://github.com/projectkudu/kudu/issues/2820">raising an issue in Kudu's repository</a> and getting response from one of the engineers, it was clear - reading PFX requires the user profile to be loaded. When we added <em>WEBSITE_LOAD_CERTIFICATES</em> it basically resulted in loading the profile on the background and hence we could read the PFX from the filesystem. So the solution was simple - adding <em>WEBSITE_LOAD_USER_PROFILE=1</em> option into the application's settings.</p>



<p>After having this work (the application was at Proof of Concept state), we decided that we didn't want to store the certificate in the filesystem directly and wanted to leverage the certificate store. While this connection method is fully supported in MySQL's connector for .NET Framework, it was missing in the .NET Core version. I decided to <a href="https://github.com/mysql-net/MySqlConnector/issues/536">submit an issue initially</a> - to see whether the project would be open for such feature and if there were any reasons why it wasn't implemented yet. After confirming with project's maintainer, we ended up <a href="https://github.com/mysql-net/MySqlConnector/pull/537">contributing the implementation</a> of being able to use the certificate store in the connection string. The day after, <a href="https://github.com/mysql-net/MySqlConnector/releases/tag/0.43.0">0.43.0 release</a> came out including the enhancement.</p>



<p><em>This is my my first post with WordPress's all new <a href="https://wordpress.org/gutenberg/">Gutenberg</a> editor, so please excuse any issues which might occur.</em></p>
