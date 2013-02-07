/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2013 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Daniel Wagner (danielwagner)

************************************************************************ */

/**
 * A wrapper around SinonJS's FakeXMLHttpRequest and FakeServer features that
 * allows quick and simple configuration of mock HTTP backends for testing and
 * development.
 * Automatically creates URL filtering rules to ensure that only configured
 * requests are faked while others will be processed normally by the browser's
 * XHR implementation.
 *
 * The following example shows how to configure mock responses for two different
 * requests:
 * <pre class="javascript">
 *   var responseData = [
 *     {
 *       method: "GET",
 *       url: /\/api\/resource\/\d+/,
 *       response : function(request) {
 *         var status = 200;
 *         var headers = { "Content-Type": "application/json" };
 *         var responseData = {
 *           description: "Mock REST response for resource " + request.url
 *         };
 *         var body = qx.lang.Json.stringify(responseData);
 *         request.respond(status, headers, body);
 *       }
 *     },
 *     {
 *       method: "GET",
 *       url: "/users/{userId}",
 *       response: [
 *         200,
 *         { "Content-Type": "application/json" },
 *         qx.lang.Json.stringify({userId: 'someUser'})
 *       ]
 *     }
 *   ];
 *
 *   qx.dev.FakeServer.getInstance().configure(responseData);
 * </pre>
 */
qx.Class.define("qx.dev.FakeServer", {

  type: "singleton",

  extend: qx.core.Object,

  construct : function() {
    this.getFakeServer();
    this.__urlRegExps = [];
  },

  members :
  {
    __sinon : null,
    __fakeServer: null,
    __urlRegExps: null,


    /**
     * Configures a set of fake HTTP responses. Each response is defined as a map
     * that must provide the following keys:
     * <ul>
     *   <li><code>method</code> HTTP method to respond to, e.g. <code>PUT</code></li>
     *   <li><code>url</code> URL used to match requests to fake responses. Can be
     *   a RegExp or a String. REST-style parameter placeholders in curly braces
     *   will be replaced with wildcards, e.g. the string "/resource/{resourceId}"
     *   is interpreted as the RegExp <code>/\/resource\/\{.*?\}/</code>
     *   <li><code>response</code> This can be either:
     *     <ul>
     *       <li>a string: This will be the response body, status code will be 200</li>
     *       <li>an array containing the status code, a map of response headers and
     *         the response text, e.g. <code>[200, { "Content-Type": "text/html" }, "OK"]</code>
     *       </li>
     *       <li>a function: This will be called with a FakeXMLHttpRequest object as
     *       the only argument. Its <code>respond</code> method must be called to send a response.
     *       See {@link http://sinonjs.org/docs/#respond} for details.
     *       </li>
     *     </ul>
     *   </li>
     * </ul>
     *
     * @param responseData {Map[]} An array of response description maps.
     */
    configure : function(responseData) {
      responseData.forEach(function(item) {
        var urlRegExp = item.url instanceof RegExp ? item.url : this._getRegExp(item.url);
        if (!qx.lang.Array.contains(this.__urlRegExps, urlRegExp)) {
          this.__urlRegExps.push([item.method, urlRegExp]);
        }
        this.respondWith(item.method, urlRegExp, item.response);
      }.bind(this));

      var regExps = this.__urlRegExps;
      var filter = function(method, url, async, username, password) {
        for (var i=0, l=regExps.length; i<l; i++) {
          var filterMethod = regExps[i][0];
          var regExp = regExps[i][1];
          if (method == filterMethod && regExp.test(url)) {
            return false;
          }
        }
        return true;
      };
      this.addFilter(filter);
    },


    /**
     * Adds a URL filtering function to decide whether a request should be handled
     * by the FakeServer or passed to the regular XMLHttp implementation.
     * See {@link http://sinonjs.org/docs/#filtered-requests}
     * for details.
     *
     * @param filter {Function} URL filter function. Will be called with the
     * following arguments: <code>method</code>, <code>url</code>, <code>async</code>,
     * <code>username</code>, <code>password</code>. Must return <code>true</code>
     * if the request should not be faked.
     */
    addFilter : function(filter) {
      if (qx.core.Environment.get("qx.debug")) {
        qx.core.Assert.assertFunction(filter);
      }

      this.__sinon.FakeXMLHttpRequest.addFilter(filter);
    },


    /**
     * Defines a fake XHR response to a matching request.
     *
     * @param method {String} HTTP method to respond to, e.g. "GET"
     * @param urlRegExp {RegExp} Request URL must match match this expression
     * @param response {Function|Array|String} Response to send. See
     * {@link http://sinonjs.org/docs/#fakeServer} for details.
     */
    respondWith : function(method, urlRegExp, response) {
      this.__fakeServer.respondWith(method, urlRegExp, response);
    },


    /**
     * Creates and configures a FakeServer if necessary and returns it.

     * @return {Object} FakeServer object
     */
    getFakeServer : function() {
      if (!this.__fakeServer) {
        var sinon = this.__sinon = qx.dev.unit.Sinon.getSinon();
        sinon.FakeXMLHttpRequest.useFilters = true;
        this.__fakeServer = sinon.sandbox.useFakeServer();
        this.__fakeServer.autoRespond = true;
      }
      return this.__fakeServer;
    },


    /**
     * Stops the FakeServer
     */
    restore: function() {
      if (this.__fakeServer) {
        this.__fakeServer.restore();
      }
    },


    /**
     * Returns a RegExp using the given pattern. Curly brackets and anything
     * between are replaced with wildcards (.*?)
     *
     * @param pattern {String} RegExp pattern
     * @return {RegExp} Regular Expression
     */
    _getRegExp : function(pattern) {
      pattern = pattern.replace(/\{[^\/]*?\}/g, ".*?");
      return new RegExp(pattern);
    }
  },


  destruct: function() {
    this.restore();
    this.__fakeServer = this.__sinon = null;
  }

});
