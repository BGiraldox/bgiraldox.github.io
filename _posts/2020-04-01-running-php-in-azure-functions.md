---
title: Running PHP in Azure Functions
date: 2020-04-01T09:00:00+02:00
author: Jan Hajek
categories:
  - Microsoft
  - Microsoft Azure
  - Open Source
tags:
  - Azure Functions
  - PHP
---

Hi friends! Happy April Fools' Day! Recently, Microsoft added a new feature to Azure Functions called Custom Handlers. It basically allows you to write Azure Function in any language (kind of reminds me of how [Dapr](https://dapr.io) handles communication) and benefit from all the input and output bindings as well. In this article, I will demonstrate how to set it up with PHP.

![Azure Functions Custom Handlers](https://docs.microsoft.com/en-us/azure/azure-functions/media/functions-custom-handlers/azure-functions-custom-handlers-overview.png)

As per the picture, you can see that the Functions Host expects a web server to be running (defined in `host.json`) and passes the the request payload.

The setup is going to be fairly simple. In order to run PHP web server, we will use the [built-in one in PHP](https://www.php.net/manual/en/features.commandline.webserver.php). You can start this server locally by just calling `php -S localhost:3000` in the directory where your code is, it will serve the requests. With Custom Handlers, the port however is passed via an environment variable `FUNCTIONS_HTTPWORKER_PORT`. The issue is, that the PHP server needs the port at startup, so what we need to do is to execute this via either Batch or bash script which will pull the correct port and start the PHP server.

I created a Function app on Windows dedicated App Service Plan. There, I modified the `host.json` to execute the desired script:

```json
{
  "version": "2.0",
  "httpWorker": {
    "description": {
      "defaultExecutablePath": "phpServer.bat"
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[1.*, 2.0.0)"
  }
}
```

Then the `phpServer.bat` which we need to place into the `wwwroot` directory:

```bat
php -S 127.0.0.1:%FUNCTIONS_HTTPWORKER_PORT% functionRouter.php
```

Note that `127.0.0.1` is used instead of `localhost`. This is due to PHP's server binding to specific hostname I suppose. The Functions runtime is calling it via `127.0.0.1` so we need to have it there.

Next step is to define the functions. I setup two functions - `function1` and `function2`. `function1` is a simple HTTP in-out function, while `function2` is also outputting a message into Azure Storage Queue.

`/function1/function.json`:
```json
{
  "bindings": [
    {
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": [
        "get",
        "post"
      ],
      "authLevel": "anonymous"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
```

`/function2/function.json`:
```json
{
  "bindings": [
    {
      "type": "httpTrigger",
      "authLevel": "function",
      "direction": "in",
      "name": "req",
      "methods": ["post"]
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    },
    {
      "type": "queue",
      "name": "message",
      "direction": "out",
      "queueName": "orders",
      "connection": "AzureWebJobsStorage"
    }
  ]
}
```

The last piece is to write the PHP script to handle this the `functionRouter.php`. It is a very simple router, which checks which function to trigger and runs the code. Note that which `function2` we output a JSON response, hence the `Content-Type` header and we also emit some logs and write to the queue. The logs then appear in Application Insights linked with the function.

```php
<?php

if(strpos($_SERVER['REQUEST_URI'], "/function1") !== FALSE) {
    if($_SERVER["REQUEST_METHOD"] == "GET") {
        $name = "World";
        if(isset($_GET["name"])) {
            $name = $_GET["name"];
        }
        echo "Hello ".$name." from an Azure Function written in PHP!";
    }
    else if($_SERVER["REQUEST_METHOD"] == "POST") {
        $name = "World";
        $json = file_get_contents('php://input');
        $jsonBody = json_decode($json, true);
        if(isset($jsonBody["name"])) {
            $name = $jsonBody["name"];
        }
        echo "Hello ".$name." from an Azure Function written in PHP!";
    }
}
else if(strpos($_SERVER['REQUEST_URI'], "/function2") !== FALSE) {
    header("Content-Type: application/json");
    if($_SERVER["REQUEST_METHOD"] == "POST") {
        $name = "World";
        $json = file_get_contents('php://input');
        $jsonBody = json_decode($json, true);
        if(isset($jsonBody["name"])) {
            $name = $jsonBody["name"];
        }
        $message = "Hello ".$name." from an Azure Function written in PHP!";
        echo json_encode([
            "Outputs" => [
                "message" => $message,
                "res" => [
                    "statusCode" => 200,
                    "body" => $message
                ]
            ],
            "Logs" => [
                "Request completed"
            ]
        ]);
    }
}
else {
    phpinfo();
}
```

So as you can see, the Custom Handlers in Azure Functions can pretty much run any language, including your PHP code and you can easily integrate it with [Azure Functions Bindings](https://docs.microsoft.com/en-us/azure/azure-functions/functions-triggers-bindings). Two more things to note:

- The default PHP version on the Windows worker is 5.6, which you probably want to change. If you want to make such a change, you can use either the `az` CLI or [Resource Explorer](https://resources.azure.com/) - you need to navigate to `<yoursitename>/config/web` and change the `phpVersion` property to for example `7.3`.
- I wouldn't really use this in production, since the built-in PHP webserver is only for testing, and not really production workloads.