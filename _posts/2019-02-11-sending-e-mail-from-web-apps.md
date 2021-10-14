---
title: Sending e-mail from Web Apps
date: 2019-02-11T09:00:39+01:00
author: Jan Hajek
permalink: /2019/02/11/sending-e-mail-from-web-apps/
categories:
  - Microsoft Azure
  - Open Source
tags:
  - .NET
  - App Service on Linux
  - Azure Web Apps
  - Containers
  - Docker
  - E-mail
  - Microsoft Graph
  - Office 365
---

<p>Most of web application oriented hosters (like Azure App Service) or application hosted in Docker (in Azure, App Service on Linux), or serverless applications don't offer built-in e-mail delivery and require you to use an external server. In this article, we are going to explore the options to do this.</p>

<!--more-->

<p>Whether you need to send an e-mail from a web application or a webjob you are very likely in need of choosing your e-mail provider. And you better do this right.</p>

<p>The reasons for the hosting providers not offering e-mail services is simple - running such a mail service with decent deliverability, keeping IPs off blacklists, making sure the content is safe... costs a lo of money. For example Office 365 has such protection for outbound messages, called <a href="https://docs.microsoft.com/en-us/office365/securitycompliance/high-risk-delivery-pool-for-outbound-messages">High Risk Delivery Pool</a>.</p>

<h1>Office 365</h1>

<p>If your company is using Office 365, you may want to use it to send out e-mails. It is well managable, supports SPF, DKIM and DMARC which are great for improved deliverability. The problem is - <strong>Office 365 is not supposed to send large amount of e-mails</strong> and has <a href="https://docs.microsoft.com/en-us/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits#receiving-and-sending-limits">certain limits in place</a>. It is okay to use it for sending e-mails from a low-volume system - like WordPress or eventually a ticketing system, but it shouldn't be used for marketing e-mails and large sendouts or apps with large volumes of outbound messages.</p>

<p>On the other hand, the best thing about Office 365 is that it can both receive and send e-mails, so it is perfect for the afformentioned ticketing systems. You can access e-mail via IMAP and send it through SMTP or make use of Microsoft Graph REST APIs.</p>

<p>Besides the volume limits, you should keep on mind that you have to obtain at least an <a href="https://docs.microsoft.com/en-us/exchange/mail-flow-best-practices/how-to-set-up-a-multifunction-device-or-application-to-send-email-using-office-3#option-1-recommended-authenticate-your-device-or-application-directly-with-an-office-365-mailbox-and-send-mail-using-smtp-client-submission">Exchange Online license for such an account</a>. In the past this was possible without a lincense simply with a shared mailbox.</p>

<p>There is very detailed e-mail tracking with regards to deliverability, however it doesn't allow you to track whether the message was open, links clicked etc.</p>

<p>Similar limits and requirements apply when you use GSuite (Google Apps) or other comparable service.</p>

<h1>SendGrid</h1>

<p>Next category are Transactional Mail Services. These are great for sending large volumes of e-mails, however you are likely to struggle with inbound e-mails. I chose SendGrid because it offers both - sending e-mails and a feature called inbound parse which allows you to recieve e-mails sent to a domain through a webhook (ideal use of Azure Functions for example).</p>

<p>With SendGrid you can use both SMTP and REST API to send out e-mails.</p>

<p>It also features quite detailed e-mail tracking - whether it was delivered, opened and what links were clicked. It also allows you to design tenplates and then input only the variables in the message which will then be filled into the template.</p>

<p>I chose to list SendGrid here because we use it on most projects and because you can obtain an account directly through Azure Portal. There are many alternatives, but you have to watch out for deliverability <a href="https://blog.thenetw.org/2019/01/23/sendgrid-forwarding-and-dmarc-policy/">especially when DMARC policy is applied</a>.</p>

<p>Transactional mail services are obviously paid, usually per message basis - SendGrid offers a free tier with monthly 25k mails if you sign up from Azure.</p>

<h1>Selfhosted mail server</h1>

<p>The last option which I am going to mention is running your own selfhosted mail server. While this option gives you the most freedom with volumes for super cheap price (10$ monthly or so) however at a cost of deliverability and maintenance.</p>

<p>Honestly, I am not really likely to run my own mail server ever. There are just too many requirements. You will need to setup DKIM, SPF, TLS, make it compliant with DMARC policy (if you have any in place) and most importantly - keep your server's IP address off all the various blacklists.</p>

<p>Also not all cloud providers welcome e-mail servers with open hands. In Azure for example you need to have your <a href="https://blogs.msdn.microsoft.com/mast/2017/11/15/enhanced-azure-security-for-sending-emails-november-2017-update/">subscription whitelisted</a> for outbound port 25 communication.</p>
