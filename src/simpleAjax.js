class AjaxResult {

    constructor(req) {
        if (!req || req.readyState !== 4)
            throw new Error("Request has no result");

        this.request = req;
        this.response = req.response;
        this.url = req.responseURL;
        this.status = req.status;
        this.statusText = req.statusText;
        this.hasError = !(req.status >= 100 && req.status < 400);
    }

    get document() {
        return this._get("document", () => {
            let doc = this.request.responseXML;
            
            if (!doc) {
                let contentType = this.headers["content-type"];
                if (contentType && (contentType.includes("xml") || contentType.includes("html")))
                    doc = new DOMParser().parseFromString(this.text, contentType.split(';')[0]);
            }

            return doc;
        });
    }

    get text() {
        return this._get("text", () => this.request.responseText || (this.response || "").toString());
    }

    get headers() {
        return this._get("headers", () => {
            let rawHeaders = this.request.getAllResponseHeaders();

            let result = (rawHeaders || "")
            .split('\r\n')
            .map(line => {
                let parts = line.split(': ');
                return parts.length > 1 ? [parts.shift(), parts.join(': ')] : null;
            })
            .filter(x => x)
            .reduce((acc, val) => { acc[val[0]] = val[1]; return acc; }, {});

            result.contains = function (name) {
                return this.hasOwnProperty(name.toLowerCase());
            };

            result.get = function(name) {
                return this[name.toLowerCase()];
            };

            return result;
        });
    }
    
    get type() {
        return this._get("type", () => { 
            let type = this.request.responseType;

            if (!type) {
                type = this.headers["content-type"];
                if (type) {
                    let parts = type.split('/');
                    type = parts[parts.length - 1].split(';')[0];
                }
            }
            
            return type;
        });
    }

    get value() {
        return this._get("value", () => JSON.parse(this.text));
    }

    _get(name, init) {
        let cacheName = `_${name}`;
        if (this[cacheName] === undefined) {
            try {
                this[cacheName] = init();
            } catch (e) {
                this[cacheName] = null;
            }
        }
        return this[cacheName];
    }

}

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
        headers: null,
        interval: 1000,
        confirmation: () => true,
        beforeSend: null,
        beforeReturn: null,
        modifier: null
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
            if (values.length === 1)
                url += `&${encodedKey}=${encodeURIComponent(values[0])}`;
            else
                for (let i = 0; i < values.length; ++i)
                    url += `&${encodedKey}[${i}]=${encodeURIComponent(values[i])}`;
        }
        return url.substring(1);
    }

    function installHeaders(request, headers) {
        if (headers && typeof headers === "object") 
            for (let key in headers)
                request.setRequestHeader(key, headers[key]);
    }

    function createRequest(url, formData, type, headers, modifier) {
        return new Promise(function (resolve) {
            type = type.toUpperCase();
            let req = new Request();

            if (typeof modifier.onProgress === "function")
                req.addEventListener("progress", modifier.onProgress);

            if (req.upload && typeof modifier.onUploadProgress === "function")
                req.upload.addEventListener("progress", modifier.onUploadProgress);

            req.addEventListener("readystatechange", function () {
                if (req.readyState === 4) {
                    let result = new AjaxResult(req);

                    if (typeof modifier.beforeReturn === "function")
                        modifier.beforeReturn(result, req);

                    resolve(result);
                }
            });

            if (type === "GET" || type === "HEAD") {
                let query = formDataToUrl(formData);
                req.open(type, url + (query ? "?" : "") + query);
                installHeaders(req, headers);
                if (typeof modifier.beforeSend === "function")
                    modifier.beforeSend(req);
                req.send();
            } else {
                req.open(type, url);
                installHeaders(req, headers);
                if (typeof modifier.beforeSend === "function")
                    modifier.beforeSend(req);
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
            headers,
            onProgress,
            onUploadProgress,
            beforeSend,
            beforeReturn,
            modifier    
        } = { 
            ...ajax.defaultSettings,
            ...createOptions([...arguments])
        };

        if (!url)
            throw new Error("URL wasn't specified");

        modifier = modifier || {};
        modifier.onProgress = modifier.onProgress || onProgress;
        modifier.onUploadProgress = modifier.onUploadProgress || onUploadProgress;
        modifier.beforeSend = modifier.beforeSend || beforeSend;
        modifier.beforeReturn = modifier.beforeReturn || beforeReturn;

        let formData = serializeContent(data || content);
        let request = createRequest(url, formData, method || type || "GET", headers, modifier);

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

HTMLFormElement.prototype.addAjax = function(handler, options) {
    options = options || {};
    let confirmation = options.confirmation;
    confirmation = typeof confirmation === "function" ? confirmation : ajax.defaultSettings.confirmation;
    let intervalMS = Number(options.interval);
    intervalMS = isNaN(intervalMS) || intervalMS < 0 ? ajax.defaultSettings.interval : intervalMS;
    
    let locked = false;
    let eventHandler;
    let reload = () => {
        if (locked)
            locked = false;
        else
            this.addEventListener("submit", eventHandler);
    };

    eventHandler = function (e) {
        Promise.resolve(confirmation.bind(this)()).then(confirmed => {
            if (confirmed !== false) {
                this.removeEventListener("submit", eventHandler);
                locked = true;
                setTimeout(reload, intervalMS);
                ajax(this, options).then(response => {
                    reload();
                    e.response = response;
                    handler.bind(this)(e);
                });
            }
        });
    };

    this.addEventListener("submit", e => e.preventDefault());
    this.addEventListener("submit", eventHandler);
};