// tslint:disable: no-magic-numbers
// NOTE: wrapper for handlers (response is set from returned value)
export const handlerAdapter = (f: (context: any) => Promise<any>) => async (context: any) => {
    const res = await f(context);
    context.res = res;
};

export const statusWithMessage = (statusCode: number) => (message: any) => {
    return {
        statusCode,
        body: message,
    };
};
export const success = statusWithMessage(200);
export const notFound = statusWithMessage(404);
