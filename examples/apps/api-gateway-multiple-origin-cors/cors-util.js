// this is the list of headers allowed by default by the API Gateway console
// see: https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html
// and: https://docs.aws.amazon.com/AmazonS3/latest/API/RESTCommonRequestHeaders.html
const DEFAULT_ALLOWED_HEADERS = [
    "Content-Type",        // indicates the media type of the resource
    "X-Amz-Date",          // the current date and time according to the requester (must be present for authorization)
    "Authorization",       // information required for request authentication
    "X-Api-Key",           // an AWS API key
    "X-Amz-Security-Token" // see link above
];

/**
 * Extract the Origin header from a Lambda event
 * @param event Lambda event
 */
exports.getOriginFromEvent = event => event.headers.Origin || event.headers.origin;

/**
 * Return an object literal that contains an Access-Control-Allow-Origin header
 * if the request origin matches a pattern for an allowed origin.
 * Otherwise, return an empty object literal.
 * @param {String} origin the origin to test against the allowed list
 * @param {Array} allowedOrigins A list of strings or regexes representing allowed origin URLs
 * @return {Object} an object containing allowed header and its value
 */
exports.makeOriginHeader = (origin, allowedOrigins) => {
    if (!origin)
        return {}; // no CORS headers necessary; browser will load resource

    // look for origin in list of allowed origins
    const isAllowed = allowedOrigins.some(allowedOrigin => origin.match(allowedOrigin));
    if (isAllowed)
        return {"Access-Control-Allow-Origin": origin};

    // the origin does not match any allowed origins
    return {}; // return no CORS headers; browser will not load resource
               // we do not return a "null" origin because this is exploitable
};

/**
 * Return an object literal that contains all headers necessary for a CORS
 * preflight.
 * @param {String} origin the origin to test against the allowed list
 * @param {Array} allowedOrigins see documentation for makeOriginHeader() 
 * @param {Array} allowedMethods a list of strings representing allowed HTTP methods
 * @param {Array} allowedHeaders (optional) a list of strings representing allowed headers
 * @return {Object} an object containing several header => value mappings
 */
exports.makeHeaders = (origin, allowedOrigins, allowedMethods, allowedHeaders = DEFAULT_ALLOWED_HEADERS) => {
    return Object.assign(exports.makeOriginHeader(origin, allowedOrigins), {
        "Access-Control-Allow-Headers": allowedHeaders.join(","),
        "Access-Control-Allow-Methods": allowedMethods.join(",")
    });
};

/**
 * Compiles a URL containing wildcards into a regular expression.
 * Using this is optional.
 * 
 * Builds a regular expression that matches exactly the input URL, but allows 
 * any number of URL characters in place of each wildcard (*) character.
 * http://*.example.com matches http://abc.xyz.example.com but not http://example.com
 * http://*.example.com does not match http://example.org/.example.com
 * @param {String} url the url to compile
 * @return {RegExp} compiled regular expression
 */
exports.compileURLWildcards = (url) => {
    // unreserved characters as per https://tools.ietf.org/html/rfc3986#section-2.3
    const urlUnreservedPattern = "[A-Za-z0-9\-._~]";
    const wildcardPattern = urlUnreservedPattern + "*";
    
    const parts = url.split("*");
    const escapeRegex = str => str.replace(/([.?*+^$(){}|[\-\]\\])/g, "\\$1");
    const escaped = parts.map(escapeRegex);
    return new RegExp("^" + escaped.join(wildcardPattern) + "$");
};