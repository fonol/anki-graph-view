import sys
import os
from typing import List
import aqt
from aqt import mw, gui_hooks

sys.path.insert(0, os.path.dirname(__file__))

from .window import MainDialog

def addon_id() -> str:
    dir = os.path.dirname(os.path.realpath(__file__)).replace("\\", "/")
    if dir.endswith("/"):
        dir = dir[:-1]
    return dir[dir.rfind("/")+1:]

def init_addon():
    gui_hooks.top_toolbar_did_init_links.append(on_toolbar_init)
    mw.addonManager.setWebExports(addon_id(), ".*\\.(js|css|map|png|jpe?g|gif|svg|ttf|woff2?)$")
    
def on_toolbar_init(links: List[str], top_toolbar: aqt.toolbar.Toolbar):
    lnk = top_toolbar.create_link("","Graph", open_main_window)
    links.append(lnk)

def open_main_window():
    dialog = MainDialog(aqt.mw.app.activeWindow())
    dialog.show()

init_addon()