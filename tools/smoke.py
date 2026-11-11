import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
q = sys.argv[1] if len(sys.argv) > 1 else "?debug=24&nointro"
out = sys.argv[2] if len(sys.argv) > 2 else "tmp/smoke.png"
Path(out).parent.mkdir(parents=True, exist_ok=True)
wait = int(sys.argv[3]) if len(sys.argv) > 3 else 6000
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width":1366,"height":768})
    errs=[]; pg.on("pageerror", lambda e: errs.append("PAGE: "+str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type=="error" else None)
    pg.route("https://**/*", lambda r: r.fulfill(body="", content_type="text/javascript"))
    pg.goto("http://localhost:"+__import__("os").environ.get("BT_PORT","4173")+"/"+q)
    try:
        pg.wait_for_function("document.getElementById('loading').classList.contains('done')", timeout=60000)
    except Exception as e: print("no load", e)
    pg.wait_for_timeout(wait)
    pg.screenshot(path=out)
    print("errors:", errs[:6])
    try: print(pg.evaluate("JSON.stringify(bt.state())")[:300])
    except Exception as e: print(e)
    b.close()
