"""Alat bantu penarik data seri #30Hari30Website. Hanya pustaka standar Python, jadi GitHub Actions tidak perlu instal apa pun."""

import gzip
import http.client
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zlib
from datetime import datetime, timedelta, timezone

WIB = timezone(timedelta(hours=7))
AGENT = os.environ.get("FETCH_AGENT", "30Hari30Website/1.0 (+https://github.com/Ghozi-Abdullah)")


class FetchError(Exception):
    """Gagal mengambil satu URL setelah semua percobaan."""


def log(*parts):
    print(datetime.now(WIB).strftime("%H.%M.%S"), *parts, file=sys.stderr, flush=True)


def now_wib():
    return datetime.now(WIB)


def iso_now():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _decode(raw, encoding):
    if encoding == "gzip":
        return gzip.decompress(raw)
    if encoding == "deflate":
        try:
            return zlib.decompress(raw)
        except zlib.error:
            return zlib.decompress(raw, -zlib.MAX_WBITS)
    return raw


def http_get(url, params=None, headers=None, timeout=30, retries=3, data=None, method=None):
    """Bytes isi URL. Mencoba ulang saat koneksi gagal, 429, atau 5xx; 4xx lain langsung gagal."""
    if params:
        url += ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
    head = {"User-Agent": AGENT, "Accept": "*/*", "Accept-Encoding": "gzip, deflate", "Accept-Language": "id-ID,id;q=0.9,en;q=0.8"}
    head.update(headers or {})
    if isinstance(data, (dict, list)):
        data = json.dumps(data).encode()
        head.setdefault("Content-Type", "application/json")
    last = None
    for attempt in range(retries):
        req = urllib.request.Request(url, data=data, headers=head, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as res:
                return _decode(res.read(), res.headers.get("Content-Encoding", ""))
        except urllib.error.HTTPError as e:
            last = f"HTTP {e.code}"
            if e.code not in (408, 425, 429, 500, 502, 503, 504):
                break
            wait = e.headers.get("Retry-After") if e.headers else None
            time.sleep(min(int(wait), 30) if wait and wait.isdigit() else 2 * (attempt + 1))
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError, http.client.HTTPException) as e:
            # HTTPException mencakup IncompleteRead: server memutus kiriman di tengah jalan, jadi coba lagi.
            last = f"{type(e).__name__}: {getattr(e, 'reason', e)}"[:200]
            time.sleep(3 * (attempt + 1))
    raise FetchError(f"{url.split('?')[0]}: {last}")


def get_text(url, **kw):
    raw = http_get(url, **kw)
    for enc in ("utf-8", "cp1252", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", "replace")


def get_json(url, **kw):
    kw.setdefault("headers", {}).setdefault("Accept", "application/json")
    raw = http_get(url, **kw)
    try:
        return json.loads(raw.decode("utf-8-sig"))
    except ValueError as e:
        raise FetchError(f"{url.split('?')[0]}: bukan JSON ({e})") from e


def read_json(path, default=None):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def write_json(path, obj, pretty=False):
    """Tulis JSON secara atomik supaya halaman tidak pernah membaca file setengah jadi."""
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    tmp = f"{path}.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        if pretty:
            json.dump(obj, f, ensure_ascii=False, indent=1)
        else:
            json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
        f.write("\n")
    os.replace(tmp, path)


def to_float(v, decimal=None):
    """Angka dari teks Indonesia/Inggris: "1.234,5", "1,234.5", "12,3%", "-". None bila kosong.
    decimal="." untuk sumber berformat Inggris (koma = ribuan), decimal="," untuk format Indonesia (titik = ribuan)."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return float(v)
    s = str(v).strip().replace(" ", "").replace(" ", "").replace("%", "").replace("Rp", "")
    if s in ("", "-", "–", "—", "null", "None", "NA", "N/A", "..."):
        return None
    neg = s.startswith("(") and s.endswith(")")
    s = s.strip("()")
    if decimal == ".":
        s = s.replace(",", "")
    elif decimal == ",":
        s = s.replace(".", "").replace(",", ".")
    elif "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".") if s.rfind(",") > s.rfind(".") else s.replace(",", "")
    elif "," in s:
        # Satu koma = desimal gaya Indonesia; beberapa koma = pemisah ribuan gaya Inggris.
        s = s.replace(",", ".") if s.count(",") == 1 else s.replace(",", "")
    elif s.count(".") > 1:
        s = s.replace(".", "")
    try:
        x = float(s)
    except ValueError:
        return None
    return -x if neg else x


class Status:
    """Mencatat hasil tiap sumber ke data/status.json supaya halaman bisa jujur saat satu sumber gagal."""

    def __init__(self, path="data/status.json"):
        self.path = path
        self.prev = read_json(path, {}) or {}
        self.sources = dict(self.prev.get("sources", {}))

    def ok(self, key, note="", count=None):
        self.sources[key] = {"ok": True, "at": iso_now(), "note": note, "count": count}
        log("OK", key, note)

    def fail(self, key, err):
        prev = self.sources.get(key, {})
        self.sources[key] = {"ok": False, "at": iso_now(), "error": str(err)[:300], "last_ok": prev.get("at") if prev.get("ok") else prev.get("last_ok")}
        log("GAGAL", key, err)

    def save(self):
        write_json(self.path, {"updated": iso_now(), "sources": self.sources}, pretty=True)

    @property
    def any_ok(self):
        return any(s.get("ok") for s in self.sources.values())


# ---------------------------------------------------------------- provinsi

PROVINSI = {
    "11": "Aceh", "12": "Sumatera Utara", "13": "Sumatera Barat", "14": "Riau", "15": "Jambi", "16": "Sumatera Selatan",
    "17": "Bengkulu", "18": "Lampung", "19": "Kepulauan Bangka Belitung", "21": "Kepulauan Riau", "31": "DKI Jakarta",
    "32": "Jawa Barat", "33": "Jawa Tengah", "34": "DI Yogyakarta", "35": "Jawa Timur", "36": "Banten", "51": "Bali",
    "52": "Nusa Tenggara Barat", "53": "Nusa Tenggara Timur", "61": "Kalimantan Barat", "62": "Kalimantan Tengah",
    "63": "Kalimantan Selatan", "64": "Kalimantan Timur", "65": "Kalimantan Utara", "71": "Sulawesi Utara",
    "72": "Sulawesi Tengah", "73": "Sulawesi Selatan", "74": "Sulawesi Tenggara", "75": "Gorontalo", "76": "Sulawesi Barat",
    "81": "Maluku", "82": "Maluku Utara", "91": "Papua Barat", "92": "Papua Barat Daya", "94": "Papua", "95": "Papua Selatan",
    "96": "Papua Tengah", "97": "Papua Pegunungan",
}
_ALIAS = {
    "nanggroe aceh darussalam": "11", "nad": "11", "di aceh": "11", "north sumatera": "12", "north sumatra": "12",
    "west sumatera": "13", "west sumatra": "13", "riau islands": "21", "kep riau": "21", "south sumatera": "16",
    "south sumatra": "16", "bangka belitung": "19", "bangka belitung islands": "19", "kep bangka belitung": "19",
    "jakarta": "31", "dki": "31", "dki jakarta raya": "31", "daerah khusus ibukota jakarta": "31", "daerah khusus jakarta": "31",
    "west java": "32", "central java": "33", "east java": "35", "yogyakarta": "34", "di yogyakarta": "34",
    "daerah istimewa yogyakarta": "34", "diy": "34", "special region of yogyakarta": "34", "west nusa tenggara": "52",
    "east nusa tenggara": "53", "west kalimantan": "61", "central kalimantan": "62", "south kalimantan": "63",
    "east kalimantan": "64", "north kalimantan": "65", "north sulawesi": "71", "central sulawesi": "72",
    "south sulawesi": "73", "southeast sulawesi": "74", "south east sulawesi": "74", "west sulawesi": "76",
    "north maluku": "82", "west papua": "91", "irian jaya barat": "91", "southwest papua": "92", "south west papua": "92",
    "central papua": "96", "highland papua": "97", "papua highlands": "97", "south papua": "95", "irian jaya": "94",
    "ntb": "52", "ntt": "53", "kaltim": "64", "kalbar": "61", "kalsel": "63", "kalteng": "62", "kaltara": "65",
    "sumut": "12", "sumbar": "13", "sumsel": "16", "jabar": "32", "jateng": "33", "jatim": "35", "sulut": "71",
    "sulteng": "72", "sulsel": "73", "sultra": "74", "sulbar": "76", "malut": "82", "babel": "19", "kepri": "21",
}


def _norm_prov(s):
    s = str(s or "").lower()
    s = re.sub(r"\(.*?\)", " ", s)
    s = re.sub(r"^\s*\d+[.)]?\s*", "", s)
    s = re.sub(r"\bprov(insi|\.)?\b", " ", s)
    s = re.sub(r"\bkep(ulauan|\.)?\b", "kep", s)
    s = re.sub(r"\bd\.?\s?i\.?\s", "di ", s)
    s = re.sub(r"[^a-z ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


_BY_NORM = {_norm_prov(v): k for k, v in PROVINSI.items()}


def kode_provinsi(name):
    """Kode BPS dua digit dari nama provinsi (Indonesia/Inggris/singkatan). None bila bukan provinsi."""
    raw = str(name or "").strip()
    if raw in PROVINSI:
        return raw
    n = _norm_prov(raw)
    return _BY_NORM.get(n) or _ALIAS.get(n) or _BY_NORM.get(n.replace("kep ", "kepulauan ", 1))
