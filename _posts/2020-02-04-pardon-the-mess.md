---
title: Pardon the mess...
date: 2020-02-04T09:00:00+02:00
author: Jan Hajek
categories:
  - Other
tags:
  - Blog
---

Hi everyone! Long time no hear!

I got this great idea to migrate my blog from WordPress into [GitHub Pages](https://pages.github.com/)! I have been running WordPress for quite a while now - switched some hostings and ended up running on [my own VM in Azure](https://github.com/hajekj/hajekjnet-php/).

<!--more-->

I am still polishing some things, hopefully everything will be working. I tried to make sure that the [RSS feed](/feed) remains available under the same address, and hopefully all the posts.

Some technical reasoning is - due to some unknown reasons, the underlying database of WordPress became corrupt and therefore I managed to loose couple posts in progress and had to restore them from backup. After that, I decided to just go with the static generated site which can be moved and built anywhere - may it be GitHub or Azure DevOps in future.

I will be actually doing the same for [NETWORG's blog](https://blog.thenetw.org) in near future. However, I have to also express my gratitude to the great WordPress community and WordPress on its own, which is constantly amazing me. If you want to hear some cool stories I suggest that you read this book - [The Year Without Pants](https://scottberkun.com/yearwithoutpants/).

Also, I will be enabling comments on the blog shortly again.

I originally wanted to flatten the initial changes I was making to the posts, but decided to keep them in the history, in case something got lost. You can find the source of this blog [here](https://github.com/hajekj/hajekj.github.io).