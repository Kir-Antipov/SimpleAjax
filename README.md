# SimpleAjax.js
-------------

`SimpleAjax.js` - vanilla JavaScript library, which designed to make simple ajax-requests

## Usage

```js
// GET request to specified URL without parameters
ajax(url);

// or
ajax(url, options);

// or
ajax(options);
```

## Options

 - `url` - requested resource's url
 - `method` (or `type`) - request method (`GET`, `POST`, `HEAD` etc)
 - `data` (or `content`) - object, form (or its selector)
 - `success` - callback on successful request completion
 - `error` - callback on request failure
 - `statusCode` - an object of numeric HTTP codes and functions to be called when the response has the corresponding code

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
    .then(response => console.log("Success :)"))
    .catch(response => console.log("Error :("));
```

```js
let response = await ajax("https://api.nuget.org/v3/index.json");
console.log(response.responseObject);
```