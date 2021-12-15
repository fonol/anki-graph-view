from typing import Tuple, List, Dict, Any
from aqt import mw
import time


def tags(tag_str: str) -> List[str]:
    """
    Split up the tag string from Anki's db, get back a list of tags.
    """

    if tag_str is None or len(tag_str.strip()) == 0:
        return []
    return [t for t in tag_str.split(" ") if len(t.strip()) > 0]

def fields(field_str: str) -> List[str]:
    """
    Split up the field string from Anki's db, get back a list of non-empty fields.
    """

    if field_str is None or len(field_str.strip()) == 0:
        return []
    return [f for f in field_str.split("\x1f")]

def label(field_str: str, sfld: Any) -> str:
    # sfld can be string or index?

    flds = fields(field_str)

    if isinstance(sfld, str):
        return sfld

    if len(flds) == 0:
        return ""

    if sfld < 0 or sfld > len(flds) - 1:
        return flds[0]

    return flds[sfld]

def get_all_notes_with_tags() -> List[Tuple[Any,...]]:
    """
    Fetch all notes from Anki's db.
    """

    notes       = mw.col.db.all("select id, tags, flds, sfld from notes")
    dids_nids   = mw.col.db.all("select distinct nid, did from cards")
    nid_did_dct = {}
    for nid, did in dids_nids:
        if not nid in nid_did_dct:
            nid_did_dct[nid] = []
        nid_did_dct[nid].append(did)

    return [(r[0], tags(r[1]), fields(r[2]), label(r[2], r[3]), nid_did_dct.get(r[0], [])) for r in notes]



def get_retentions() -> Dict[int, float]:

    start           = time.time() * 1000
    revs            = mw.col.db.all("select cid, ease from revlog where type = 1")
    nid_cid         = mw.col.db.all("select id, nid from cards")
    nid_cid_dict    = {}

    for cid, nid in nid_cid:
        nid_cid_dict[cid] = nid

    rpassed         = {}
    rfailed         = {}
    nids            = set()

    for cid, ease in revs:
        if cid not in nid_cid_dict:
            continue
        nid = nid_cid_dict[cid]
        if nid not in nids:
            nids.add(nid)
        if ease == 1:
            if nid not in rfailed:
                rfailed[nid] = 0
            rfailed[nid] = rfailed[nid] + 1
        else:
            if nid not in rpassed:
                rpassed[nid] = 0
            rpassed[nid] = rpassed[nid] + 1
    res = {}
    for nid in nids:
        if nid in rpassed and nid in rfailed:
            res[nid] = round(rpassed[nid] / (rfailed[nid] + rpassed[nid]), 2)
        elif nid in rpassed:
            res[nid] = 1.0
        elif nid in rfailed:
            res[nid] = 0.0

    end = time.time() * 1000
    print(f"[Graph] Collecting retentions took {end-start} ms.")
    return res





