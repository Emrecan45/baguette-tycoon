import sys, time, json
from playwright.sync_api import sync_playwright
ts = sys.argv[1] if len(sys.argv) > 1 else "6"
mins = float(sys.argv[2]) if len(sys.argv) > 2 else 5
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width":640,"height":400})
    errs=[]; pg.on("pageerror", lambda e: errs.append("PAGE: "+str(e)))
    pg.route("https://**/*", lambda r: r.fulfill(body="", content_type="text/javascript"))
    pg.goto("http://localhost:"+__import__("os").environ.get("BT_PORT","4173")+f"/?nointro&norender&ts={ts}&q=4")
    pg.wait_for_function("document.getElementById('loading').classList.contains('done')", timeout=60000)
    pg.evaluate("localStorage.clear()")
    pg.add_script_tag(path=__import__("os").path.join(__import__("os").path.dirname(__file__), "bot.js"))
    t0 = time.time(); last = 0
    while time.time() - t0 < mins * 60:
        time.sleep(30)
        st = pg.evaluate("JSON.stringify({t: +bt.game().time.toFixed(0), u: bt.game().unlockIndex, m: bt.money(), task: window.botTask(), s: bt.game().stats, g: bt.game().guests})")
        print(st, flush=True)
    print("LOG", json.dumps(pg.evaluate("window.botlog")))
    print("ERR", errs[:5])
    b.close()
