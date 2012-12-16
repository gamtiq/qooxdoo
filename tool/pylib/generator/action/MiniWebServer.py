#!/usr/bin/env python
# -*- coding: utf-8 -*-
################################################################################
#
#  qooxdoo - the new era of web development
#
#  http://qooxdoo.org
#
#  Copyright:
#    2006-2012 1&1 Internet AG, Germany, http://www.1und1.de
#
#  License:
#    LGPL: http://www.gnu.org/licenses/lgpl.html
#    EPL: http://www.eclipse.org/org/documents/epl-v10.php
#    See the LICENSE file in the project's top-level directory for details.
#
#  Authors:
#    * Thomas Herchenroeder (thron7)
#
################################################################################

##
# Start a Mini Web Server to export applications and their libraries.
##

import sys, os, re, types, codecs, string, socket
import BaseHTTPServer, CGIHTTPServer

from misc import Path, filetool
from generator import Context

log_levels = {
  "debug"   : 10,
  "info"    : 20,
  "warning" : 30,
  "error"   : 40,
  "fatal"   : 50,
}
log_level = "error"



class RequestHandler(CGIHTTPServer.CGIHTTPRequestHandler):
    # idea: restrict access from 'localhost' only (parse RequestHandler.request), 
    # to prevent exposing the local file system to outsiders

    # @overridden from BaseHTTPServer
    def log_request(self, code='-', size='-'):
        if log_levels[log_level] <= log_levels['info']:
            self.log_message('"%s" %s %s', self.requestline, str(code), str(size))

    # @overridden from BaseHTTPServer
    def log_error(self, format, *args):
        if log_levels[log_level] <= log_levels['error']:
            self.log_message(format, *args)


def get_doc_root(jobconf, confObj):
    libs = jobconf.get("library", [])
    lib_paths = []
    for lib in libs:
        lpath = confObj.absPath(lib.path)
        lpath = os.path.normcase(lpath) # for os.path.commonprefix on win32
        lib_paths.append(lpath)
    croot = os.path.dirname(os.path.commonprefix(lib_paths))
    return croot

def from_doc_root_to_app_root(jobconf, confObj, doc_root):
    japp_root = jobconf.get("compile-options/paths/app-root", "source")
    app_root = os.path.normpath(os.path.join(confObj.absPath(japp_root), 'index.html'))
    _, _, url_path = Path.getCommonPrefix(doc_root, app_root)
    url_path = Path.posifyPath(url_path)
    return url_path


##
# Get a (presumably) free port on this machine.
# - Alert: Might run into race conditions with other programs.
def search_free_port():
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(('',0))
    port = sock.getsockname()[1]
    sock.close()
    # maybe we should wait a bit here?!
    return port
    
def runWebServer(jobconf, confObj):
    global log_level
    console = Context.console
    owd = os.getcwdu()
    log_level = jobconf.get("web-server/log-level", "error")
    server_port = jobconf.get("web-server/server-port", False)
    if server_port in (False, 0):
        server_port = search_free_port()
    if jobconf.get("web-server/allow-remote-access", False):
        server_interface = ""
    else:
        server_interface = "localhost"

    libs = jobconf.get("library", [])
    # return if not libs
    for lib in libs:
        lib._init_from_manifest()

    doc_root = jobconf.get("web-server/document-root", "") or get_doc_root(jobconf, confObj)
    app_web_path = from_doc_root_to_app_root(jobconf, confObj, doc_root)
    os.chdir(doc_root)

    server = BaseHTTPServer.HTTPServer(
        (server_interface, server_port), RequestHandler)
    console.info("Starting web server on port '%d', document root is '%s'" % (server_port, doc_root))
    if server_interface == 'localhost':
        console.info("For security reasons, connections are only allowed from 'localhost'")
    else:
        console.warn("This server allows remote file access and indexes for the document root and beneath!")
    console.info("Access your source application under 'http://localhost:%d/%s'" % (server_port, app_web_path))
    console.info("Terminate the web server with Ctrl-C")
    server.serve_forever()

##
# Generate a local .conf file for a specific httpd.
# Supported httpd: apache2, lighttpd, (TODO: nginx)
def generateHttpdConfig(jobconf, confObj):
    console = Context.console
    # read config
    jconf_app_namespace = jobconf.get("let/APPLICATION")
    assert jconf_app_namespace
    jconf_conf_dir = jobconf.get("web-server-config/output-dir", ".")
    jconf_conf_dir = confObj.absPath(jconf_conf_dir)
    jconf_template_dir = jobconf.get("web-server-config/template-dir")
    assert jconf_template_dir
    jconf_httpd_type = jobconf.get("web-server-config/httpd-type", "apache2")
    jconf_httpd_hosturl = jobconf.get("web-server-config/httpd-host-url", "http://localhost")

    libs = jobconf.get("library", [])
    assert libs
    for lib in libs:
        lib._init_from_manifest()

    config_path = os.path.join(jconf_conf_dir, jconf_httpd_type + ".conf")
    template_path = os.path.join(jconf_template_dir, "httpd." + jconf_httpd_type + ".tmpl.conf")
    alias_path = jconf_app_namespace.replace(".", "/")

    # collect config values
    value_map = {
        "APP_HTTPD_CONFIG"      : "",
        "LOCALHOST_APP_URL"     : "",
        "APP_NAMESPACE_AS_PATH" : "",
        "APP_DOCUMENT_ROOT"     : "",
    }

    value_map['APP_HTTPD_CONFIG'] = config_path

    doc_root = get_doc_root(jobconf, confObj)
    value_map['APP_DOCUMENT_ROOT'] = ensure_trailing_slash(doc_root)

    app_web_path = from_doc_root_to_app_root(jobconf, confObj, doc_root)
    value_map['LOCALHOST_APP_URL'] = "/".join((jconf_httpd_hosturl, alias_path, app_web_path))

    value_map['APP_NAMESPACE_AS_PATH'] = alias_path

    # load httpd-specific template
    config_templ = filetool.read(template_path)
    # replace macros
    config_templ = string.Template(config_templ)
    config = config_templ.safe_substitute(value_map)
    # write .conf file
    console.info("Writing configuration file for '%s': '%s'" % (jconf_httpd_type, config_path))
    filetool.save(config_path, config)
    console.info("See the file's comments how to integrate it with the web server configuration")
    console.info("Then open your source application with '%s'" % value_map['LOCALHOST_APP_URL'])

def ensure_trailing_slash(s):
    if s[-1] != '/':
        return s + '/'
    else:
        return s
