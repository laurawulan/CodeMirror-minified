(function (mod) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
        mod(require("codemirror/lib/codemirror"));
    else if (typeof define == "function" && define.amd) // AMD
        define(["codemirror/lib/codemirror"], mod);
    else // Plain browser env
        mod(CodeMirror);
})(function (CodeMirror) {
    "use strict";
    const GUTTER_ID = "CodeMirror-sfdc-markers";

    // Clear errors on Gutter
    CodeMirror.defineExtension("clearSfdcMarkers", function () {
        var cm = this;
        clearSfdcMarks(cm);
    });

    // Mark errors
    CodeMirror.defineExtension("showSfdcMarkers", function (errors) {
        var cm = this;
        clearSfdcMarks(cm);
        var state = cm.state.sfdc;

        var annotations = parseErrors(errors);
        for (var line = 0; line < annotations.length; ++line) {
            var anns = annotations[line];
            if (!anns) continue;

            var maxSeverity = null;
            var tipLabel = document.createDocumentFragment();

            for (var i = 0; i < anns.length; ++i) {
                var ann = anns[i];
                var severity = ann.severity;
                if (!severity) severity = "error";
                maxSeverity = getMaxSeverity(maxSeverity, severity);
                tipLabel.appendChild(annotationTooltip(ann));

                if (ann.to) {
                    state.marked.push(cm.markText(ann.from, ann.to, {
                        className: "CodeMirror-sfdc-marktext-" + severity,
                        __annotation: ann
                    }));
                }
            }

            cm.setGutterMarker(line, GUTTER_ID, makeMarker(cm, tipLabel, maxSeverity, anns.length > 1, true));
        }
    });

    function clearSfdcMarks(cm) {
        var state = cm.state.sfdc;
        cm.clearGutter(GUTTER_ID);
        if (state.marked && state.marked.length > 0) {
            for (var i = 0; i < state.marked.length; ++i)
                state.marked[i].clear();
            state.marked.length = 0;
        }
    }

    function annotationTooltip(ann) {
        var severity = ann.severity;
        if (!severity) severity = "error";
        var tip = document.createElement("div");
        tip.className = "CodeMirror-sfdc-message-" + severity;
        if (typeof ann.messageHTML != 'undefined') {
            tip.innerHTML = ann.messageHTML;
        } else {
            tip.appendChild(document.createTextNode(ann.message));
        }
        return tip;
    }

    function getMaxSeverity(a, b) {
        if (a && a === "error") return a;
        else return b;
    }

    function parseErrors(errors) {
        var lines = [];
        for (var i = 0; i < errors.length; i++) {
            var error = errors[i];
            if (error) {
                if (!Number.isInteger(error.line) || error.line <= 0 ) {
                    continue;
                }

                var from, to;
                if (Number.isInteger(error.character) && error.character >= 1) {
                    var start = error.character - 1;
                    var end = start + 1;
                    if (error.evidence && error.evidence.length > 0) {
                        end = start +  error.evidence.length;
                        // var index = error.evidence.substring(start).search(/\s/);
                        // if (index > -1) {
                        //     end += index;
                        // }
                    }
                    from = CodeMirror.Pos(error.line - 1, start);
                    to = CodeMirror.Pos(error.line - 1, end);
                } else {
                    from = CodeMirror.Pos(error.line - 1);
                    to = CodeMirror.Pos(error.line - 1);
                }

                // Convert to format expected by validation service
                var line = error.line - 1;
                (lines[line] || (lines[line] = [])).push({
                    line: line,
                    message: error.message,
                    severity: error.severity,
                    from: from,
                    to: to
                });
            }
        }

        return lines;
    }

    function makeMarker(cm, labels, severity, multiple, tooltips) {
        var marker = document.createElement("div"), inner = marker;
        marker.className = "CodeMirror-sfdc-marker-" + severity;
        if (multiple) {
            inner = marker.appendChild(document.createElement("div"));
            inner.className = "CodeMirror-sfdc-marker-multiple";
        }

        if (tooltips != false) CodeMirror.on(inner, "mouseover", function(e) {
            showTooltipFor(cm, e, labels, inner);
        });

        return marker;
    }

    function showTooltip(cm, e, content) {
        var tt = document.createElement("div");
        tt.className = "CodeMirror-sfdc-tooltip cm-s-" + cm.options.theme;
        tt.appendChild(content.cloneNode(true));
        // if (cm.state.lint.options.selfContain)
            // cm.getWrapperElement().appendChild(tt);
        // else
            document.body.appendChild(tt);

        function position(e) {
            if (!tt.parentNode) return CodeMirror.off(document, "mousemove", position);
            tt.style.top = Math.max(0, e.clientY - tt.offsetHeight - 5) + "px";
            tt.style.left = (e.clientX + 5) + "px";
        }
        // CodeMirror.on(document, "mousemove", position);
        position(e);
        if (tt.style.opacity != null) tt.style.opacity = 1;
        return tt;
    }
    function rm(elt) {
        if (elt.parentNode) elt.parentNode.removeChild(elt);
    }
    function hideTooltip(tt) {
        if (!tt.parentNode) return;
        if (tt.style.opacity == null) rm(tt);
        tt.style.opacity = 0;
        setTimeout(function() { rm(tt); }, 600);
    }

    function showTooltipFor(cm, e, content, node) {
        var tooltip = showTooltip(cm, e, content);
        function hide() {
            CodeMirror.off(node, "mouseout", hide);
            if (tooltip) { hideTooltip(tooltip); tooltip = null; }
        }
        // var poll = setInterval(function() {
        //     if (tooltip) for (var n = node;; n = n.parentNode) {
        //         if (n && n.nodeType == 11) n = n.host;
        //         if (n == document.body) return;
        //         if (!n) { hide(); break; }
        //     }
        //     if (!tooltip) return clearInterval(poll);
        // }, 400);
        CodeMirror.on(node, "mouseout", hide);
    }

    CodeMirror.defineOption("sfdc", false, function(cm, val, old) {
        if (old && old != CodeMirror.Init) {
            clearSfdcMarks();
            delete cm.state.sfdc;
        }

        if (val) {
            cm.state.sfdc = { marked: [] };
        }
    });
});