export function onRequest(context) {
    const apiKey = context.env.API_KEY;
    return new Response(apiKey);
}