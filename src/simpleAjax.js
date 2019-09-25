const ajax = (function () {

    const Request = XMLHttpRequest;

    if (!Request)
        throw new Error("XMLHttpRequest is unavailable");

    const defaultSettings = {
        url: "",
        type: "GET",
        content: null,
        success: null,
        error: null,
        statusCode: null,
        headers: null
    };

    function serializeContent(content) {
        if (!content)
            return new FormData();

        if (content instanceof HTMLFormElement)
            return new FormData(content);

        if (typeof content === "string") {
            let selectedValue = document.querySelector(content);
            if (selectedValue instanceof HTMLFormElement)
                return new FormData(selectedValue);
        }

        let data = new FormData();

        if (typeof content === "object") {
            for (let key in content)
                data.append(key, content[key]);
        } else {
            data.append("value", content);
        }

        return data;
    }

    function formDataToUrl(formData) {
        let url = "";
        for (let key of formData.keys()) {
            let encodedKey = encodeURIComponent(key);
            let values = formData.getAll(key);
            if (values.length == 1)
                url += `&${encodedKey}=${encodeURIComponent(values[0])}`;
            else
                for (let i = 0; i < values.length; ++i)
                    url += `&${encodedKey}[${i}]=${encodeURIComponent(values[i])}`;
        }
        return url.substring(1);
    }

    function parseHeaders(rawHeaders) {
        let headers = (rawHeaders || "")
            .split('\r\n')
            .map(line => {
                let parts = line.split(': ');
                return parts.length > 1 ? [parts.shift(), parts.join(': ')] : null;
            })
            .filter(x => x)
            .reduce((acc, val) => { acc[val[0]] = val[1]; return acc; }, {});

        headers.contains = function (name) {
            return this.hasOwnProperty(name.toLowerCase());
        };

        headers.get = function(name) {
            return this[name.toLowerCase()];
        };

        return headers;
    }

    function installHeaders(request, headers) {
        if (headers && typeof headers === "object") 
            for (let key in headers)
                request.setRequestHeader(key, headers[key]);
    }

    function isErrorStatus(status) {
        status = Number(status);
        return isNaN(status) || status >= 400 || status < 100;
    }

    function createRequest(url, formData, type, headers) {
        return new Promise(function (resolve) {
            type = (type || "GET").toUpperCase();
            let req = new Request();

            req.addEventListener("readystatechange", function () {
                if (req.readyState === 4) {
                    let result = {
                        response: req.response,
                        responseXML: req.responseXML,
                        responseText: req.responseText,
                        responseURL: req.responseURL,
                        responseType: req.responseType,
                        status: req.status,
                        statusText: req.statusText,
                        hasError: isErrorStatus(req.status),
                        headers: parseHeaders(req.getAllResponseHeaders())
                    };

                    if (!result.responseType) {
                        let contentType = result.headers["content-type"];
                        if (contentType) {
                            let parts = contentType.split('/');
                            contentType = parts[parts.length - 1].split(';')[0];
                            result.responseType = contentType;
                        }
                    }

                    Object.defineProperty(result, "value", {
                        get: function () {
                            if (this._responseObject === undefined) {
                                if ((this.responseType || "text") === "text" || this.responseType === "json")
                                    try {
                                        this._responseObject = JSON.parse(this.response);
                                    } catch {
                                        this._responseObject = null;
                                    }
                                else
                                    this._responseObject = null;
                            }
                            return this._responseObject;
                        }
                    });
                    
                    resolve(result);
                }
            });

            if (type === "GET" || type === "HEAD") {
                let query = formDataToUrl(formData);
                req.open(type, url + (query ? "?" : "") + query);
                installHeaders(req, headers);
                req.send();
            } else {
                req.open(type, url);
                installHeaders(req, headers);
                req.send(formData);
            }
        });
    }

    function createOptions(args) {
        if (typeof args[0] === "string")
            return createOptionsFromString(args[0], args[1]);
        else if (args[0] instanceof HTMLFormElement)
            return createOptionsFromForm(args[0], args[1]);
        return args[0] || {};
    }

    function createOptionsFromString(url, options) {
        return {
            url: url,
            ...(options || {})
        };
    }

    function createOptionsFromForm(form, options) {
        return {
            url: form.action,
            method: form.method,
            data: form,
            ...(options || {})
        };
    }

    const ajax = function () {
        let {
            url,
            method,
            type,
            data,
            content,
            success,
            error,
            statusCode,
            headers
        } = { 
            ...ajax.defaultSettings,
            ...createOptions([...arguments])
        };

        if (!url)
            throw new Error("URL wasn't specified");

        let formData = serializeContent(data || content);
        let request = createRequest(url, formData, method || type || "GET", headers);

        if (statusCode)
            request = request.then(response => {
                let func = statusCode[response.status];
                if (func)
                    func(response);
                return response;
            });

        if (success)
            request = request.then(response => { if (!response.hasError) success(response); return response; })

        if (error)
            request = request.then(response => { if (response.hasError) error(response); return response; })

        return request;
    };

    ajax.defaultSettings = defaultSettings;

    return ajax;

})();