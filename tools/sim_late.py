import sys, time, json
from playwright.sync_api import sync_playwright
q = sys.argv[1]; secs = float(sys.argv[2]); bot = sys.argv[3] == '1'
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width":640,"height":400})
    errs=[]; pg.on("pageerror", lambda e: errs.append("PAGE: "+str(e)))
    pg.route("https://**/*", lambda r: r.fulfill(body="", content_type="text/javascript"))
    pg.goto("http://localhost:"+__import__("os").environ.get("BT_PORT","4173")+f"/{q}")
    pg.wait_for_function("document.getElementById('loading').classList.contains('done')", timeout=60000)
    if bot: pg.add_script_tag(path=__import__("os").path.join(__import__("os").path.dirname(__file__), "bot.js"))
    else: pg.evaluate("setInterval(() => { const b = document.querySelector('.modal:not(.hidden) .pbtn.green, .modal:not(.hidden) .pbtn.grey'); if (b) b.click(); }, 500)")
    t0 = time.time()
    while time.time() - t0 < secs:
        time.sleep(25)
        print(pg.evaluate("JSON.stringify({t: +bt.game().time.toFixed(0), m: bt.money(), task: window.botTask && window.botTask(), s: bt.game().stats, tb: bt.game().tables.map(t=>t.state), mi: bt.game().machines.map(m=>m.kind+':'+m.tray.count+'/'+(m.input?m.inStack.count:'-')), h: bt.game().helpers.map(h=>h.role+':'+h.phase+':'+(h.want||'')+':'+h.ch.carry.count)})"), flush=True)
    print("LOG", json.dumps(pg.evaluate("window.botlog || []"))[:600])
    print("ERR", errs[:5])
    b.close()
