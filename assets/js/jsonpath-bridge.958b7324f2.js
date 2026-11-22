/* AK Premium — jsonpath-plus ESM bridge. External file (not inline) so the
   enforced CSP allows it: it imports the pinned ESM build and exposes it
   as window.JSONPath for the JSON Formatter. Content-hashed by build.py
   like the other first-party scripts. */
import{JSONPath} from "https://cdn.jsdelivr.net/npm/jsonpath-plus@10.3.0/dist/index-browser-esm.min.js";window.JSONPath={JSONPath};
