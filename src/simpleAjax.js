const ajax = (function () {

    const Request = XMLHttpRequest;

    if (!Request)
        throw new Error("XMLHttpRequest is unavailable");

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

    function createRequest(url, formData, type, headers) {
        return new Promise(function (resolve) {
            type = (type || "GET").toUpperCase();
            let req = new Request();

            req.addEventListener("readystatechange", function () {
                if (req.readyState == 4) {
                    let result = {
                        response: req.response,
                        responseXML: req.responseXML,
                        responseText: req.responseText,
                        responseURL: req.responseURL,
                        responseType: req.responseType,
                        status: req.status,
                        statusText: req.statusText,
                        hasError: isErrorStatus(req.status)
                    };
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

            if (headers && typeof headers === "object") 
                for (let key in headers)
                    req.setRequestHeader(key, headers[key]);

            if (type === "GET" || type === "HEAD") {
                let query = formDataToUrl(formData);
                req.open(type, url + (query ? "?" : "") + query);
                req.send();
            } else {
                req.open(type, url);
                req.send(formData);
            }
        });
    }

    function isErrorStatus(status) {
        status = Number(status);
        return isNaN(status) || status >= 400 || status < 100;
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

    return function () {
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
        } = createOptions([...arguments]);

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
            request = request.then(response => { if (!isErrorStatus(response.status)) success(response); return response; })

        if (error)
            request = request.then(response => { if (isErrorStatus(response.status)) error(response); return response; })

        return request;
    };

})();