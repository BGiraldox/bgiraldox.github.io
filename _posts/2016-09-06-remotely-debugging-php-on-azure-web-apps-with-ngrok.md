---
title: First Blog Post
date: 2021-10-14T21:32:53+02:00
author: Brayan Giraldo
permalink: /2021/10/14/first-blog-post-test/
categories:
  - Test
tags:
  - Test
---

<p>First thing you need to have installed is <a href="https://marketplace.visualstudio.com/items?itemName=felixfbecker.php-debug">PHP Debug extension</a>&nbsp;which I mentioned in the beggining of the article. This is going to allow you to debug PHP code from within the Code. Next step is to create <a href="https://code.visualstudio.com/docs/editor/debugging"><em>launch.json</em></a> configuration. The PHP Debug extension adds a default definition for PHP which we're going to start with, in order to create your own definition, look at the picture below:</p>
<div class="wp-block-image"><figure class="aligncenter"><a href="/uploads/2021/10/giphy_zelda.gif"><img src="/uploads/2016/09/PHP_debug_definition-300x162.png" alt="Creating PHP debug definition" class="wp-image-17"/></a><figcaption>Creating PHP debug definition</figcaption></figure></div>
<p>From the configuration, we can only keep the <em>Listen for XDebug</em> configuration and we need to modify it a bit as follows: Like mentioned above, we did set up ngrok to forward all incoming TCP requests to local port 9000, so we can leave the port as it is. For the remote debugging to work correctly, we need to add following:</p>

<p>The final look of the <em>launch.json</em> file is following:</p>

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Listen for XDebug",
            "type": "php",
            "request": "launch",
            "port": 9000,
            "localSourceRoot": "C:/Users/hajek/Documents/Source/Temp/hajekj-xdebug/",
            "serverSourceRoot": "D:/home/site/wwwroot/"
        }
    ]
}
```