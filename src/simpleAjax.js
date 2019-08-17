const ajax = (function() {

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

    function createRequest(url, formData, type) { 
        return new Promise(function(resolve) {
            type = (type || "GET").toUpperCase();
            let req = new Request();
    
            req.addEventListener("readystatechange", function() {
                if (req.readyState == 4) {
                    let result = {
                        response: req.response,
                        responseXML: req.responseXML,
                        responseText: req.responseText,
                        responseURL: req.responseURL,
                        responseType: req.responseType,
                        status: req.status,
                        statusText: req.statusText
                    };
                    Object.defineProperty(result, "responseObject", {
                        get: function() {
                            if ((this.responseType || "text") === "text" || this.responseType === "json")
                                try {
                                    return JSON.parse(this.response);
                                } catch { }
                            return null;
                        }
                    });
                    resolve(result);
                }
            })
    
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

    return function() {
        let {
            url,
            method,
            type,
            data,
            content,
            success,
            error,
            statusCode
        } = (typeof arguments[0] === "string" ? arguments[1] : arguments[0] || arguments[1]) || {};

        if (typeof arguments[0] === "string")
            url = arguments[0];

        if (!url)
            throw new Error("URL wasn't specified");

        let formData = serializeContent(data || content);
        let request = createRequest(url, formData, method || type || "GET");

        if (statusCode)
            request = request.then(response => {               
                let func = statusCode[Number(response.status)] || statusCode[response.status+""];
                if (func)
                    func(response);
                return response; 
            });

        request = request.then(response => {
            if (!response || isErrorStatus(response.status))
                throw response;
            return response;
        });

        if (success)
            request = request.then(response => { success(response); return response; })

        if (error)
            request = request.catch(response => { error(response); return response; })

        return request;
    };
    
})();