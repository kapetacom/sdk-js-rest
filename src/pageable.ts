import type { ParsedQs } from 'qs';

export const TYPE_PAGEABLE = 'Pageable';

export enum SortOrderDirection {
    ASC = 'ASC',
    DESC = 'DESC',
}

export interface SortOrder {
    direction?: SortOrderDirection;
    property: string;
}

export interface Sort {
    orders?: SortOrder[];
}

export interface Pageable {
    page?: number;
    size?: number;
    sort?: Sort;
}

export interface PageableQuery {
    page?: string;
    size?: string;
    sort?: string[];
}

const QuerySortMapper = (sortParam:string) => {
    const [property, directionString] = sortParam.split(',');
    const direction =
        directionString && directionString.toLowerCase() === 'desc'
            ? SortOrderDirection.DESC
            : SortOrderDirection.ASC;
    return {
        direction,
        property,
    };
}

export class PageableHandler implements Pageable {
    public readonly page?: number;
    public readonly size?: number;
    public readonly sort?: Sort;

    constructor(page?: number, size?: number, sort?: Sort) {
        this.page = page;
        this.size = size;
        this.sort = sort;
    }

    public getPage(defaultPage:number = 0): number {
        return this.page ?? defaultPage;
    }

    public getSize(defaultSize:number = 30): number {
        return this.size ?? defaultSize;
    }

    toJSON() {
        return {
            page: this.page,
            size: this.size,
            sort: this.sort,
        };
    }

    toString() {
        return this.toQueryParams().toString();
    }

    toQueryParams() {
        return PageableHandler.toQueryParams(this);
    }

    public static toQueryParams(pageable: Pageable): URLSearchParams {
        const params = new URLSearchParams();
        if (pageable === undefined) {
            return params;
        }
        if (pageable.page !== undefined) {
            params.set('page', pageable.page.toString());
        }
        if (pageable.size !== undefined) {
            params.set('size', pageable.size.toString());
        }
        pageable.sort?.orders?.forEach((order) => {
            params.append('sort', `${order.property},${order.direction ? order.direction.toLowerCase() : 'asc'}`);
        });

        return params;
    }

    public static fromQueryMap(map: PageableQuery) {

        const orders: SortOrder[] = map.sort?.map(QuerySortMapper) ?? [];

        return new PageableHandler(
            map.page && parseInt(map.page) || undefined,
            map.size && parseInt(map.size) || undefined,
            orders.length > 0 ? { orders } : undefined
        );
    }

    public static fromQueryParams(params: URLSearchParams): PageableHandler {
        const page = params.get('page');
        const size = params.get('size');
        const orders: SortOrder[] = params.getAll('sort').map(QuerySortMapper);

        return new PageableHandler(
            page && parseInt(page) || undefined,
            size && parseInt(size) || undefined,
            orders.length > 0 ? { orders } : undefined
        );
    }

    public static fromParsedQs(query: ParsedQs): PageableHandler {
        const page = query.page?.toString();
        const size = query.size?.toString();
        const orders: SortOrder[] = Array.isArray(query.sort) ?
            query.sort.map(q => QuerySortMapper(q.toString())) :
            [ QuerySortMapper(query.sort?.toString() ?? '') ];

        return new PageableHandler(
            page && parseInt(page) || undefined,
            size && parseInt(size) || undefined,
            orders.length > 0 ? { orders } : undefined
        );
    }

    public static fromQueryString(queryString: string): PageableHandler {
        return PageableHandler.fromQueryParams(new URLSearchParams(queryString));
    }
}
