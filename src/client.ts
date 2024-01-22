/**
 * Copyright 2023 Kapeta Inc.
 * SPDX-License-Identifier: MIT
 */
import { Fetcher, Options, RequestArgument, RequestArgumentTransport, RequestMethod, RestError } from './types.js';
import { JSONStringifyReplacer, toHeaders, toQueryParams } from './helpers.js';

export class RestClientRequest<ReturnType = any> {
    private readonly _baseUrl: string;
    private readonly _path: string;
    private readonly _method: RequestMethod;
    private readonly _requestArguments: RequestArgument[];
    private readonly _headers: { [key: string]: string } = {};
    private timeout: number = BaseRestClient.getDefaultTimeout();

    private readonly fetcher: Fetcher;

    constructor(
        fetcher: Fetcher,
        baseUrl: string,
        method: RequestMethod,
        path: string,
        requestArguments: RequestArgument[]
    ) {
        while (path.startsWith('/')) {
            path = path.substring(1);
        }

        this.fetcher = fetcher;
        this._baseUrl = baseUrl;
        this._path = path;
        this._method = method;
        this._requestArguments = requestArguments;
    }

    public get url() {
        return this._baseUrl + this._path;
    }

    public withTimeout(timeout: number) {
        this.timeout = timeout;
        return this;
    }

    public get method() {
        return this._method;
    }

    public get arguments() {
        return [...this._requestArguments];
    }

    public get headers() {
        return {
            ...this._headers,
        };
    }

    public withHeader(name: string, value: string) {
        this._headers[name] = value;
        return this;
    }

    public withAuthorization(auth: string) {
        return this.withHeader('Authorization', auth);
    }

    public withBearerToken(token: string) {
        return this.withAuthorization(`Bearer ${token}`);
    }

    public withContentType(contentType: string) {
        return this.withHeader('Content-Type', contentType);
    }

    public async call(): Promise<ReturnType | null> {

        const abortController = new AbortController();
        let abortTimeout:NodeJS.Timeout|undefined = undefined;
        if (this.timeout > 0) {
            abortTimeout = setTimeout(() => {
                abortController.abort();
            }, this.timeout);
        }

        const opts = this.createOptions();
        let result: Response;
        try {
            result = await this.fetcher(opts.url, {
                ...opts.init,
                signal: abortController.signal,
            });
        } finally {
            if (abortTimeout) {
                clearTimeout(abortTimeout);
            }
        }

        if (result.status === 404) {
            return null;
        }

        let output: ReturnType | null = null;
        if (result.headers.get('content-type')?.startsWith('application/json')) {
            //Only parse json if content-type is application/json
            const text = await result.text();
            output = text ? (JSON.parse(text) as ReturnType) : null;
        }

        if (result.status >= 400) {
            const error =
                output && typeof output === 'object' && 'error' in output && typeof output.error === 'string'
                    ? output.error
                    : 'Unknown error';
            throw new RestError(error, result);
        }

        return output;
    }

    private createOptions(): Options {
        const query = new URLSearchParams();
        const headers = new Headers({
            ...this._headers,
            accept: 'application/json',
        });

        const out: Options = {
            url: this.url,
            init: {
                method: this.method,
                headers
            },
        };


        this._requestArguments.forEach((requestArgument) => {
            const transport = requestArgument.transport?.toLowerCase() as Lowercase<RequestArgumentTransport>;
            const valueIsEmpty = requestArgument.value === undefined || requestArgument.value === null;
            switch (transport) {
                case 'path':
                    out.url = out.url.replace(
                        '{' + requestArgument.name + '}',
                        valueIsEmpty ? '' : requestArgument.value
                    );
                    break;
                case 'header':
                    if (!valueIsEmpty) {
                        const headerValues = toHeaders(
                            requestArgument.name,
                            requestArgument.value,
                            requestArgument.typeName
                        );
                        headerValues.forEach((value, name) => {
                            headers.append(name, value);
                        });
                    }
                    break;
                case 'body':
                    if (!headers.has('content-type')) {
                        headers.set('content-type', 'application/json');
                    }
                    out.init.body = JSON.stringify(
                        requestArgument.value === undefined ? null : requestArgument.value,
                        JSONStringifyReplacer
                    );
                    break;
                case 'query':
                    if (!valueIsEmpty) {
                        const queryValues = toQueryParams(
                            requestArgument.name,
                            requestArgument.value,
                            requestArgument.typeName
                        );
                        queryValues.forEach((value, name) => {
                            query.append(name, value);
                        });
                    }
                    break;
                default:
                    transport satisfies never;
                    throw new Error('Unknown argument transport: ' + requestArgument.transport);
            }
        });

        if (query.size > 0) {
            out.url += '?' + query.toString();
        }
        return out;
    }
}

export class BaseRestClient {
    private static defaultTimeout: number = 30000;
    private static defaultHeaders: { [key: string]: string } = {};

    public static setDefaultTimeout(timeout: number) {
        this.defaultTimeout = timeout;
    }

    public static getDefaultTimeout() {
        return this.defaultTimeout;
    }

    private static globalHeaders: { [key: string]: string } = {};
    static setHeader(name: string, value: string | undefined) {
        if (!value) {
            delete this.globalHeaders[name];
            return this;
        }
        this.globalHeaders[name] = value;
        return this;
    }

    static setAuthorization(auth: string | undefined) {
        return this.setHeader('Authorization', auth);
    }

    static setBearerToken(token: string | undefined) {
        return this.setAuthorization(token ? `Bearer ${token}` : token);
    }

    private readonly fetcher: Fetcher;
    private _baseUrl: string = '';
    private timeout: number = BaseRestClient.getDefaultTimeout();
    private _fixedHeaders: { [key: string]: string } = {};

    /**
     * Initialise rest client
     */
    constructor(fetcher: Fetcher, baseUrl: string) {
        this.fetcher = fetcher;
        this.$baseUrl = baseUrl;
    }

    public $withTimeout(timeout: number) {
        this.timeout = timeout;
        return this;
    }

    protected set $baseUrl(baseUrl: string) {
        if (!baseUrl) {
            baseUrl = '/';
        }

        if (!baseUrl.endsWith('/')) {
            baseUrl += '/';
        }

        this._baseUrl = baseUrl;
    }

    public get $baseUrl() {
        return this._baseUrl;
    }

    public $withHeader(name: string, value: string | undefined) {
        if (!value) {
            delete this._fixedHeaders[name];
            return this;
        }
        this._fixedHeaders[name] = value;
        return this;
    }

    public $withContentType(contentType: string | undefined) {
        return this.$withHeader('Content-Type', contentType);
    }

    public $withAuthorization(auth: string | undefined) {
        return this.$withHeader('Authorization', auth);
    }

    public $withBearerToken(token: string | undefined) {
        return this.$withAuthorization(token ? `Bearer ${token}` : token);
    }

    protected $afterCreate(request: RestClientRequest): void {
        // Override this method to add additional headers or similar to all requests
    }

    public $create<ReturnType = any>(
        method: RequestMethod,
        path: string,
        requestArguments: RequestArgument[]
    ): RestClientRequest<ReturnType> {
        const request = new RestClientRequest<ReturnType>(
            this.fetcher,
            this._baseUrl,
            method,
            path,
            requestArguments
        );
        request.withTimeout(this.timeout);

        Object.entries(BaseRestClient.globalHeaders).forEach(([key, value]) => {
            request.withHeader(key, value);
        });

        Object.entries(this._fixedHeaders).forEach(([key, value]) => {
            request.withHeader(key, value);
        });

        this.$afterCreate(request);
        return request;
    }

    /**
     * Executes a request to the specified path using the specified method.
     */
    public $execute<ReturnType = any>(method: RequestMethod, path: string, requestArguments: RequestArgument[]) {
        const request = this.$create<ReturnType>(method, path, requestArguments);

        return request.call();
    }
}
