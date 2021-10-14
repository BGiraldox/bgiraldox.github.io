---
title: Using Bing for Work in Edge alongside Google
date: 2020-10-10T11:15:00+02:00
author: Jan Hajek
categories:
  - Microsoft
tags:
  - Microsoft Bing
  - Microsoft Edge
---

Microsoft has really invested a lot into both Edge and Microsoft Search. However Bing is still behind a lot, especially in our Czech waters. On the other hand, I really enjoy using Bing for Work search, since it searches literally everywhere I would need to look manually otherwise. And it's quite fast as well.

Usually, I would either open up our SharePoint or start searching in Teams, but it takes some time to figure out where the item I am looking for was. It also provides quick information about users, groups, sites and much more which can be added by [custom connectors](https://docs.microsoft.com/en-us/microsoftsearch/connectors-overview) (for instance, [searching in your DevOps instance](https://docs.microsoft.com/en-us/microsoftsearch/azure-devops-connector), how cool is that, huh?).

I might have discovered America here for some, but I found this one really useful:

You can navigate to `edge://settings/searchEngines` in your browser and add a new search engine. You simply add a name, a keyword (after which it will activate, so I am using `work`) and the target URL which is: `https://www.bing.com/work/search?q=%s`

![](/uploads/2020/10/edge-add-search-engine.png)

Then, whenever you type `work` followed by some keywords in the navbar in the browser, you will end up searching in Bing for Work!

![](/uploads/2020/10/bing-for-work.png)

So this allows me to keep both my Google search for all queries and quickly search in work related stuff as well.