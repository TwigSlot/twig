
/**
 * Base Handler.
 *
 */

 function BaseHandler(app) {
    this.app = app;
    this.app.setRenderPath([]);

    if (this.removeStack) {
        this.removeContextMenu();
    }
    this.contextMenuObject = null;
    this.contextMenuPoint = null;
    //this.app.ClearUndoStack();
    this.globalHoverObject = null;
}

// Need redraw or nor.
BaseHandler.prototype.needRedraw = false;
BaseHandler.prototype.objects = [];
BaseHandler.prototype.message = "";


BaseHandler.prototype.IsNeedRedraw = function (object) {
    return this.needRedraw;
}

BaseHandler.prototype.RestRedraw = function (object) {
    this.needRedraw = false;
}

BaseHandler.prototype.SetObjects = function (objects) {
    this.objects = objects;
}

BaseHandler.prototype.GetSelectedGraph = function (pos) {
    // Selected Graph.
    var res = null;
    for (var i = 0; i < this.app.graph.vertices.length; i++) {
        if (this.app.graph.vertices[i].HitTest(pos)) {
            // Select last of them.
            res = this.app.graph.vertices[i];
        }
    }


    return res;
}

BaseHandler.prototype.GetSelectedArc = function (pos) {
    // Selected Arc.
    for (var i = 0; i < this.app.graph.edges.length; i++) {
        var edge = this.app.graph.edges[i];

        if (edge.HitTest(new Point(pos.x, pos.y)))
            return edge;
    }

    return null;
}

BaseHandler.prototype.GetSelectedObject = function (pos) {
    var graphObject = this.GetSelectedGraph(pos);
    if (graphObject) {
        return graphObject;
    }

    var arcObject = this.GetSelectedArc(pos);
    if (arcObject) {
        return arcObject;
    }

    return null;
}


BaseHandler.prototype.GetUpText = function (object) {
    return "";
}


BaseHandler.prototype.GetMessage = function () {
    return this.message;
}

function listResources(mouseoverObject) {
    var infoResources = document.getElementById('info-resources')
    infoResources.innerHTML = ''
    var tagsDiv = document.getElementById('tags-div')
    tagsDiv.innerHTML = ''
    var infoTitle = document.getElementById('info-title');
    infoTitle.value = ''
    var infoUid = document.getElementById('info-uid')
    infoUid.textContent = 'Hover over something to see it'

    if(mouseoverObject == null) return;
    mouseoverObject.nodeInfo.resources = mouseoverObject.nodeInfo.resources.filter(function (el) {
        return el.link != '' || el.description != '';
    })
    mouseoverObject.nodeInfo.resources.forEach(function (item, index) {
        const aChild = document.createElement('a');
        aChild.href = item.link;
        aChild.target = '_blank'
        aChild.innerHTML = 'open';
        aChild.style = 'padding-left:10px'

        const inputChild = document.createElement('input');
        inputChild.value = item.link;
        inputChild.onchange = function (ev) {
            item.link = inputChild.value;
            aChild.href = item.link; 
            if (inputChild.value.indexOf('youtube.com') != -1) { // handle youtube loading
                var apiKey = '';
                apiKey = "AIzaSyD8mjjKuMprrGJjb3ZbZn7G5hS12_BsfzU";
                const youtubeID = inputChild.value.split('v=')[1].split('&')[0]
                const query = `https://www.googleapis.com/youtube/v3/videos?id=${youtubeID}&key=${apiKey}&part=snippet`
                console.log(query)
                var xhttp = new XMLHttpRequest();
                xhttp.onreadystatechange = function () {
                    if (this.readyState == 4) {
                        const obj = JSON.parse(xhttp.responseText);
                        if (/^\d+$/.test(mouseoverObject.nodeInfo.title)) {
                            mouseoverObject.nodeInfo.title = obj.items[0].snippet.title;
                            document.getElementById('info-title').value = mouseoverObject.nodeInfo.title;
                        }
                        item.description = obj.items[0].snippet.description;
                        listResources(mouseoverObject)
                        autosaveXML();
                    }
                }
                xhttp.open("GET", query, true);
                xhttp.send();
            }
            autosaveXML();
        }
        inputChild.style = 'width:80%'

        const textareaChild = document.createElement('textarea');
        textareaChild.value = item.description;
        textareaChild.style = "width:100%; resize:vertical;"
        textareaChild.rows = 4
        textareaChild.onchange = function (ev) {
            item.description = textareaChild.value;
            autosaveXML();
        }

        const liChild = document.createElement('li');
        liChild.append(inputChild)
        liChild.append(aChild)
        const textareaWrapper = $("<div style='padding-top:10px'></div>");
        textareaWrapper.append(textareaChild);
        liChild.append(textareaWrapper[0])
        liChild.id = item.uid;

        infoResources.prepend(liChild)
    });
    mouseoverObject.nodeInfo.tags.forEach(function (item, index) {
        var tag = $(`<span class='tag'>${item.name}</span>`);
        tag.on('mousedown', function (e) {
            if (e.which == 3) {
                mouseoverObject.nodeInfo.tags = mouseoverObject.nodeInfo.tags.filter(function (i) {
                    return i.name != e.currentTarget.textContent;
                });
                listResources(mouseoverObject);
                e.preventDefault();
            }
        })
        tag[0].addEventListener('contextmenu', e => {
            e.preventDefault();
        });

        tagsDiv.append(tag[0]);
    });
    autosaveXML();
}

BaseHandler.prototype.MouseMove = function (pos) { }

BaseHandler.prototype.MouseDown = function (pos) { }

BaseHandler.prototype.MouseUp = function (pos) { }

BaseHandler.prototype.GetSelectedGroup = function (object) {
    return 0;
}

BaseHandler.prototype.InitControls = function () {
    var vertex1Text = document.getElementById("Vertex1");
    if (vertex1Text) {
        var handler = this;
        vertex1Text.onchange = function () {
            for (var i = 0; i < handler.app.graph.vertices.length; i++) {
                if (handler.app.graph.vertices[i].mainText == vertex1Text.value) {
                    handler.SelectFirstVertexMenu(vertex1Text, handler.app.graph.vertices[i]);
                    break;
                }
            }
        };

        this.UpdateFirstVertexMenu(vertex1Text);
    }

    var vertex2Text = document.getElementById("Vertex2");
    if (vertex2Text) {
        var handler = this;
        vertex2Text.onchange = function () {
            for (var i = 0; i < handler.app.graph.vertices.length; i++) {
                if (handler.app.graph.vertices[i].mainText == vertex2Text.value) {
                    handler.SelectSecondVertexMenu(vertex2Text, handler.app.graph.vertices[i]);
                    break;
                }
            }
        };

        this.UpdateSecondVertexMenu(vertex2Text);
    }
}

BaseHandler.prototype.GetNodesPath = function (array, start, count) {
    var res = [];
    for (var index = start; index < start + count; index++) {
        res.push(this.app.graph.FindVertex(array[index].value));
    }
    return res;
}

BaseHandler.prototype.RestoreAll = function () {
}

BaseHandler.prototype.GetSelectVertexMenu = function (menuName) {
    var res = "<input list=\"vertexList" + menuName + "\" id=\"" + menuName + "\" class=\"SelectVertexInput\"/>" +
        "<datalist id=\"vertexList" + menuName + "\">";

    for (var i = 0; i < this.app.graph.vertices.length; i++) {
        res = res + "<option value=\"" + this.app.graph.vertices[i].mainText + "\"/>";
    }

    return res + "</datalist>";
}

BaseHandler.prototype.GetSelect2VertexMenu = function () {
    return "<span style=\"float:right\">" +
        this.GetSelectVertexMenu("Vertex1") + " &rarr; " + this.GetSelectVertexMenu("Vertex2") + "</span>";
}

BaseHandler.prototype.SelectFirstVertexMenu = function (vertex1Text, vertex) { }

BaseHandler.prototype.UpdateFirstVertexMenu = function () { }

BaseHandler.prototype.SelectSecondVertexMenu = function (vertex2Text, vertex) { }

BaseHandler.prototype.UpdateSecondVertexMenu = function () { }

BaseHandler.prototype.GetSelectedVertex = function () {
    return null;
}

BaseHandler.prototype.addContextMenu = function () {
    var $contextMenu = $("#contextMenu");

    var handler = this;

    $("#Context_Delete").click(function () {
        if (handler.contextMenuObject != null) {
            // handler.app.PushToStack("DeleteObject");
            handler.app.DeleteObject(handler.contextMenuObject);
            handler.app.redrawGraph();
            userAction("DeleteObject_contextMenu");
        }
    });

    $("#Context_Rename").click(function () {
        if (handler.contextMenuObject != null) {
            var callback = function (enumType) {
                handler.RenameVertex(enumType.GetVertexText(0), handler.contextMenuObject);
                userAction("RenameVertex_contextMenu");
            };
            var customEnum = new TextEnumVertexsCustom(handler.app);
            customEnum.ShowDialog(callback, g_rename, g_renameVertex, handler.contextMenuObject.mainText);
        }
    });

    $("#Context_Connect").click(function () {
        if (handler.contextMenuObject != null && handler.GetSelectedVertex() != null) {
            var addFunc = function (firstVertex, secondVertex, direct) {
                handler.app.CreateNewArc(firstVertex, secondVertex, direct,
                    document.getElementById('EdgeWeight').value,
                    $("#RadiosReplaceEdge").prop("checked"),
                    document.getElementById('EdgeLable').value);
                handler.app.redrawGraph();
            }
            handler.ShowCreateEdgeDialog(handler.GetSelectedVertex(), handler.contextMenuObject, addFunc);
        }
    });

    $("#Context_Delete_Edge").click(function () {
        if (handler.contextMenuObject != null) {
            // handler.app.PushToStack("DeleteObject");
            handler.app.DeleteObject(handler.contextMenuObject);
            handler.app.redrawGraph();
            userAction("DeleteObject_contextMenu");
        }
    });

    $("#Context_Edit_Edge").click(function () {
        if (handler.contextMenuObject != null) {
            handler.ShowEditEdgeDialog(handler.contextMenuObject);
        }
    });

    $("#Context_Add_Vertex").click(function () {
        // handler.app.PushToStack("Add");
        handler.app.CreateNewGraph(handler.contextMenuPoint.x, handler.contextMenuPoint.y);
        handler.app.redrawGraph();
    });

    $("#Context_Back_Color").click(function () {
        var setupBackgroundStyle = new SetupBackgroundStyle(handler.app);
        setupBackgroundStyle.show();
    });

    $("body").on("contextmenu", "canvas", function (e) {
        handler.contextMenuPoint = { x: e.offsetX, y: e.offsetY };
        handler.contextMenuObject = handler.GetSelectedObject(handler.contextMenuPoint);
        if (handler.contextMenuObject instanceof BaseVertex) {
            $("#edgeContextMenu").hide();
            $("#backgroundContextMenu").hide();
            $("#vertexContextMenu").show();
            if (handler.GetSelectedVertex() == null) {
                $("#Context_Connect").hide();
            } else {
                $("#Context_Connect").show();
            }
        } else if (handler.contextMenuObject instanceof BaseEdge) {
            $("#vertexContextMenu").hide();
            $("#backgroundContextMenu").hide();
            $("#edgeContextMenu").show();
        } else {
            $("#vertexContextMenu").hide();
            $("#edgeContextMenu").hide();
            $("#backgroundContextMenu").show();
        }

        $contextMenu.css({
            display: "block",
            left: e.offsetX,
            top: e.offsetY
        });
        return false;
    });

    $("body").click(function () {
        $contextMenu.hide();
    });
}

BaseHandler.prototype.removeContextMenu = function () {
    $("body").off("contextmenu");
    $("#Context_Delete").off("click");
    $("#Context_Rename").off("click");
    $("#Context_Connect").off("click");
    $("#Context_Delete_Edge").off("click");
    $("#Context_Edit_Edge").off("click");
    $("#Context_Add_Vertex").off("click");
    $("#Context_Back_Color").off("click");
}

BaseHandler.prototype.RenameVertex = function (text, object) {
    if (object != null && (object instanceof BaseVertex)) {
        // this.app.PushToStack("RenameVertex");
        object.mainText = text;
        this.app.redrawGraph();
    }
}

BaseHandler.prototype.ShowCreateEdgeDialog = function (firstVertex, secondVertex, addEdgeCallBack) {
    // this.app.PushToStack("Connect");
    addEdgeCallBack(firstVertex, secondVertex, true);
}

BaseHandler.prototype.ShowEditEdgeDialog = function (edgeObject) {
    var dialogButtons = {};

    var handler = this;

    dialogButtons[g_save] = function () {
        // handler.app.PushToStack("ChangeEdge");

        edgeObject.SetWeight(document.getElementById('EdgeWeight').value);
        edgeObject.SetUpText(document.getElementById('EdgeLable').value);

        handler.needRedraw = true;
        handler.app.redrawGraph();

        userAction("ChangeWeight");
        $(this).dialog("close");
    };

    document.getElementById('EdgeWeight').value = edgeObject.useWeight ? edgeObject.weight : g_noWeight;
    document.getElementById('EdgeWeightSlider').value = edgeObject.useWeight ? edgeObject.weight : 0;

    var edgePresets = handler.app.GetEdgePresets();
    var presetsStr = "<span onClick=\"document.getElementById('EdgeWeight').value='" + g_DefaultWeightPreset + "'; document.getElementById('EdgeWeightSlider').value='" +
        g_DefaultWeightPreset + "';\" style=\"cursor: pointer\" class=\"defaultWeigth\">" + g_DefaultWeightPreset + "</span>";

    for (var i = 0; i < edgePresets.length; i++) {
        var edgePreset = edgePresets[i];
        presetsStr += "<span onClick=\"document.getElementById('EdgeWeight').value='" + edgePreset + "'; document.getElementById('EdgeWeightSlider').value=" +
            edgePreset + ";\" style=\"cursor: pointer\" class=\"defaultWeigth\">" + edgePreset + "</span>";
    }
    document.getElementById("EdgesPresets").innerHTML = presetsStr;
    document.getElementById('EdgeLable').value = edgeObject.upText;

    $("#addEdge").dialog({
        resizable: false,
        height: "auto",
        width: "auto",
        modal: true,
        title: g_editWeight,
        buttons: dialogButtons,
        dialogClass: 'EdgeDialog',
        open: function () {
            $(handler).off('submit').on('submit', function () {
                return false;
            });
        }
    });
}
