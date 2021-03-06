# SimpleAjax.js
-------------

`SimpleAjax.js` - vanilla JavaScript library, which designed to make simple ajax-requests

## Usage

```js
// GET request to specified URL without parameters
ajax(url);

// or
ajax(url, options);

// HTMLFormElement (<form>) could be a single argument
// if it has an `action` attribute, which will be used as `url`.
// Its `method` attribute will be used as `method`. 
ajax(form);

// or
ajax(form, options);

// or just
ajax(options);
```

## Options

 - `url` <sub><i>(string)</i></sub> - requested resource's url
 - `method` (or `type`) <sub><i>(string)</i></sub> - request method (`GET`, `POST`, `HEAD` etc)
 - `data` (or `content`) <sub><i>(object | HTMLFormElement | string)</i></sub> - object, form (or its selector)
 - `success` <sub><i>(function(AjaxResult))</i></sub> - callback on successful request completion
 - `error` <sub><i>(function(AjaxResult))</i></sub> - callback on request failure
 - `statusCode` <sub><i>(object)</i></sub> - an object of numeric HTTP codes and functions to be called when the response has the corresponding code
 - `headers` <sub><i>(object)</i></sub> - dictionary of request headers
 - `beforeSend` <sub><i>(function(XMLHttpRequest))</i></sub> - function for modifying a request before sending it
 - `beforeReturn` <sub><i>(function(AjaxResult, XMLHttpRequest))</i></sub> - function for modifying a response before returning it
 - `modifier` <sub><i>(object)</i></sub> - object with properties `beforeSend` or/and `beforeReturn` (works the same as the functions above)

## AjaxResult

 - `response`
 - `value` <sub><i>(object)</i></sub> - `Object` containing the response to the request, or null if the request was unsuccessful or it can't be parsed as JSON
 - `document` <sub><i>(document)</i></sub> - `Document` containing the response to the request, or null if the request was unsuccessful or it can't be parsed as XML or HTML
 - `text` <sub><i>(string)</i></sub> - `DOMString` that contains the response to the request as text
 - `url` <sub><i>(string)</i></sub> - serialized `URL` of the response or the empty string if the URL is null
 - `type` <sub><i>(string)</i></sub> - value that defines the response type
 - `status` <sub><i>(number)</i></sub> - unsigned short with the status of the response of the request
 - `statusText` <sub><i>(string)</i></sub> - `DOMString` containing the response string returned by the HTTP server
 - `hasError` <sub><i>(boolean)</i></sub> - `true` if server returned an error code
 - `headers` <sub><i>(object)</i></sub> - dictionary of response headers

## Examples

```js
ajax("https://api.nuget.org/v3/index.json", {
    statusCode: {
        200: function(response) {
            console.log("HTTP 200");
        }
    },
    success: function(response) {
        console.log("Success :)");
    },
    error: function(response) {
        console.log("Error :(");
    }
});
```

```js
ajax({ url: "https://api.nuget.org/v3/index.json" })
    .then(response => console.log(response.hasError ? "Error :(" : "Success :)"));
```

```js
let response = await ajax("https://api.nuget.org/v3/index.json");
console.log(response.value);
```

```html
<form action="https://api.nuget.org/v3/index.json" method="get">
    <input name="version" placeholder="NuGet version" type="text" readonly>
    <input type="submit" value="Get NuGet version!">
</form>

<script>
    document.querySelector("form").addAjax(function ({ response }) {
        this["version"].value = response.value.version;
    },
    {
        // Pre-submit handler
        // If this function will return false,
        // request processing will be canceled
        confirmation: () => confirm("Are you shure?"),

        // The time (in ms) at which repeated requests are blocked
        interval: 500
    });
</script>
```

## Install

Via [npm](https://www.npmjs.com/package/simple-ajax-vanilla):

```cmd
npm i simple-ajax-vanilla
```

Via [JSDelivr](https://www.jsdelivr.com/package/npm/simple-ajax-vanilla):

```html
<script src="https://cdn.jsdelivr.net/npm/simple-ajax-vanilla/src/simpleAjax.min.js"></script>
```

Manually:

Simply download `simpleAjax.min.js` from the [latest release](https://github.com/Kir-Antipov/SimpleAjax/releases/latest) and add it to your project