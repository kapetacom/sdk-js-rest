//We want dates as numbers
import {Pageable, PageableHandler, TYPE_PAGEABLE} from "./pageable";

export const JSONStringifyReplacer = function (this: any, key: string, value: any) {
    if (this[key] instanceof Date) {
        return this[key].getTime();
    }
    return value;
};

export const parseRequestValue = (name: string, value: any): { [key: string]: string[] } => {
    if (typeof value === 'number') {
        return { [name]: [value.toString()] };
    }

    if (typeof value === 'boolean') {
        return { [name]: [value.toString()] };
    }

    if (value instanceof Date) {
        return { [name]: [value.getTime().toString()] };
    }

    if (typeof value === 'string') {
        return { [name]: [value] };
    }

    if (Array.isArray(value)) {
        return { [name]: value };
    }

    if ('length' in value && typeof value.length === 'number') {
        // Array-like
        return parseRequestValue(name, Array.from(value));
    }

    if (typeof value === 'object') {
        const output: { [key: string]: string[] } = {};
        for (const [key, innerValue] of Object.entries(value as { [key: string]: string | string[] })) {
            if (Array.isArray(innerValue)) {
                output[key] = innerValue;
                continue;
            }
            output[key] = [innerValue.toString()];
        }
        return output;
    }

    return { [name]: [value] };
};

export const toHeaders = (name: string, value: any, typeName?: string): Headers => {
    const data = parseRequestValue(name, value);
    const out = new Headers();

    Object.entries(data).forEach(([key, values]) => {
        values.forEach((value) => {
            out.append(key, value);
        });
    });

    return out;
};

export const toQueryParams = (name: string, value: any, typeName?: string) => {
    const out = new URLSearchParams();
    if (TYPE_PAGEABLE === typeName) {
        // Special handling for pageable
        return PageableHandler.toQueryParams(value as Pageable);
    }
    const data = parseRequestValue(name, value);
    Object.entries(data).forEach(([key, values]) => {
        values.forEach((value) => {
            out.append(key, value);
        });
    });
    return out;
};
