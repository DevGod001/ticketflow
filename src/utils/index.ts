


export function createPageUrl(pageName: string, queryParams?: string) {
    const basePath = '/' + pageName.toLowerCase().replace(/ /g, '-');
    return queryParams ? `${basePath}?${queryParams}` : basePath;
}
