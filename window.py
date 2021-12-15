from aqt.qt import *
from aqt import mw
import aqt
import json
import os
import typing
from aqt.webview import AnkiWebView

from .db import *

def addon_id() -> str:
    dir = os.path.dirname(os.path.realpath(__file__)).replace("\\", "/")
    if dir.endswith("/"):
        dir = dir[:-1]
    return dir[dir.rfind("/")+1:]

base_url         = f"http://127.0.0.1:{mw.mediaServer.getPort()}/_addons/{addon_id()}/"


class MainDialog(QDialog):

    def __init__(self, parent):

        QDialog.__init__(self, parent, Qt.WindowMaximizeButtonHint|Qt.WindowMinimizeButtonHint|Qt.WindowCloseButtonHint)
        self.mw                     = aqt.mw
        self.parent                 = parent
        self.setModal(False)
        self.setup_ui()
        self.setup_bridge()
        self.setWindowTitle("Graph View")

    def setup_ui(self):
        
        self.web        = AnkiWebView()
        layout          = QVBoxLayout()
        # config          = mw.addonManager.getConfig(__name__)

        layout.addWidget(self.web)
        layout.setContentsMargins(0,0,0,0)

        self.setLayout(layout)
        self.resize(1400, 1200)
        self.showMaximized()
        self.set_initial_html()

    def setup_bridge(self):

        self.web._onBridgeCmd       = self.on_bridge
        self.web._page._onBridgeCmd = self.on_bridge

    def js(self, js: str):

        if js is not None and len(js.strip()) > 0:
            self.web.page().runJavaScript(js)

    def set_initial_html(self):

        retentions  = get_retentions()
        config      = mw.addonManager.getConfig(__name__)

        self.web.setHtml(f"""
            {mw.baseHTML()}
            <head>
                <link rel='stylesheet' type='text/css' href='{base_url}public/build/bundle.css' />
                <style>body {{ color: lightgrey; font-family: 'Open Sans' }}</style>
                {self.web.bundledScript("webview.js")}
                <link rel='stylesheet' type='text/css' href='{base_url}public/lib/open-sans.css' />
                <script src='qrc:///qtwebchannel/qwebchannel.js'></script>
                <script src='{base_url}public/lib/cytoscape.min.js'></script>
                <script src="{base_url}public/lib/layout-base.js"></script>
                <script src="{base_url}public/lib/cose-base.js"></script>
                <script src="{base_url}public/lib/cytoscape-fcose.js"></script>
                <script src='{base_url}public/lib/vivagraph.js'></script>
                <script type='text/javascript'>
                    window.retentions = {json.dumps(retentions)};
                    window.settings = {{
                        showRetentions: {str(config["showRetentions"]).lower()},
                        tagBoundary: {config["tagBoundary"]},
                        iterations: {config["iterations"]},
                        defaultNodeColor: '{config["colors.node"]}',
                        edgeColor: '{config["colors.edge"]}',
                        backgroundColor: '{config["colors.background"]}',
                        showUnlinkedNodes: {str(config["showUnlinkedNodes"]).lower()},
                        mode: '{config["mode"].lower()}',
                        graphMode: '{config["graphMode"].lower()}',
                        excludeTags: {json.dumps(config["settings.excludeTags"])},
                        scoringIncludeTopXPercent: {json.dumps(config["scoring.includeTopXPercent"])}
                    }};
                </script>
            </head>  
            <body>
                <div id='svelte-wrapper' style='height: 100%;'></div>
                <script type="text/javascript" src="{base_url}public/build/bundle.js"></script>
            </body>
        """)

    def on_bridge(self, cmd: str):

        config = mw.addonManager.getConfig(__name__)

        if cmd == "domDone":

            notes = get_all_notes_with_tags()
            self.js(f"window.notes = {json.dumps(notes)};")
            self.web._domDone = True
            self.web._maybeRunActions()

        elif cmd == "config-show-retentions":

            config["showRetentions"] = True
            mw.addonManager.writeConfig(__name__, config)

        elif cmd == "config-hide-retentions":

            config["showRetentions"] = False
            mw.addonManager.writeConfig(__name__, config)
        
        elif cmd.startswith("config-mode "):

            config["mode"] = cmd.split(" ")[1]
            mw.addonManager.writeConfig(__name__, config)

        elif cmd.startswith("config-graph-mode "):

            config["graphMode"] = cmd.split(" ")[1]
            mw.addonManager.writeConfig(__name__, config)

        elif cmd.startswith("config-tag-boundary "):

            config["tagBoundary"] = int(cmd.split(" ")[1])
            mw.addonManager.writeConfig(__name__, config)

        elif cmd.startswith("config-iterations "):

            config["iterations"] = int(cmd.split(" ")[1])
            mw.addonManager.writeConfig(__name__, config)

        elif cmd.startswith("config-default-node-color "):

            config["colors.node"] = cmd.split(" ")[1]
            mw.addonManager.writeConfig(__name__, config)

        elif cmd.startswith("config-edge-color "):

            config["colors.edge"] = cmd.split(" ")[1]
            mw.addonManager.writeConfig(__name__, config)

        elif cmd.startswith("config-background-color "):

            config["colors.background"] = cmd.split(" ")[1]
            mw.addonManager.writeConfig(__name__, config)

        elif cmd.startswith("config-show-unlinked "):

            config["showUnlinkedNodes"] = cmd.split(" ")[1].lower() == "true"
            mw.addonManager.writeConfig(__name__, config)

        elif cmd.startswith("open-in-browser "):

            browser = aqt.dialogs.open("Browser", mw)
            browser.form.searchEdit.lineEdit().setText(f"nid:{cmd.split()[1]}")
            browser.onSearchActivated()

        elif cmd.startswith("fetch "):

            key = cmd.split(" ")[1]
            res = " ".join(cmd.split(" ")[2:])
            r   = self.handle_fetch(res)

            self.js(f"window._fetchWaiting['{key}']({json.dumps(r)}); delete window._fetchWaiting['{key}'];")

        else:
            print("[Graph] Warning, unhandled cmd: " + cmd)

    def handle_fetch(self, res: str):

        if res is None:
            raise ValueError("resource must not be empty")

        if res.startswith("search "):
            search_query = " ".join(res.split(" ")[1:])
            return list(mw.col.find_notes(search_query))

        return None


  
            


