---
title: Is callback hell still a thing in ES6 with TypeScript?
date: 2016-10-02T07:40:36+02:00
author: Jan Hajek
permalink: /2016/10/02/is-callback-hell-still-a-thing-in-es6-with-typescript/
categories:
  - Microsoft
  - Open Source
tags:
  - ES6
  - JavaScript
  - TypeScript
---

<p>Whenever I am talking to someone about JavaScript, I mostly end up hearing "<a href="http://callbackhell.com/">callback hell</a>" at least once during the conversation. Most of the people are unfortunately staying with the old-school habit, that callbacks are super bad in JavaScript. Let's take a look at how can we remove the need for using callbacks using ECMAScript 6 and TypeScript.</p>

<!--more-->
<blockquote class="wp-block-quote"><p>Actually, I didn't know that <a href="http://callbackhell.com/">Callback Hell</a> had its own website!</p></blockquote>
<p>With the release of ECMAScript 6 (aka ES6 or ES2015) a great amount of new great things have been added to JavaScript (you can see the most important ones <a href="https://mva.microsoft.com/en-US/training-courses/gamechanging-features-in-es2015-16640">here</a>, or take a look at the entire <a href="http://es6-features.org">feature list</a>). One of the most important ones for me are <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*">Generators</a>&nbsp;(nice explanation can be found&nbsp;on <a href="https://davidwalsh.name/es6-generators">David Walsh's blog</a>). Generally, generators are&nbsp;sort of functions which allow you to pause and resume the control flow.</p>

<p>As mentioned above, generators are used for flow control, which allows for TypeScript (and <a href="https://babeljs.io/docs/plugins/transform-async-to-generator/">Babel</a> as well) to allow developers use async/await with functions and transpile the code into generators and promises&nbsp;which are natively supported in ES6 (promises are supported in ES5 as well using a <a href="http://polyfill.io/">polyfill</a>).</p>

<h1>ES6 adoption</h1>

<p>One of the most important things to discuss is the adoption of ECMAScript 6 across browsers and runtimes since async/await heavily relies on ES6 features.</p>

<p>It is safe to say, that if you plan to use it within a Node.js application (assuming you have control over the runtime - or at least using some of the newer Node.js versions), may it be a server-side or an Electron based app,&nbsp;you are good to.</p>

<p>However, when speaking of browsers, this may&nbsp;get a little&nbsp;tricky. Currently, as you can see from this <a href="https://kangax.github.io/compat-table/es6/">compatibility overview</a>, ES6 is supported in all modern browsers (Edge, Chrome, Firefox and Safari), assuming you are running an up-to-date version.</p>

<p>However if you are making an application for users who are conservative or are using an older browser, you may want to pay attention in the next section.</p>

<h2>What about ES5?</h2>

<p>Recently, <a href="https://www.typescriptlang.org/docs/release-notes/typescript-2.0.html">TypeScript 2.0</a> got released, however as much as everyone was expecting it, the async/await didn't make it to the 2.0 release. In the end of the <a href="https://blogs.msdn.microsoft.com/typescript/2016/07/11/announcing-typescript-2-0-beta/">beta announcement post</a>, Microsoft explained that they are not going to ship the support of async/await just yet due to implementation issues. The actual progress can be tracked on GitHub - in the feature request&nbsp;<a href="https://github.com/Microsoft/TypeScript/issues/1664">#1664</a>&nbsp;or on the <a href="https://github.com/Microsoft/TypeScript/wiki/Roadmap">roadmap</a>.</p>

<p>So as of now, if you are targetting older browsers, you will unfortunately have to stick with Promises and callbacks until TypeScript 2.1 makes it to us, however when writing a modern web application (targeting modern browsers), you shouldn't be afraid of using ES6!</p>

<h1>Enough chit-chat, show me!</h1>

<p>Alright, alright, let's take a look at some practical sample:</p>

```typescript
async function Test1(): Promise<string> {
    // Calling Test2 here to show that we can use await within async functions
    let test2 = await Test2();
    console.log("Test1:", test2)
    return new Promise<string>(async (resolve, reject) => {
        setTimeout(function () {
            resolve("Test1 finished");
        }, 1000);
    });
}
async function Test2(): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
        setTimeout(function () {
            resolve("Test2 finished");
        }, 1000);
    });
}

async function RunTest() {
    console.log("async operation started...");
    let test1 = await Test1();
    console.log("RunTest:", test1);
    console.log("async operation finished...");
}

RunTest();
```

<p>So in this example, we run <em>RunTest()</em> async function which executes and waits for completion of <em>Test1()</em> and then outputs the result to the console. In <em>Test1()</em> we are calling and waiting for response from <em>Test2()</em> and once we get the response, we proceed forward.</p>
<blockquote class="wp-block-quote"><p>The use of&nbsp;<code>return new Promise</code> and <code>setTimeout</code> with a callback also actually demonstrates how you would wrap functions which only support callbacks instead of Promises.</p></blockquote>
<p>But let's get back to the original topic, upon "compiling" the code with TypeScript, following code for ES6&nbsp;is produced:</p>

```javascript
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
function Test1() {
    return __awaiter(this, void 0, void 0, function* () {
        // Calling Test2 here to show that we can use await within async functions
        let test2 = yield Test2();
        console.log("Test1:", test2);
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            setTimeout(function () {
                resolve("Test1 finished");
            }, 1000);
        }));
    });
}
function Test2() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            setTimeout(function () {
                resolve("Test2 finished");
            }, 1000);
        }));
    });
}
function RunTest() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("async operation started...");
        let test1 = yield Test1();
        console.log("Test1", test1);
        console.log("async operation finished...");
    });
}
RunTest();
//# sourceMappingURL=HelloWorld.js.map
```

<p>So as you can see, TypeScript produces an <em>__awaiter</em> function and generators for each of the async&nbsp;functions,&nbsp;also using the <a href="https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Operators/yield"><em>yield</em></a>&nbsp;keyword which altogether mimic the async/await operation.</p>

<h2>Using with existing libraries</h2>

```typescript
import * as sqlite3 from "sqlite3";

async functin Connect(): Promise < sqlite3.Database > {
    return await new sqlite3.Database("db.sqlite");
}
async function Run() {
    let database = await Connect();
}
```

<p>This example shows how easily you can use TypeScript and an existing library together with async/await flow as opposite to returning and resolving an actual promise. It actually means that you don't have to wrap the library functions into async functions, but they are going to work out of the box!</p>

<h1>Wrap up</h1>

<p>With the couple of projects which are written in JavaScript (mostly server-side code) we are migrating some of the code into TypeScript for better maintainability and&nbsp;as a&nbsp;part of this, we are making use of the async/await flow there.</p>

<p>Generally, it made our code cleaner and more easy to understand for other developers as well.</p>
